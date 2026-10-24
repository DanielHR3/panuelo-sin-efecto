import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getSessionToken } from "@/lib/server-api";

/** Descarga la plantilla .xlsx de la API con la sesión del organizador. */
export async function GET(): Promise<Response> {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "No hay sesión activa" }, { status: 401 });
  const res = await fetch(`${API_URL}/importacion/plantilla`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ message: "No se pudo descargar la plantilla" }, { status: res.status });
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": 'attachment; filename="plantilla-liga.xlsx"',
    },
  });
}
