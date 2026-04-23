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

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const session = req.cookies.get(COOKIE_NAME)?.value;
  const orgId = req.cookies.get(ORG_COOKIE_NAME)?.value;
  const onboarding = req.cookies.get(ONBOARDING_COOKIE_NAME)?.value;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith("/onboarding");

  console.log(
    `proxy pathname=${pathname} session=${session ? "yes" : "no"} org=${orgId ? "yes" : "no"} onboarding=${onboarding || "none"}`
  );

  // ── 1) Protect dashboard/internal app: must be logged in ───────────────────
  if (isDashboard && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── 2) Protect auth pages: logged-in users should not stay there ───────────
  if (isAuthPage && session) {
    const url = req.nextUrl.clone();

    // If logged in but onboarding not complete, force onboarding.
    if (onboarding !== "complete") {
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    url.pathname = "/dashboard/create";
    return NextResponse.redirect(url);
  }

  // ── 3) Protect dashboard: onboarding must be complete ──────────────────────
  if (isDashboard && session) {
    // no org yet -> onboarding start
    if (!orgId) {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // org exists but onboarding incomplete -> onboarding
    if (onboarding !== "complete") {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";

      // Optional hint so UI can know user is resuming branding
      if (onboarding === "branding") {
        url.searchParams.set("resume", "branding");
      }

      return NextResponse.redirect(url);
    }
  }

  // ── 4) Protect onboarding: must be logged in ───────────────────────────────
  if (isOnboarding && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── 5) Skip onboarding if already complete ─────────────────────────────────
  if (isOnboarding && session && onboarding === "complete") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/create";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/onboarding/:path*"],
};