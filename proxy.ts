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

  const isDashboard = pathname.startsWith("/dashboard/create");
  const isAuthPage = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  // 1) Protect dashboard: must be logged in
  if (isDashboard && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 2) Protect auth pages: must be logged OUT
  if (isAuthPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/create";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
