import { describe, expect, it } from "vitest";
import { describirEvento } from "./describe";
import type { EquipoConRoster, GameEvent } from "@/lib/types";

const base = { categoriaId: "c1", colorPrimario: null, createdAt: "", updatedAt: "" };
const local: EquipoConRoster = {
  ...base,
  id: "eq-local",
  nombre: "Toros",
  jugadores: [
    { id: "j1", nombre: "Ana", numeroJersey: "7", equipoId: "eq-local", createdAt: "", updatedAt: "" },
  ],
};
const visitante: EquipoConRoster = {
  ...base,
  id: "eq-visita",
  nombre: "Lobos",
  jugadores: [],
};

function evento(partial: Partial<GameEvent>): GameEvent {
  return {
    id: "e1",
    timestamp: "2026-09-20T18:00:00.000Z",
    tipoEvento: "TD",
    clientEventId: null,
    partidoId: "p1",
    equipoId: null,
    jugadorId: null,
    arbitroId: "ref",
    ...partial,
  };
}

describe("describirEvento (aviso de último evento)", () => {
  it("sin equipo solo muestra la etiqueta del tipo", () => {
    expect(describirEvento(evento({ tipoEvento: "INICIO_MITAD" }), local, visitante)).toBe(
      "Inicio de mitad",
    );
  });

  it("con equipo pero sin jugador muestra tipo y equipo", () => {
    expect(describirEvento(evento({ equipoId: "eq-visita" }), local, visitante)).toBe(
      "Touchdown: Lobos",
    );
  });

  it("con jugador muestra número y nombre en el formato #numero nombre", () => {
    expect(describirEvento(evento({ equipoId: "eq-local", jugadorId: "j1" }), local, visitante)).toBe(
      "Touchdown: Toros #7 Ana",
    );
  });

  it("si el jugador no está en el roster cae al formato de solo equipo", () => {
    expect(
      describirEvento(evento({ equipoId: "eq-local", jugadorId: "desconocido" }), local, visitante),
    ).toBe("Touchdown: Toros");
  });

  it("un tipo sin etiqueta conocida se muestra tal cual", () => {
    const raro = evento({ tipoEvento: "OTRO" as GameEvent["tipoEvento"] });
    expect(describirEvento(raro, local, visitante)).toBe("OTRO");
  });
});
