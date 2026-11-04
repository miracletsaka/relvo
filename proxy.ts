import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "nf_session";
const ORG_COOKIE_NAME = "nf_org";
const ONBOARDING_COOKIE_NAME = "nf_onboarding";

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

// Server-side code needs an ABSOLUTE backend URL.
// In production NEXT_PUBLIC_API_BASE is the relative proxy path "/backend",
// which cannot be fetched from the server, so we fall back to BACKEND_URL / the Render URL.
// Locally NEXT_PUBLIC_API_BASE is usually http://localhost:8000 and is used as is.
const PUBLIC_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const API_BASE = (
  process.env.BACKEND_URL ||
  (PUBLIC_BASE.startsWith("http") ? PUBLIC_BASE : "") ||
  "https://relvo-backend-iker.onrender.com"
).replace(/\/$/, "");

type SessionState = "valid" | "invalid" | "unreachable";

function clearAuthCookies(res: NextResponse) {
  res.cookies.delete(COOKIE_NAME);
  res.cookies.delete(ORG_COOKIE_NAME);
  res.cookies.delete(ONBOARDING_COOKIE_NAME);
  return res;
}

// valid       -> backend confirmed the session
// invalid     -> backend said 401/403: really logged out
// unreachable -> backend asleep / slow / error: we cannot tell, so do NOT log the user out
async function checkSession(req: NextRequest): Promise<SessionState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${API_BASE}/auth/validate-session`, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (res.ok) return "valid";
    if (res.status === 401 || res.status === 403) return "invalid";
    return "unreachable";
  } catch {
    return "unreachable";
  } finally {
    clearTimeout(timer);
  }
}

function redirectToLogin(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/auth/login";
  url.searchParams.set("next", pathname);

  const res = NextResponse.redirect(url);
  return clearAuthCookies(res);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const session = req.cookies.get(COOKIE_NAME)?.value;
  const orgId = req.cookies.get(ORG_COOKIE_NAME)?.value;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith("/onboarding");

  let state: SessionState = "invalid";

  if (session) {
    state = await checkSession(req);
  }

  // Page access: if the backend is unreachable, keep the user in (the cookie exists).
  // The page shell holds no data, and every API call is still protected by the backend.
  const validSession = state === "valid" || state === "unreachable";

  // Only redirect away from login pages when the backend actually confirmed the session.
  const confirmedSession = state === "valid";

  console.log(
    `proxy pathname=${pathname} session=${session ? "yes" : "no"} state=${state} org=${
      orgId ? "yes" : "no"
    } api=${API_BASE}`
  );

  // 1) Protect dashboard.
  if (isDashboard && !validSession) {
    return redirectToLogin(req, pathname);
  }

  // 2) Protect onboarding.
  if (isOnboarding && !validSession) {
    return redirectToLogin(req, pathname);
  }

  // 3) Logged-in users should not stay on auth pages.
  // Do NOT use nf_onboarding here. It is global and breaks multi-org.
  if (isAuthPage && confirmedSession) {
    const url = req.nextUrl.clone();

    if (!orgId) {
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 4) Dashboard requires an active org cookie.
  // Completion is checked in app/dashboard/layout.tsx using DB current-org status.
  if (isDashboard && validSession && !orgId) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // 5) Never redirect onboarding away here.
  // Onboarding page decides whether current org is complete.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/onboarding/:path*"],
};