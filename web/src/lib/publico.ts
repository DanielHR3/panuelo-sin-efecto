import { API_URL } from "./api";

export type ResultadoPublico<T> =
  | { ok: true; data: T }
  | { ok: false; motivo: "no-encontrado" | "sin-respuesta" };

/**
 * Lecturas públicas para la landing y los perfiles. A diferencia de
 * `apiFetch`, nunca lanza: la API vive en un plan gratuito que se duerme y
 * tarda ~1 min en despertar, y la landing debe seguir cargando con un aviso
 * en vez de caerse al error boundary. Corta a los 8 s para no agotar el
 * tiempo máximo de la función serverless de Vercel.
 */
export async function fetchPublico<T>(
  path: string,
  opciones?: { revalidarSegundos?: number; timeoutMs?: number },
): Promise<ResultadoPublico<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(opciones?.timeoutMs ?? 8000),
      next: { revalidate: opciones?.revalidarSegundos ?? 30 },
    });
    if (res.status === 404) return { ok: false, motivo: "no-encontrado" };
    if (!res.ok) return { ok: false, motivo: "sin-respuesta" };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, motivo: "sin-respuesta" };
  }
}
