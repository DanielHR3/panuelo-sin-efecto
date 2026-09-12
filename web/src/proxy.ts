import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Protege /admin y la PWA del árbitro (/mis-partidos y /partido/**): sin
 * cookie de sesión, redirige a /login. La raíz (/), /categoria/** y
 * /jugador/** son públicas (HU-3.4 / HU-3.1). La autorización real (roles,
 * propiedad de recursos, estar asignado al partido) la sigue haciendo el
 * backend en cada request — esto es solo UX, no el límite de seguridad.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/mis-partidos", "/admin/:path*", "/partido/:path*"],
};
