import {
  calcularAnotadores,
  calcularEstadisticasJugador,
  calcularLideres,
  calcularTablaPosiciones,
  eventosVigentesPorPartido,
} from './estadisticas';

const A = 'equipo-a';
const B = 'equipo-b';
const C = 'equipo-c';

function partido(
  local: string,
  visitante: string,
  ml: number,
  mv: number,
  estado = 'FINALIZADO',
) {
  return {
    estado,
    equipoLocalId: local,
    equipoVisitanteId: visitante,
    marcadorLocal: ml,
    marcadorVisitante: mv,
  };
}

describe('calcularTablaPosiciones (HU-3.4)', () => {
  const equipos = [
    { id: A, nombre: 'Toros' },
    { id: B, nombre: 'Lobos' },
    { id: C, nombre: 'Halcones' },
  ];

  it('con cero partidos, todos los equipos aparecen en cero', () => {
    const tabla = calcularTablaPosiciones([], equipos);
    expect(tabla).toHaveLength(3);
    expect(tabla[0]).toMatchObject({
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      pf: 0,
      pc: 0,
      dif: 0,
      pts: 0,
    });
  });

  it('cuenta victoria (3 pts), empate (1) y derrota (0) solo de partidos FINALIZADOS', () => {
    const tabla = calcularTablaPosiciones(
      [
        partido(A, B, 12, 6), // gana A
        partido(B, C, 7, 7), // empate
        partido(A, C, 0, 6, 'EN_CURSO'), // no cuenta
        partido(C, A, 20, 14, 'PROGRAMADO'), // no cuenta
      ],
      equipos,
    );
    const porId = Object.fromEntries(tabla.map((f) => [f.equipoId, f]));
    expect(porId[A]).toMatchObject({
      pj: 1,
      pg: 1,
      pe: 0,
      pp: 0,
      pf: 12,
      pc: 6,
      dif: 6,
      pts: 3,
    });
    expect(porId[B]).toMatchObject({
      pj: 2,
      pg: 0,
      pe: 1,
      pp: 1,
      pf: 13,
      pc: 19,
      dif: -6,
      pts: 1,
    });
    expect(porId[C]).toMatchObject({
      pj: 1,
      pg: 0,
      pe: 1,
      pp: 0,
      pf: 7,
      pc: 7,
      dif: 0,
      pts: 1,
    });
  });

  it('ordena por puntos, luego diferencia, luego puntos a favor, y numera la posición', () => {
    const tabla = calcularTablaPosiciones(
      [
        partido(A, B, 6, 0), // A 3pts dif+6
        partido(C, B, 20, 0), // C 3pts dif+20
      ],
      equipos,
    );
    expect(tabla.map((f) => f.equipoId)).toEqual([C, A, B]);
    expect(tabla.map((f) => f.posicion)).toEqual([1, 2, 3]);
    expect(tabla[0].nombre).toBe('Halcones');
  });
});

describe('eventosVigentesPorPartido', () => {
  it('aplica UNDO por partido, no de forma global', () => {
    const eventos = [
      {
        id: '1',
        partidoId: 'p1',
        tipoEvento: 'TD',
        jugadorId: 'j1',
        equipoId: A,
      },
      {
        id: '2',
        partidoId: 'p2',
        tipoEvento: 'TD',
        jugadorId: 'j2',
        equipoId: B,
      },
      // El UNDO de p1 debe cancelar el TD de p1, no el de p2 (que se insertó después).
      {
        id: '3',
        partidoId: 'p1',
        tipoEvento: 'UNDO_LAST_ACTION',
        jugadorId: null,
        equipoId: null,
      },
    ];
    const vigentes = eventosVigentesPorPartido(eventos);
    expect(vigentes.map((e) => e.id)).toEqual(['2']);
  });
});

describe('calcularEstadisticasJugador (HU-3.1)', () => {
  const eventos = [
    {
      id: '1',
      partidoId: 'p1',
      tipoEvento: 'TD',
      jugadorId: 'j1',
      equipoId: A,
    },
    {
      id: '2',
      partidoId: 'p1',
      tipoEvento: 'PAT1',
      jugadorId: 'j1',
      equipoId: A,
    },
    {
      id: '3',
      partidoId: 'p1',
      tipoEvento: 'INTERCEPCION',
      jugadorId: 'j1',
      equipoId: A,
    },
    {
      id: '4',
      partidoId: 'p2',
      tipoEvento: 'PICK_SIX',
      jugadorId: 'j1',
      equipoId: A,
    },
    {
      id: '5',
      partidoId: 'p2',
      tipoEvento: 'SACK',
      jugadorId: 'j1',
      equipoId: A,
    },
    {
      id: '6',
      partidoId: 'p2',
      tipoEvento: 'SAFETY',
      jugadorId: 'j1',
      equipoId: A,
    },
    {
      id: '7',
      partidoId: 'p2',
      tipoEvento: 'PAT2',
      jugadorId: 'j1',
      equipoId: A,
    },
    {
      id: '8',
      partidoId: 'p2',
      tipoEvento: 'TD',
      jugadorId: 'j2',
      equipoId: A,
    },
    {
      id: '9',
      partidoId: 'p3',
      tipoEvento: 'FALTA_PERSONAL',
      jugadorId: 'j1',
      equipoId: A,
    },
  ];

  it('suma cada tipo de jugada, los puntos y los partidos con participación', () => {
    const stats = calcularEstadisticasJugador(eventos, 'j1', 2);
    expect(stats).toEqual({
      td: 1,
      pat1: 1,
      pat2: 1,
      safety: 1,
      pickSix: 1,
      intercepciones: 1,
      sacks: 1,
      faltas: 1,
      puntos: 6 + 1 + 2 + 2 + 6,
      partidos: 3,
      mvps: 2,
    });
  });

  it('un jugador sin eventos queda en cero', () => {
    expect(calcularEstadisticasJugador(eventos, 'nadie', 0)).toMatchObject({
      td: 0,
      puntos: 0,
      partidos: 0,
      mvps: 0,
    });
  });
});

describe('calcularLideres (HU-3.4)', () => {
  it('devuelve a los jugadores con más puntos, con desempate por TD, hasta el límite', () => {
    const eventos = [
      {
        id: '1',
        partidoId: 'p1',
        tipoEvento: 'TD',
        jugadorId: 'j1',
        equipoId: A,
      },
      {
        id: '2',
        partidoId: 'p1',
        tipoEvento: 'TD',
        jugadorId: 'j2',
        equipoId: B,
      },
      {
        id: '3',
        partidoId: 'p1',
        tipoEvento: 'PAT2',
        jugadorId: 'j2',
        equipoId: B,
      },
      {
        id: '4',
        partidoId: 'p1',
        tipoEvento: 'PAT1',
        jugadorId: 'j3',
        equipoId: A,
      },
      {
        id: '5',
        partidoId: 'p1',
        tipoEvento: 'TD',
        jugadorId: null,
        equipoId: A,
      }, // sin jugador: no cuenta
    ];
    const lideres = calcularLideres(eventos, 2);
    expect(lideres).toEqual([
      { jugadorId: 'j2', puntos: 8, td: 1, intercepciones: 0 },
      { jugadorId: 'j1', puntos: 6, td: 1, intercepciones: 0 },
    ]);
  });
});

describe('calcularAnotadores (HU-2.7, resumen compartible)', () => {
  it('agrupa puntos por jugador y equipo, deja "sin jugador" aparte y respeta UNDO', () => {
    const eventos = [
      {
        id: '1',
        partidoId: 'p1',
        tipoEvento: 'TD',
        jugadorId: 'j1',
        equipoId: A,
      },
      {
        id: '2',
        partidoId: 'p1',
        tipoEvento: 'PAT1',
        jugadorId: 'j1',
        equipoId: A,
      },
      {
        id: '3',
        partidoId: 'p1',
        tipoEvento: 'TD',
        jugadorId: null,
        equipoId: B,
      },
      {
        id: '4',
        partidoId: 'p1',
        tipoEvento: 'INTERCEPCION',
        jugadorId: 'j2',
        equipoId: B,
      },
      {
        id: '5',
        partidoId: 'p1',
        tipoEvento: 'TD',
        jugadorId: 'j2',
        equipoId: B,
      },
      {
        id: '6',
        partidoId: 'p1',
        tipoEvento: 'UNDO_LAST_ACTION',
        jugadorId: null,
        equipoId: null,
      },
    ];
    expect(calcularAnotadores(eventos)).toEqual([
      { jugadorId: 'j1', equipoId: A, puntos: 7, td: 1 },
      { jugadorId: null, equipoId: B, puntos: 6, td: 1 },
    ]);
  });

  it('sin anotaciones devuelve lista vacía', () => {
    expect(calcularAnotadores([])).toEqual([]);
  });
});
