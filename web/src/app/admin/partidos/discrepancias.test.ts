import { describe, expect, it } from "vitest";
import type { Discrepancia, EventoDiscrepancia } from "@/lib/types";
import { descarteBloqueado } from "./discrepancias";

function evento(id: string, extra: Partial<EventoDiscrepancia> = {}): EventoDiscrepancia {
  return {
    id,
    tipoEvento: "TD",
    equipoId: "local",
    jugadorId: null,
    arbitroId: "a1",
    timestamp: "2026-10-20T12:00:00.000Z",
    descartado: false,
    anulado: false,
    ...extra,
  };
}

function discrepancia(a: EventoDiscrepancia, b: EventoDiscrepancia): Discrepancia {
  return {
    id: "d1",
    partidoId: "p1",
    estado: "PENDIENTE",
    eventoA: a,
    eventoB: b,
    eventoDescartadoId: null,
    resueltoPorId: null,
    resolvedAt: null,
  };
}

describe("descarteBloqueado", () => {
  it("permite descartar cualquiera si ambos siguen vigentes", () => {
    const d = discrepancia(evento("e1"), evento("e2"));
    expect(descarteBloqueado(d, "A")).toBe(false);
    expect(descarteBloqueado(d, "B")).toBe(false);
  });

  it("bloquea descartar A si B ya fue anulado (y permite descartar B)", () => {
    const d = discrepancia(evento("e1"), evento("e2", { anulado: true }));
    expect(descarteBloqueado(d, "A")).toBe(true);
    expect(descarteBloqueado(d, "B")).toBe(false);
  });

  it("bloquea descartar B si A ya no cuenta (descartado por otra discrepancia)", () => {
    const d = discrepancia(evento("e1", { descartado: true }), evento("e2"));
    expect(descarteBloqueado(d, "B")).toBe(true);
  });
});
