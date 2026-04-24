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

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

function clearAuthCookies(res: NextResponse) {
  res.cookies.delete(COOKIE_NAME);
  res.cookies.delete(ORG_COOKIE_NAME);
  res.cookies.delete(ONBOARDING_COOKIE_NAME);
  return res;
}

async function isSessionValid(req: NextRequest): Promise<boolean> {
  if (!API_BASE) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/validate-session`, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    return res.ok;
  } catch {
    return false;
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
  const onboarding = req.cookies.get(ONBOARDING_COOKIE_NAME)?.value;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith("/onboarding");

  let validSession = false;

  if (session) {
    validSession = await isSessionValid(req);
  }

  console.log(
    `proxy pathname=${pathname} session=${session ? "yes" : "no"} valid=${validSession ? "yes" : "no"} org=${orgId ? "yes" : "no"} onboarding=${onboarding || "none"}`
  );

  // ── 1) Protect dashboard/internal app ─────────────────────
  if (isDashboard && !validSession) {
    return redirectToLogin(req, pathname);
  }

  // ── 2) Protect onboarding ─────────────────────────────────
  if (isOnboarding && !validSession) {
    return redirectToLogin(req, pathname);
  }

  // ── 3) Logged-in users should not stay on auth pages ───────
  if (isAuthPage && validSession) {
    const url = req.nextUrl.clone();

    if (!orgId || onboarding !== "complete") {
      url.pathname = "/onboarding";

      if (onboarding === "branding") {
        url.searchParams.set("resume", "branding");
      }

      return NextResponse.redirect(url);
    }

    url.pathname = "/dashboard/create";
    return NextResponse.redirect(url);
  }

  // ── 4) Dashboard requires org + completed onboarding ───────
  if (isDashboard && validSession) {
    if (!orgId) {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (onboarding !== "complete") {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";

      if (onboarding === "branding") {
        url.searchParams.set("resume", "branding");
      }

      return NextResponse.redirect(url);
    }
  }

  // ── 5) Skip onboarding if already complete ─────────────────
  if (isOnboarding && validSession && onboarding === "complete") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/create";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/onboarding/:path*"],
};