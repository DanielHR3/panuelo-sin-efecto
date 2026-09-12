const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(", ");
    if (typeof body.message === "string") return body.message;
  } catch {
    // el backend no devolvió JSON; se usa el texto de estado
  }
  return res.statusText || `Error ${res.status}`;
}

/**
 * Fetch tipado contra la API pública (endpoints @Public del backend: lecturas
 * de ligas, categorías, equipos, jugadores, partidos). No adjunta credenciales
 * — para llamadas autenticadas usa `authedFetch` (server) o la ruta
 * /api/proxy (cliente). Funciona tanto en Server Components como en Client
 * Components porque solo depende de `fetch` y de una URL pública.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { API_URL };
