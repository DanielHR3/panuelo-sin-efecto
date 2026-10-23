import { afterEach, describe, expect, it, vi } from "vitest";
import { postIntercambiarEquipos } from "./intercambiar";

function respuesta(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("postIntercambiarEquipos", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envía localEsperado con el local que se muestra (idempotencia ante reintentos)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      respuesta(201, {
        equipoLocal: { id: "a", nombre: "Lobos" },
        equipoVisitante: { id: "b", nombre: "Toros" },
        aplicado: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await postIntercambiarEquipos("p1", "Toros");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/proxy/rapido/partidos/p1/intercambiar-equipos");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ localEsperado: "Toros" });
  });

  it("devuelve los nombres de la respuesta también cuando aplicado es false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respuesta(201, {
          equipoLocal: { id: "a", nombre: "Lobos" },
          equipoVisitante: { id: "b", nombre: "Toros" },
          aplicado: false,
        }),
      ),
    );
    await expect(postIntercambiarEquipos("p1", "Toros")).resolves.toEqual({
      equipoLocal: { nombre: "Lobos" },
      equipoVisitante: { nombre: "Toros" },
    });
  });

  it("lanza el mensaje del backend si falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuesta(400, { message: ["Solo disponible en partidos rápidos"] })),
    );
    await expect(postIntercambiarEquipos("p1", "Toros")).rejects.toThrow(
      "Solo disponible en partidos rápidos",
    );
  });
});
