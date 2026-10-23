import { ApiError } from "@/lib/api";

/**
 * Cómo responde /partido/[id] cuando la API niega el detalle del partido.
 * Las lecturas de partido exigen sesión y ser árbitro asignado, dueño de la
 * liga o SUPERADMIN; sin esto, cualquier 401/403/404 caía en la página de
 * error genérica de Next.
 */
export type AccesoDenegado = "no-encontrado" | "sin-sesion" | "no-asignado";

export function accesoDenegado(error: unknown): AccesoDenegado | null {
  if (!(error instanceof ApiError)) return null;
  switch (error.status) {
    case 404:
      return "no-encontrado";
    case 401:
      return "sin-sesion";
    case 403:
      return "no-asignado";
    default:
      return null;
  }
}

/** Login que regresa a este partido (LoginForm respeta `?next=`). */
export function loginParaPartido(id: string): string {
  return `/login?next=${encodeURIComponent(`/partido/${id}`)}`;
}
