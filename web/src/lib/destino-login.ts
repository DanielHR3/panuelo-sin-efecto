import type { Rol } from "./session";

/**
 * A dónde mandar a alguien después de iniciar sesión. Si venía de una ruta
 * protegida (`?next=`), se respeta; si no, cada rol tiene su casa: el
 * árbitro va a sus partidos, los administradores al panel.
 */
export function destinoTrasLogin(next: string | null, rol: Rol | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && next !== "/") {
    return next;
  }
  return rol === "ARBITRO" ? "/mis-partidos" : "/admin";
}
