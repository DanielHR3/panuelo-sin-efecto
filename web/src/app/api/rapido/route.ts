import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getSessionToken } from "@/lib/server-api";
import { SESSION_COOKIE, secondsUntilExpiry } from "@/lib/session";

interface Body {
  equipoLocal?: string;
  equipoVisitante?: string;
  arbitro?: string;
}

/**
 * HU-2.7: partido rápido sin cuenta. Reenvía al backend y, si el
 * dispositivo ya tenía sesión (invitado o árbitro con cuenta), la manda
 * como Bearer para que el backend reutilice ese usuario. El token que
 * vuelve se guarda en la misma cookie httpOnly que el login normal: a
 * partir de aquí el scoreboard, la cola offline y /mis-partidos funcionan
 * igual que para un árbitro registrado.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ message: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const tokenPrevio = await getSessionToken();
  const backendRes = await fetch(`${API_URL}/rapido/partidos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tokenPrevio ? { Authorization: `Bearer ${tokenPrevio}` } : {}),
    },
    body: JSON.stringify({
      equipoLocal: body.equipoLocal,
      equipoVisitante: body.equipoVisitante,
      arbitro: body.arbitro || undefined,
    }),
  });

  const data = (await backendRes.json().catch(() => ({}))) as {
    access_token?: string;
    partidoId?: string;
    message?: string | string[];
  };
  if (!backendRes.ok || !data.access_token || !data.partidoId) {
    const message = Array.isArray(data.message)
      ? data.message.join(", ")
      : (data.message ?? "No se pudo crear el partido");
    return NextResponse.json({ message }, { status: backendRes.status || 502 });
  }

  const response = NextResponse.json({ partidoId: data.partidoId });
  response.cookies.set(SESSION_COOKIE, data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: secondsUntilExpiry(data.access_token) ?? 60 * 60 * 24 * 7,
  });
  return response;
}
