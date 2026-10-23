import { describe, expect, it } from "vitest";
import { calcularMarcador, type EventoParaMarcador } from "./marcador";

const LOCAL = "local";
const VISITA = "visita";

let secuencia = 0;
function ev(
  tipoEvento: string,
  equipoId: string | null = LOCAL,
  id: string = `auto-${++secuencia}`,
  eventoAnuladoId: string | null = null,
): EventoParaMarcador {
  return { id, tipoEvento, equipoId, eventoAnuladoId };
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

describe("ANULAR_EVENTO y REABRIR_PARTIDO", () => {
  it("anula un TD que no es el último", () => {
    const m = calcularMarcador(
      [ev("TD", LOCAL, "a"), ev("PAT1", LOCAL, "b"), ev("ANULAR_EVENTO", null, "x", "a")],
      LOCAL,
      VISITA,
    );
    expect(m).toEqual({ local: 1, visitante: 0 });
  });

  it("UNDO deshace una anulación", () => {
    const m = calcularMarcador(
      [ev("TD", LOCAL, "a"), ev("ANULAR_EVENTO", null, "x", "a"), ev("UNDO_LAST_ACTION")],
      LOCAL,
      VISITA,
    );
    expect(m).toEqual({ local: 6, visitante: 0 });
  });

  it("UNDO tras REABRIR es no-op", () => {
    const m = calcularMarcador(
      [
        ev("TD", LOCAL, "a"),
        ev("FIN_MITAD", null, "f1"),
        ev("FIN_MITAD", null, "f2"),
        ev("REABRIR_PARTIDO", null, "r"),
        ev("UNDO_LAST_ACTION"),
      ],
      LOCAL,
      VISITA,
    );
    expect(m).toEqual({ local: 6, visitante: 0 });
  });

  it("UNDO después de un TD posterior a la reapertura cancela ese TD", () => {
    const m = calcularMarcador(
      [
        ev("TD", LOCAL, "a"),
        ev("FIN_MITAD", null, "f1"),
        ev("FIN_MITAD", null, "f2"),
        ev("REABRIR_PARTIDO", null, "r"),
        ev("TD", VISITA, "c"),
        ev("UNDO_LAST_ACTION"),
      ],
      LOCAL,
      VISITA,
    );
    expect(m).toEqual({ local: 6, visitante: 0 });
  });

  it("ANULAR_EVENTO que apunta a un id inexistente es no-op", () => {
    const m = calcularMarcador(
      [ev("TD", LOCAL, "a"), ev("ANULAR_EVENTO", null, "x", "no-existe")],
      LOCAL,
      VISITA,
    );
    expect(m).toEqual({ local: 6, visitante: 0 });
  });

  it.each(["REABRIR_PARTIDO", "FIN_MITAD", "ANULAR_EVENTO"])(
    "ANULAR_EVENTO que apunta a %s es no-op",
    (tipo) => {
      const eventos = [
        ev("TD", LOCAL, "a"),
        ev(tipo, null, "obj", tipo === "ANULAR_EVENTO" ? "a" : null),
        ev("ANULAR_EVENTO", null, "x", "obj"),
      ];
      expect(calcularMarcador(eventos, LOCAL, VISITA)).toEqual(
        calcularMarcador(eventos.slice(0, 2), LOCAL, VISITA),
      );
    },
  );
});
