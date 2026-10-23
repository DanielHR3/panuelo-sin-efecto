import { ApiError, parseErrorMessage } from "./api";

/**
 * Fetch autenticado para Client Components: pasa por la ruta /api/proxy,
 * que lee la cookie httpOnly de sesión en el servidor y la reenvía como
 * Bearer, así el JWT nunca toca JavaScript del navegador. Las lecturas de
 * partidos, eventos y marcador exigen token, por eso el marcador del árbitro
 * usa esto en vez de `apiFetch`.
 *
 * Errores: una respuesta no-2xx lanza `ApiError`; sin conexión, `fetch`
 * lanza `TypeError` y se deja pasar tal cual (la PWA lo trata como "offline").
 */
export async function proxyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
