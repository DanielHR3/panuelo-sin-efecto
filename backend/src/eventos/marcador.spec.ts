import { calcularMarcador, type EventoParaMarcador } from './marcador';

const LOCAL = 'equipo-local';
const VISITA = 'equipo-visitante';

function ev(
  tipoEvento: string,
  equipoId: string | null = null,
): EventoParaMarcador {
  return { tipoEvento, equipoId };
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
