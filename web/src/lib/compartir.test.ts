import { describe, expect, it } from "vitest";
import { textoCompartir } from "./compartir";
import type { ResumenPartido } from "./types";

const base: ResumenPartido = {
  id: "p1",
  fechaHora: "2026-09-20T18:00:00.000Z",
  estado: "FINALIZADO",
  marcadorLocal: 13,
  marcadorVisitante: 6,
  mvpJugadorId: "j1",
  equipoLocal: { id: "a", nombre: "Toros", colorPrimario: null },
  equipoVisitante: { id: "b", nombre: "Lobos", colorPrimario: null },
  categoria: { id: "c", nombre: "Partidos rápidos" },
  liga: { id: "l", nombre: "Partidos rápidos de Beto", logoUrl: null, esRapida: true },
  mvp: { id: "j1", nombre: "Ana", numeroJersey: "7", equipoId: "a" },
  arbitros: [{ nombre: "Beto", rolEnCampo: "Referee" }],
  anotadores: [
    { jugadorId: "j1", equipoId: "a", puntos: 7, td: 1, nombre: "Ana", numeroJersey: "7" },
    { jugadorId: null, equipoId: "a", puntos: 6, td: 1, nombre: null, numeroJersey: null },
    { jugadorId: "j2", equipoId: "b", puntos: 6, td: 1, nombre: "Caro", numeroJersey: "9" },
  ],
};

describe("textoCompartir", () => {
  it("arma el mensaje con marcador primero, anotadores con nombre, MVP, árbitro y enlace al final", () => {
    const t = textoCompartir(base, "https://x/resultado/p1");
    const lineas = t.split("\n");
    expect(lineas[0]).toBe("🏈 Toros 13 – 6 Lobos");
    expect(lineas[1]).toMatch(/^Final · /);
    expect(lineas[2]).toBe("Anotaron: Ana (7), Caro (6)");
    expect(lineas[3]).toBe("MVP: #7 Ana");
    expect(lineas[4]).toBe("Árbitro: Beto");
    expect(lineas.at(-1)).toBe("https://x/resultado/p1");
  });

  it("omite anotadores, MVP y árbitro cuando no hay", () => {
    const t = textoCompartir({ ...base, estado: "EN_CURSO", mvp: null, arbitros: [], anotadores: [] }, "u");
    expect(t).toBe("🏈 Toros 13 – 6 Lobos\nEn juego\nu");
  });
});
