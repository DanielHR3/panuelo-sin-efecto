import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { proxyFetch } from "./proxy-fetch";

function respuesta(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("proxyFetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("llama a /api/proxy (la cookie de sesión viaja sola) y devuelve el JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { estado: "EN_CURSO" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(proxyFetch<{ estado: string }>("/partidos/p1")).resolves.toEqual({
      estado: "EN_CURSO",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/proxy/partidos/p1", expect.any(Object));
  });

  it("lanza ApiError con el status y el mensaje del backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuesta(403, { message: "No tienes permiso" })),
    );

    const error = await proxyFetch("/partidos/p1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, message: "No tienes permiso" });
  });

  it("deja pasar el TypeError de red (sin conexión) tal cual", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(proxyFetch("/partidos/p1")).rejects.toBeInstanceOf(TypeError);
  });
});
