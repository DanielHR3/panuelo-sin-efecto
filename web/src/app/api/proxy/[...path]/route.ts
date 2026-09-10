import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getSessionToken } from "@/lib/server-api";

/**
 * Proxy autenticado hacia el backend, pensado para Client Components que
 * necesitan hacer escrituras (p. ej. la PWA del árbitro registrando eventos)
 * sin que el JWT toque JavaScript del navegador. Lee el token de la cookie
 * httpOnly en el servidor y lo reenvía como Bearer.
 *
 * Ejemplo: el cliente hace fetch("/api/proxy/partidos/123/eventos", {method:"POST", ...})
 * y esta ruta reenvía a `${API_URL}/partidos/123/eventos` con Authorization.
 */
async function forward(request: NextRequest, path: string[]): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "No hay sesión activa" }, { status: 401 });
  }

  const url = `${API_URL}/${path.join("/")}${request.nextUrl.search}`;
  const hasBody = !["GET", "HEAD", "DELETE"].includes(request.method);

  const backendRes = await fetch(url, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: hasBody ? await request.text() : undefined,
  });

  const text = await backendRes.text();
  return new NextResponse(text, {
    status: backendRes.status,
    headers: {
      "Content-Type": backendRes.headers.get("Content-Type") ?? "application/json",
    },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(request, path);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
