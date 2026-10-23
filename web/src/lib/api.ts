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

export async function parseErrorMessage(res: Response): Promise<string> {
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
 * Fetch tipado SIN credenciales. Solo sirve para los endpoints @Public del
 * backend: el sitio público (`/publico/*`, vía `lib/publico.ts`),
 * `POST /rapido/partidos` y `POST /auth/login`. Las lecturas CRUD (ligas,
 * categorías, equipos, jugadores, partidos, eventos, marcador) exigen token
 * y se acotan por propiedad: usa `authedFetch` (Server Components y Server
 * Actions) o `proxyFetch` / la ruta /api/proxy (Client Components).
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
