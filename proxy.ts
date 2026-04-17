import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "nf_session";

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const session = req.cookies.get(COOKIE_NAME)?.value;


  const isDashboard  = pathname.startsWith("/dashboard");
  const isAuthPage   = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith("/onboarding");

  console.log(`isDashboard: ${isDashboard}, isAuthPage: ${isAuthPage}, isOnboarding: ${isOnboarding}, session: ${session ? "yes" : "no"}`);

  // ── 1) Protect dashboard: must be logged in ────────────────────────────────
  // (unchanged from your original)
  if (isDashboard && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── 2) Protect auth pages: must be logged OUT ──────────────────────────────
  // (unchanged from your original)
  if (isAuthPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/create";
    return NextResponse.redirect(url);
  }

  // ── 3) NEW: Org check for dashboard ───────────────────────────────────────
  // Logged in but no org yet → send to /onboarding.
  // We read a lightweight "nf_org" cookie set by FastAPI at login/org-create.
  // No API call needed in the proxy — just a cookie read (instant).
  if (isDashboard && session) {
    const orgId = req.cookies.get("nf_org")?.value;
    if (!orgId) {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  // ── 4) NEW: Already has org → skip /onboarding ────────────────────────────
  if (isOnboarding && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/onboarding/:path*"],
};