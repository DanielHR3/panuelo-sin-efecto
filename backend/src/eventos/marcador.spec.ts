import {
  calcularMarcador,
  filtrarEventosVigentes,
  type EventoParaMarcador,
  type EventoConId,
} from './marcador';

const LOCAL = 'equipo-local';
const VISITA = 'equipo-visitante';

function ev(
  tipoEvento: string,
  equipoId: string | null = null,
): EventoParaMarcador {
  return { tipoEvento, equipoId };
}

function evId(
  id: string,
  tipoEvento: string,
  equipoId: string | null = null,
): EventoConId & EventoParaMarcador {
  return { id, tipoEvento, equipoId };
}

describe('calcularMarcador', () => {
  it('suma TD + PAT1 del equipo local', () => {
    const m = calcularMarcador(
      [ev('TD', LOCAL), ev('PAT1', LOCAL)],
      LOCAL,
      VISITA,
    );
    expect(m).toEqual({ local: 7, visitante: 0 });
  });

  it('suma anotaciones de ambos equipos por separado', () => {
    const m = calcularMarcador(
      [ev('TD', LOCAL), ev('SAFETY', VISITA), ev('PICK_SIX', VISITA)],
      LOCAL,
      VISITA,
    );
    expect(m).toEqual({ local: 6, visitante: 8 });
  });

  it('los eventos de control (INICIO_MITAD, TIMEOUT, ...) no puntúan', () => {
    const m = calcularMarcador(
      [ev('INICIO_MITAD'), ev('TIMEOUT', LOCAL), ev('FALTA_PERSONAL', VISITA)],
      LOCAL,
      VISITA,
    );
    expect(m).toEqual({ local: 0, visitante: 0 });
  });

  it('UNDO_LAST_ACTION cancela la última anotación vigente', () => {
    const m = calcularMarcador(
      [ev('TD', LOCAL), ev('PAT1', LOCAL), ev('UNDO_LAST_ACTION')],
      LOCAL,
      VISITA,
    );
    expect(m).toEqual({ local: 6, visitante: 0 }); // se deshace el PAT1, no el TD
  });

  it('dos UNDO consecutivos cancelan hacia atrás', () => {
    const m = calcularMarcador(
      [
        ev('TD', LOCAL),
        ev('PAT1', LOCAL),
        ev('UNDO_LAST_ACTION'),
        ev('UNDO_LAST_ACTION'),
      ],
      LOCAL,
      VISITA,
    );
    expect(m).toEqual({ local: 0, visitante: 0 });
  });

  it('UNDO puede cancelar un evento que no anota (p.ej. un TIMEOUT mal marcado)', () => {
    const m = calcularMarcador(
      [ev('TD', LOCAL), ev('TIMEOUT', LOCAL), ev('UNDO_LAST_ACTION')],
      LOCAL,
      VISITA,
    );
    // el TD sigue vigente: el UNDO canceló el último evento (el timeout), no el TD
    expect(m).toEqual({ local: 6, visitante: 0 });
  });

  it('un UNDO sin nada que cancelar es un no-op', () => {
    const m = calcularMarcador([ev('UNDO_LAST_ACTION')], LOCAL, VISITA);
    expect(m).toEqual({ local: 0, visitante: 0 });
  });

  it('la bitácora vacía da marcador 0-0', () => {
    expect(calcularMarcador([], LOCAL, VISITA)).toEqual({
      local: 0,
      visitante: 0,
    });
  });
});

describe('filtrarEventosVigentes', () => {
  // Comparte la MISMA pila de cancelación que calcularMarcador (HU-2.6,
  // finding 1): así detectarDiscrepancias nunca puede ver como "vigente" un
  // evento que calcularMarcador ya trata como cancelado, o viceversa.

  it('devuelve todos los eventos si no hay ningún UNDO', () => {
    const eventos = [evId('e1', 'TD', LOCAL), evId('e2', 'PAT1', LOCAL)];
    expect(filtrarEventosVigentes(eventos)).toEqual(eventos);
  });

  it('excluye el evento cancelado por un UNDO_LAST_ACTION posterior', () => {
    const eventos = [
      evId('e1', 'TD', LOCAL),
      evId('e2', 'PAT1', LOCAL),
      evId('e3', 'UNDO_LAST_ACTION'),
    ];
    // El UNDO cancela el último vigente (PAT1 = e2), no el TD (e1). El
    // propio UNDO tampoco es "vigente" en el sentido de esta función (no es
    // cancelable, no participa en discrepancias).
    expect(filtrarEventosVigentes(eventos)).toEqual([evId('e1', 'TD', LOCAL)]);
  });

  it('la pila de cancelación incluye eventos no-jugada (TIMEOUT, etc.)', () => {
    const eventos = [
      evId('e1', 'TD', LOCAL),
      evId('e2', 'TIMEOUT', LOCAL),
      evId('e3', 'UNDO_LAST_ACTION'),
    ];
    // El UNDO cancela el TIMEOUT (el último evento no-undo, aunque no
    // anote), no el TD — igual que calcularMarcador.
    expect(filtrarEventosVigentes(eventos)).toEqual([evId('e1', 'TD', LOCAL)]);
  });

  it('dos UNDO consecutivos cancelan dos eventos hacia atrás', () => {
    const eventos = [
      evId('e1', 'TD', LOCAL),
      evId('e2', 'PAT1', LOCAL),
      evId('e3', 'UNDO_LAST_ACTION'),
      evId('e4', 'UNDO_LAST_ACTION'),
    ];
    expect(filtrarEventosVigentes(eventos)).toEqual([]);
  });

  it('un UNDO sin nada que cancelar es un no-op', () => {
    const eventos = [evId('e1', 'UNDO_LAST_ACTION'), evId('e2', 'TD', LOCAL)];
    expect(filtrarEventosVigentes(eventos)).toEqual([evId('e2', 'TD', LOCAL)]);
  });

  it('lista vacía da lista vacía', () => {
    expect(filtrarEventosVigentes([])).toEqual([]);
  });
});
