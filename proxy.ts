import { NextResponse, type NextRequest } from "next/server";

import { isGateEnabled, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { publicSlugs } from "@/lib/registry.generated";

/**
 * Site-wide password gate (Next 16 "proxy", formerly middleware).
 * Off in development. Always lets through: the login page and route, the
 * public /p/<slug> pages (they 404 on their own for private slugs), and the
 * API routes of public prototypes.
 */
export async function proxy(request: NextRequest) {
  if (!isGateEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;

  if (pathname === "/login" || pathname === "/api/auth") return NextResponse.next();
  if (pathname.startsWith("/p/")) return NextResponse.next();

  // og:image for public prototypes must be reachable by link-preview crawlers.
  const ogSlug = pathname.match(/^\/thumbnails\/(.+)-og\.jpg$/)?.[1];
  if (ogSlug && publicSlugs.includes(ogSlug)) return NextResponse.next();

  const apiSlug = pathname.match(/^\/api\/([^/]+)/)?.[1];
  if (apiSlug && publicSlugs.includes(apiSlug)) return NextResponse.next();

  if (await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's build assets, the favicon and /assets/*.
  // public/assets/ is never gated: public prototypes need their static files
  // there. Don't put anything private in public/assets/.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
