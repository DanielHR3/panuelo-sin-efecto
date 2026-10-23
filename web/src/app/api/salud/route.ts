import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

/** Corte del ping a la API: por debajo del límite de una función de Vercel. */
export const TIMEOUT_SALUD_MS = 25_000;

/**
 * Salud de la API vista desde la web. La pantalla "Despertando el servidor…"
 * la consulta desde el navegador; pasar por aquí (mismo origen) evita que el
 * ping dependa del CORS de la API y funcione igual en previews de Vercel.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch(`${API_URL}/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_SALUD_MS),
    });
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
