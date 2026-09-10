import { cookies } from "next/headers";
import { API_URL, ApiError } from "./api";
import { SESSION_COOKIE, decodeSessionUser, type SessionUser } from "./session";

/**
 * Utilidades server-only: leen la cookie httpOnly de sesión. Solo se pueden
 * usar en Server Components, Route Handlers o Server Actions (nunca en un
 * "use client").
 */

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  return token ? decodeSessionUser(token) : null;
}

/**
 * Fetch autenticado contra la API: adjunta el Bearer token de la cookie de
 * sesión. Úsalo en Server Components (lecturas) y Server Actions (escrituras)
 * del panel admin.
 */
export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  if (!token) throw new ApiError(401, "No hay sesión activa");

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = res.statusText || `Error ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      message = Array.isArray(body.message) ? body.message.join(", ") : (body.message ?? message);
    } catch {
      // sin cuerpo JSON
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
