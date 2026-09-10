export const SESSION_COOKIE = "panuelo_session";

export type Rol = "SUPERADMIN" | "LIGA_ADMIN" | "ARBITRO";

/** Payload del JWT emitido por el backend (ver backend AuthUser). */
export interface SessionUser {
  sub: string;
  email: string;
  rol: Rol;
}

/**
 * Decodifica el payload de un JWT sin verificar la firma. Es seguro aquí
 * porque el token solo llega a este código a través de la cookie httpOnly
 * que nosotros mismos escribimos (ver app/api/auth/login/route.ts) tras
 * validarlo contra el backend; nunca se acepta un token de otro origen.
 */
export function decodeSessionUser(token: string): SessionUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.sub || !payload.email || !payload.rol) return null;
  return { sub: payload.sub, email: payload.email, rol: payload.rol };
}

/** Segundos hasta que expire el token (según su claim `exp`), o `undefined`
 * si no se puede determinar (se deja la cookie de sesión sin maxAge). */
export function secondsUntilExpiry(token: string): number | undefined {
  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== "number") return undefined;
  return Math.max(0, exp - Math.floor(Date.now() / 1000));
}

function decodeJwtPayload(
  token: string,
): (Partial<SessionUser> & { exp?: number }) | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(json) as Partial<SessionUser> & { exp?: number };
  } catch {
    return null;
  }
}
