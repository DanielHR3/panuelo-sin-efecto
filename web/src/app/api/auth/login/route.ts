import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { SESSION_COOKIE, secondsUntilExpiry } from "@/lib/session";

interface LoginBody {
  email?: string;
  password?: string;
}

/**
 * Hace de puente entre el formulario de login y POST /auth/login del backend.
 * El JWT nunca llega al JavaScript del cliente: se recibe aquí (servidor) y
 * se guarda en una cookie httpOnly. Client Components que necesiten llamar a
 * la API autenticada lo hacen vía /api/proxy, no leyendo esta cookie.
 */
export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ message: "Cuerpo JSON inválido" }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return NextResponse.json(
      { message: "email y password son obligatorios" },
      { status: 400 },
    );
  }

  const backendRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  const data = (await backendRes.json().catch(() => ({}))) as {
    access_token?: string;
    usuario?: unknown;
    message?: string | string[];
  };

  if (!backendRes.ok || !data.access_token) {
    const message = Array.isArray(data.message)
      ? data.message.join(", ")
      : (data.message ?? "No se pudo iniciar sesión");
    return NextResponse.json({ message }, { status: backendRes.status || 401 });
  }

  const response = NextResponse.json({ usuario: data.usuario });
  response.cookies.set(SESSION_COOKIE, data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: secondsUntilExpiry(data.access_token) ?? 60 * 60 * 24 * 7,
  });
  return response;
}
