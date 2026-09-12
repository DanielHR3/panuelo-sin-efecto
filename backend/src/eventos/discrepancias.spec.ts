import {
  detectarDiscrepancias,
  type EventoParaDiscrepancia,
} from './discrepancias';

const LOCAL_ID = 'equipo-local';
const VISITA_ID = 'equipo-visitante';

function evento(
  overrides: Partial<EventoParaDiscrepancia> & { id: string },
): EventoParaDiscrepancia {
  return {
    tipoEvento: 'TD',
    equipoId: LOCAL_ID,
    arbitroId: 'ref-1',
    timestamp: new Date('2026-09-20T18:00:00.000Z'),
    ...overrides,
  };
}

describe('detectarDiscrepancias', () => {
  it('devuelve vacío si no hay eventos', () => {
    expect(detectarDiscrepancias([])).toEqual([]);
  });

  it('ignora eventos que no son "de jugada" (INICIO_MITAD, FIN_MITAD, TIMEOUT, UNDO_LAST_ACTION)', () => {
    const eventos = [
      evento({
        id: 'e1',
        tipoEvento: 'FIN_MITAD',
        equipoId: null,
        arbitroId: 'ref-1',
      }),
      evento({
        id: 'e2',
        tipoEvento: 'FIN_MITAD',
        equipoId: null,
        arbitroId: 'ref-2',
      }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([]);
  });

  it('empareja dos TD del mismo equipo, de árbitros distintos, dentro de la ventana de 30s', () => {
    const eventos = [
      evento({
        id: 'e1',
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      }),
      evento({
        id: 'e2',
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([
      { eventoAId: 'e1', eventoBId: 'e2' },
    ]);
  });

  it('no empareja eventos del mismo árbitro', () => {
    const eventos = [
      evento({
        id: 'e1',
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      }),
      evento({
        id: 'e2',
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([]);
  });

  it('no empareja eventos fuera de la ventana de 30s', () => {
    const eventos = [
      evento({
        id: 'e1',
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      }),
      evento({
        id: 'e2',
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:45.000Z'),
      }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([]);
  });

  it('no empareja eventos de equipos distintos aunque coincidan en tiempo y tipo', () => {
    const eventos = [
      evento({
        id: 'e1',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      }),
      evento({
        id: 'e2',
        equipoId: VISITA_ID,
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([]);
  });

  it('jugadorId no afecta el agrupado: empareja aunque uno tenga jugador y el otro no', () => {
    const eventos = [
      evento({
        id: 'e1',
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      }),
      evento({
        id: 'e2',
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([
      { eventoAId: 'e1', eventoBId: 'e2' },
    ]);
  });

  it('con tres árbitros en la misma jugada, cada evento participa en como máximo un par', () => {
    const eventos = [
      evento({
        id: 'e1',
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      }),
      evento({
        id: 'e2',
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      }),
      evento({
        id: 'e3',
        arbitroId: 'ref-3',
        timestamp: new Date('2026-09-20T18:00:10.000Z'),
      }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([
      { eventoAId: 'e1', eventoBId: 'e2' },
    ]);
  });

  it('con cuatro árbitros forma dos pares independientes', () => {
    const eventos = [
      evento({
        id: 'e1',
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      }),
      evento({
        id: 'e2',
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      }),
      evento({
        id: 'e3',
        arbitroId: 'ref-3',
        timestamp: new Date('2026-09-20T18:00:10.000Z'),
      }),
      evento({
        id: 'e4',
        arbitroId: 'ref-4',
        timestamp: new Date('2026-09-20T18:00:15.000Z'),
      }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([
      { eventoAId: 'e1', eventoBId: 'e2' },
      { eventoAId: 'e3', eventoBId: 'e4' },
    ]);
  });
});
