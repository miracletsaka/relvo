// frontend/lib/http.ts
// One safe way to call the backend from anywhere in the app (browser OR server).
//
//  - Browser:  uses NEXT_PUBLIC_API_BASE ("/backend" via the Vercel proxy, or http://localhost:8000).
//  - Server:   needs an ABSOLUTE url, so it uses SERVER_API_BASE (a relative path would throw "Invalid URL").
//  - Turns timeouts, a sleeping Render server, HTML error pages and FastAPI validation errors
//    into clear messages instead of "Unexpected token <".
//  - Retries only when you say the request is safe to repeat (reads/searches). Never for actions
//    with side effects, such as placing phone calls.

import { SERVER_API_BASE } from "@/lib/backend-url";

export type ApiErrorKind = "network" | "timeout" | "unauthorized" | "server" | "client" | "parse";

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;

  constructor(message: string, kind: ApiErrorKind, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

export function apiBase(): string {
  if (typeof window === "undefined") return SERVER_API_BASE;
  const pub = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
  return pub || "/backend";
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Only for requests that are safe to repeat (reads, searches). NEVER for actions like placing calls. */
  retry?: boolean;
  timeoutMs?: number;
};

const RETRY_STATUSES = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// FastAPI errors: {"detail": "text"} or {"detail": [{loc, msg}, ...]}
function formatDetail(json: any): string {
  if (!json) return "";
  if (typeof json.detail === "string") return json.detail;
  if (Array.isArray(json.detail)) {
    return json.detail
      .map((e: any) => `${Array.isArray(e.loc) ? e.loc.join(" → ") : e.loc}: ${e.msg}`)
      .join("; ");
  }
  if (typeof json.message === "string") return json.message;
  if (typeof json.error === "string") return json.error;
  return "";
}

function httpError(status: number, text: string): ApiError {
  let detail = "";
  try {
    detail = formatDetail(JSON.parse(text));
  } catch {
    // not JSON (for example an HTML page from a sleeping server)
  }

  if (status === 401) {
    return new ApiError(detail || "Your session expired. Please sign in again.", "unauthorized", status);
  }
  if (status >= 500) {
    return new ApiError(
      detail || "The server is busy or restarting. Try again in a moment.",
      "server",
      status,
    );
  }
  return new ApiError(detail || `Request failed (${status})`, "client", status);
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const method = opts.method ?? (opts.body === undefined ? "GET" : "POST");
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const attempts = opts.retry ? 3 : 1;
  const repeatable = !!opts.retry;

  let last: ApiError | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(1500 * attempt);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        cache: "no-store",
        headers: {
          ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(opts.headers ?? {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();

      if (res.ok) {
        if (!text) return undefined as T;
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new ApiError("The server sent an unexpected reply. Please try again.", "parse", res.status);
        }
      }

      const err = httpError(res.status, text);
      if (repeatable && RETRY_STATUSES.has(res.status) && attempt < attempts - 1) {
        last = err;
        continue;
      }
      throw err;
    } catch (e) {
      if (e instanceof ApiError) throw e;

      const aborted = (e as any)?.name === "AbortError";
      last = aborted
        ? new ApiError(
            repeatable
              ? "The server took too long to answer. It may be waking up, so try again in a moment."
              : "The server took too long to answer, so we can't be sure the request went through. Check before trying again.",
            "timeout",
          )
        : new ApiError(
            repeatable
              ? "Can't reach the server. Check your connection and try again."
              : "Can't reach the server, so we can't be sure the request went through. Check before trying again.",
            "network",
          );

      if (attempt < attempts - 1) continue;
      throw last;
    } finally {
      clearTimeout(timer);
    }
  }

  throw last ?? new ApiError("Request failed", "network");
}
