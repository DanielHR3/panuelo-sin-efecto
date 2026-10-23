import { describe, expect, it } from "vitest";
import type { GameEvent, TipoEvento } from "@/lib/types";
import { eventosAnulables, reabiertoParaCorregir, undoSinEfecto } from "./corregir";

let n = 0;
function ev(
  tipoEvento: TipoEvento,
  extra: Partial<GameEvent> = {},
): GameEvent {
  n += 1;
  return {
    id: extra.id ?? `e${n}`,
    timestamp: new Date(2026, 9, 23, 12, 0, n).toISOString(),
    tipoEvento,
    clientEventId: null,
    partidoId: "p1",
    equipoId: "local",
    jugadorId: null,
    arbitroId: "a1",
    eventoAnuladoId: null,
    descartado: false,
    ...extra,
  };
}

describe("eventosAnulables", () => {
  it("excluye eventos de control, UNDO, REABRIR y ANULAR", () => {
    const eventos = [
      ev("INICIO_MITAD", { equipoId: null }),
      ev("TD", { id: "td" }),
      ev("TIMEOUT"),
      ev("FIN_MITAD", { equipoId: null }),
      ev("REABRIR_PARTIDO", { equipoId: null }),
    ];
    expect(eventosAnulables(eventos).map((e) => e.id)).toEqual(["td"]);
  });

  it("excluye eventos ya anulados y los deshechos con UNDO", () => {
    const eventos = [
      ev("TD", { id: "td1" }),
      ev("PAT1", { id: "pat" }),
      ev("UNDO_LAST_ACTION", { equipoId: null }),
      ev("TD", { id: "td2", equipoId: "visita" }),
      ev("FIN_MITAD", { equipoId: null }),
      ev("REABRIR_PARTIDO", { equipoId: null }),
      ev("ANULAR_EVENTO", { equipoId: null, eventoAnuladoId: "td1" }),
    ];
    expect(eventosAnulables(eventos).map((e) => e.id)).toEqual(["td2"]);
  });

  it("restituye un evento si su anulación se deshizo", () => {
    const eventos = [
      ev("TD", { id: "td1" }),
      ev("REABRIR_PARTIDO", { equipoId: null }),
      ev("ANULAR_EVENTO", { equipoId: null, eventoAnuladoId: "td1" }),
      ev("UNDO_LAST_ACTION", { equipoId: null }),
    ];
    expect(eventosAnulables(eventos).map((e) => e.id)).toEqual(["td1"]);
  });

  it("ordena del más reciente al más antiguo", () => {
    const eventos = [
      ev("TD", { id: "a" }),
      ev("SACK", { id: "b" }),
      ev("FALTA_PERSONAL", { id: "c" }),
    ];
    expect(eventosAnulables(eventos).map((e) => e.id)).toEqual(["c", "b", "a"]);
  });
});

describe("eventosAnulables: descartados", () => {
  it("no ofrece anular un evento descartado al resolver una discrepancia", () => {
    const eventos = [
      ev("TD", { id: "td1" }),
      ev("TD", { id: "td2", descartado: true }),
      ev("FIN_MITAD", { equipoId: null }),
      ev("REABRIR_PARTIDO", { equipoId: null }),
    ];
    expect(eventosAnulables(eventos).map((e) => e.id)).toEqual(["td1"]);
  });

  it("calcula la vigencia sin los descartados (como el servidor)", () => {
    // Si el descartado entrara en la pila, el UNDO lo cancelaría a él y td1
    // seguiría vigente; el servidor no lo ve, así que el UNDO cancela td1.
    const eventos = [
      ev("TD", { id: "td1" }),
      ev("TD", { id: "td2", descartado: true }),
      ev("UNDO_LAST_ACTION", { equipoId: null }),
      ev("TD", { id: "td3" }),
      ev("REABRIR_PARTIDO", { equipoId: null }),
    ];
    expect(eventosAnulables(eventos).map((e) => e.id)).toEqual(["td3"]);
  });
});

describe("undoSinEfecto", () => {
  it("es true si el último evento vigente es REABRIR_PARTIDO", () => {
    expect(undoSinEfecto([ev("TD"), ev("FIN_MITAD"), ev("REABRIR_PARTIDO")])).toBe(true);
  });

  it("es true si todo lo posterior a la reapertura ya se deshizo", () => {
    expect(
      undoSinEfecto([ev("TD"), ev("REABRIR_PARTIDO"), ev("TD"), ev("UNDO_LAST_ACTION")]),
    ).toBe(true);
  });

  it("es false si hay algo deshacible tras la reapertura", () => {
    expect(undoSinEfecto([ev("TD"), ev("REABRIR_PARTIDO"), ev("TD")])).toBe(false);
  });

  it("es false en un partido normal y sin eventos", () => {
    expect(undoSinEfecto([ev("INICIO_MITAD"), ev("TD")])).toBe(false);
    expect(undoSinEfecto([])).toBe(false);
  });
});

describe("reabiertoParaCorregir", () => {
  it("es true en EN_CURSO con un REABRIR_PARTIDO vigente", () => {
    expect(reabiertoParaCorregir("EN_CURSO", [ev("TD"), ev("REABRIR_PARTIDO")])).toBe(true);
  });

  it("es false en un partido en curso que nunca se reabrió", () => {
    expect(reabiertoParaCorregir("EN_CURSO", [ev("INICIO_MITAD"), ev("TD")])).toBe(false);
  });

  it("es false si el partido ya se refinalizó", () => {
    expect(reabiertoParaCorregir("FINALIZADO", [ev("REABRIR_PARTIDO"), ev("FIN_MITAD")])).toBe(
      false,
    );
  });
});
