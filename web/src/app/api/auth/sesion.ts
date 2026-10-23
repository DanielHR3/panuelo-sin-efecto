import type { NextResponse } from "next/server";
import { SESSION_COOKIE, secondsUntilExpiry } from "@/lib/session";

/**
 * Guarda el JWT en la cookie httpOnly de sesión. El token nunca llega al
 * JavaScript del cliente (ver /api/auth/login y /api/auth/registro).
 */
export function guardarSesion<T>(response: NextResponse<T>, token: string): NextResponse<T> {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: secondsUntilExpiry(token) ?? 60 * 60 * 24 * 7,
  });
  return response;
}

/** El mensaje de error de la API, que puede venir como lista (class-validator). */
export function mensajeDeError(message: string | string[] | undefined, porDefecto: string): string {
  if (Array.isArray(message)) return message.join(", ");
  return message ?? porDefecto;
}
