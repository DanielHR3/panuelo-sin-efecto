import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { guardarSesion, mensajeDeError } from "../sesion";

const CAMPOS = ["nombre", "email", "password", "nombreLiga", "categoria"] as const;

/**
 * Puente entre el formulario de /registro y POST /registro del backend: crea
 * la cuenta del organizador con su liga y deja la sesión iniciada (cookie
 * httpOnly), igual que el login.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Cuerpo JSON inválido" }, { status: 400 });
  }
  // Solo los campos que acepta la API (rechaza cualquier otro con 400).
  const datos = Object.fromEntries(
    CAMPOS.filter((c) => typeof body[c] === "string" && body[c] !== "").map((c) => [c, body[c]]),
  );

  const backendRes = await fetch(`${API_URL}/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const data = (await backendRes.json().catch(() => ({}))) as {
    access_token?: string;
    usuario?: unknown;
    message?: string | string[];
  };

  if (!backendRes.ok || !data.access_token) {
    const message = mensajeDeError(data.message, "No se pudo crear tu cuenta");
    return NextResponse.json({ message }, { status: backendRes.status || 400 });
  }
  return guardarSesion(NextResponse.json({ usuario: data.usuario }), data.access_token);
}
