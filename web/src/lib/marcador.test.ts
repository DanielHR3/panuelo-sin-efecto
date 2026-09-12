import { describe, expect, it } from "vitest";
import { calcularMarcador, type EventoParaMarcador } from "./marcador";

const LOCAL = "local";
const VISITA = "visita";

function ev(tipoEvento: string, equipoId: string | null = LOCAL): EventoParaMarcador {
  return { tipoEvento, equipoId };
}

describe("calcularMarcador (cálculo optimista offline)", () => {
  it("empieza en 0-0 sin eventos", () => {
    expect(calcularMarcador([], LOCAL, VISITA)).toEqual({ local: 0, visitante: 0 });
  });

  it("suma los puntos por tipo al equipo correcto", () => {
    const eventos = [
      ev("TD", LOCAL),
      ev("PAT1", LOCAL),
      ev("TD", VISITA),
      ev("PAT2", VISITA),
      ev("SAFETY", LOCAL),
      ev("PICK_SIX", VISITA),
    ];
    expect(calcularMarcador(eventos, LOCAL, VISITA)).toEqual({ local: 9, visitante: 14 });
  });

  it("ignora eventos que no anotan aunque lleven equipo", () => {
    const eventos = [
      ev("TIMEOUT", LOCAL),
      ev("FALTA_PERSONAL", VISITA),
      ev("INTERCEPCION", LOCAL),
      ev("SACK", VISITA),
      ev("INICIO_MITAD", null),
    ];
    expect(calcularMarcador(eventos, LOCAL, VISITA)).toEqual({ local: 0, visitante: 0 });
  });

  it("ignora eventos de un equipo que no es del partido", () => {
    expect(calcularMarcador([ev("TD", "otro")], LOCAL, VISITA)).toEqual({
      local: 0,
      visitante: 0,
    });
  });

  it("UNDO_LAST_ACTION cancela el último evento vigente (aunque no anote)", () => {
    const eventos = [ev("TD", LOCAL), ev("TIMEOUT", VISITA), ev("UNDO_LAST_ACTION", null)];
    // El UNDO cancela el TIMEOUT, no el TD: el marcador se mantiene.
    expect(calcularMarcador(eventos, LOCAL, VISITA)).toEqual({ local: 6, visitante: 0 });
  });

  it("dos UNDO seguidos cancelan los dos últimos eventos", () => {
    const eventos = [
      ev("TD", LOCAL),
      ev("TD", VISITA),
      ev("PAT1", VISITA),
      ev("UNDO_LAST_ACTION", null),
      ev("UNDO_LAST_ACTION", null),
    ];
    expect(calcularMarcador(eventos, LOCAL, VISITA)).toEqual({ local: 6, visitante: 0 });
  });

  it("un UNDO sin nada que deshacer no rompe el cálculo", () => {
    expect(calcularMarcador([ev("UNDO_LAST_ACTION", null)], LOCAL, VISITA)).toEqual({
      local: 0,
      visitante: 0,
    });
  });

  it("un evento posterior a un UNDO vuelve a contar con normalidad", () => {
    const eventos = [ev("TD", LOCAL), ev("UNDO_LAST_ACTION", null), ev("TD", LOCAL)];
    expect(calcularMarcador(eventos, LOCAL, VISITA)).toEqual({ local: 6, visitante: 0 });
  });
});
