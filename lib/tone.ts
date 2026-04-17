const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...((opts.headers as any) || {}) },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.message || `Error ${res.status}`);
  return json as T;
}