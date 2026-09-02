import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "insightful.auth";
const ROLE_COOKIE = "insightful.role";

// Mirrors lib/permissions.ts's ROLE_SLUG_PATTERN (and the server-side
// constraint on the `roles` table) — admins can define custom roles at
// runtime, so the URL prefix isn't limited to admin/manager/analyst.
const ROLE_SLUG = /^[a-z][a-z0-9_-]{1,31}$/;

function signedIn(request: NextRequest): boolean {
  return request.cookies.has(AUTH_COOKIE);
}

function roleFrom(request: NextRequest): string | null {
  const value = request.cookies.get(ROLE_COOKIE)?.value;
  return value && ROLE_SLUG.test(value) ? value : null;
}

function loginRedirect(request: NextRequest): NextResponse {
  const next = encodeURIComponent(request.nextUrl.pathname);
  return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  // Legacy/bare /dashboard links (old bookmarks, anything that hasn't been
  // updated to a role-prefixed href yet): send signed-in users to their own
  // /<role>/dashboard, everyone else to login.
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!signedIn(request)) return loginRedirect(request);
    const role = roleFrom(request) ?? "analyst";
    const rest = pathname.slice("/dashboard".length); // "" or "/xyz"
    return NextResponse.redirect(new URL(`/${role}/dashboard${rest}`, request.url));
  }

  // Role-prefixed dashboard routes: /<role>/dashboard/... . next.config.ts
  // rewrites these (invisibly, after this check) to the actual /dashboard/*
  // page files — this proxy only owns the auth/role gate, not the content.
  if (segments.length >= 2 && segments[1] === "dashboard" && ROLE_SLUG.test(segments[0])) {
    if (!signedIn(request)) return loginRedirect(request);
    const urlRole = segments[0];
    const actualRole = roleFrom(request);
    if (actualRole && actualRole !== urlRole) {
      // Wrong prefix for this account (stale link, typed URL, role changed
      // since the cookie was set). Real authorization is enforced by
      // RequireAccess client-side and the API server-side regardless — this
      // redirect is URL hygiene, not the security boundary.
      return NextResponse.redirect(new URL(`/${actualRole}/dashboard`, request.url));
    }
    return NextResponse.next();
  }

  // Signed-in users don't belong on auth pages.
  if (["/login", "/signup", "/register", "/forgot-password", "/register-business", "/verify-email"].includes(pathname)) {
    if (signedIn(request) && pathname !== "/verify-email") {
      const role = roleFrom(request) ?? "analyst";
      return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/:role/dashboard/:path*",
    "/login/:path*",
    "/signup/:path*",
    "/register/:path*",
    "/forgot-password/:path*",
    "/register-business/:path*",
    "/verify-email/:path*",
  ],
};
