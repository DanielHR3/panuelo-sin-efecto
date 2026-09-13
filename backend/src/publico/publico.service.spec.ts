import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PublicoService } from './publico.service';
import { PrismaService } from '../prisma/prisma.service';

const A = { id: 'eq-a', nombre: 'Toros', colorPrimario: '#f00' };
const B = { id: 'eq-b', nombre: 'Lobos', colorPrimario: null };

function partido(
  id: string,
  estado: string,
  ml: number,
  mv: number,
  fecha: string,
) {
  return {
    id,
    fechaHora: new Date(fecha),
    estado,
    marcadorLocal: ml,
    marcadorVisitante: mv,
    equipoLocalId: A.id,
    equipoVisitanteId: B.id,
    mvpJugadorId: null,
    equipoLocal: A,
    equipoVisitante: B,
  };
}

const mockPrisma = {
  liga: { findMany: jest.fn() },
  categoria: { findUnique: jest.fn() },
  jugador: { findUnique: jest.fn(), findMany: jest.fn() },
  eventoPartido: { findMany: jest.fn() },
  partido: { count: jest.fn(), findMany: jest.fn() },
};

describe('PublicoService', () => {
  let service: PublicoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.eventoPartido.findMany.mockResolvedValue([]);
    mockPrisma.jugador.findMany.mockResolvedValue([]);
    mockPrisma.partido.count.mockResolvedValue(0);
    mockPrisma.partido.findMany.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(PublicoService);
  });

  describe('resumen', () => {
    it('arma tabla, recientes, próximos y líderes por categoría', async () => {
      mockPrisma.liga.findMany.mockResolvedValueOnce([
        {
          id: 'l1',
          nombre: 'Liga Metro',
          logoUrl: null,
          categorias: [
            {
              id: 'c1',
              nombre: 'Varonil',
              equipos: [A, B],
              partidos: [
                partido('p2', 'PROGRAMADO', 0, 0, '2026-10-01T18:00:00Z'),
                partido('p1', 'FINALIZADO', 12, 6, '2026-09-20T18:00:00Z'),
              ],
            },
          ],
        },
      ]);
      mockPrisma.eventoPartido.findMany.mockResolvedValueOnce([
        {
          id: 'e1',
          partidoId: 'p1',
          tipoEvento: 'TD',
          jugadorId: 'j1',
          equipoId: A.id,
        },
        {
          id: 'e2',
          partidoId: 'p1',
          tipoEvento: 'TD',
          jugadorId: 'j1',
          equipoId: A.id,
        },
        {
          id: 'e3',
          partidoId: 'p1',
          tipoEvento: 'UNDO_LAST_ACTION',
          jugadorId: null,
          equipoId: null,
        },
        {
          id: 'e4',
          partidoId: 'p1',
          tipoEvento: 'TD',
          jugadorId: 'j2',
          equipoId: B.id,
        },
      ]);
      mockPrisma.jugador.findMany.mockResolvedValueOnce([
        { id: 'j1', nombre: 'Ana', numeroJersey: '7', equipo: A },
        { id: 'j2', nombre: 'Beto', numeroJersey: '9', equipo: B },
      ]);

      const { ligas } = await service.resumen();
      const cat = ligas[0].categorias[0];

      expect(cat.tabla.map((f) => [f.equipoId, f.pts])).toEqual([
        ['eq-a', 3],
        ['eq-b', 0],
      ]);
      expect(cat.recientes.map((p) => p.id)).toEqual(['p1']);
      expect(cat.proximos.map((p) => p.id)).toEqual(['p2']);
      // El UNDO cancela el segundo TD de j1: quedan 6 puntos para cada uno,
      // empate en TD, desempate estable por id.
      expect(cat.lideres.map((l) => [l.jugadorId, l.puntos, l.nombre])).toEqual(
        [
          ['j1', 6, 'Ana'],
          ['j2', 6, 'Beto'],
        ],
      );
      // No se filtran ids internos de equipo en los partidos públicos.
      expect(cat.recientes[0]).not.toHaveProperty('equipoLocalId');
    });

    it('sin ligas devuelve una lista vacía y no consulta eventos', async () => {
      mockPrisma.liga.findMany.mockResolvedValueOnce([]);
      const { ligas } = await service.resumen();
      expect(ligas).toEqual([]);
      expect(mockPrisma.eventoPartido.findMany).not.toHaveBeenCalled();
    });

    it('excluye las ligas RAPIDA de los árbitros invitados (HU-2.7)', async () => {
      mockPrisma.liga.findMany.mockResolvedValueOnce([]);
      await service.resumen();
      const [arg] = mockPrisma.liga.findMany.mock.calls[0] as [
        { where: { tipo: string } },
      ];
      expect(arg.where).toEqual({ tipo: 'LIGA' });
    });
  });

  describe('jugador', () => {
    it('lanza NotFound si no existe', async () => {
      mockPrisma.jugador.findUnique.mockResolvedValueOnce(null);
      await expect(service.jugador('nadie')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('devuelve el perfil con estadísticas, MVPs y línea por partido', async () => {
      mockPrisma.jugador.findUnique.mockResolvedValueOnce({
        id: 'j1',
        nombre: 'Ana',
        numeroJersey: '7',
        equipo: {
          ...A,
          categoria: {
            id: 'c1',
            nombre: 'Varonil',
            liga: { id: 'l1', nombre: 'Liga Metro', logoUrl: null },
          },
        },
      });
      mockPrisma.eventoPartido.findMany.mockResolvedValueOnce([
        {
          id: 'e1',
          partidoId: 'p1',
          tipoEvento: 'TD',
          jugadorId: 'j1',
          equipoId: A.id,
        },
        {
          id: 'e2',
          partidoId: 'p1',
          tipoEvento: 'PAT1',
          jugadorId: 'j1',
          equipoId: A.id,
        },
        {
          id: 'e3',
          partidoId: 'p1',
          tipoEvento: 'INTERCEPCION',
          jugadorId: 'j1',
          equipoId: A.id,
        },
      ]);
      mockPrisma.partido.count.mockResolvedValueOnce(1);
      mockPrisma.partido.findMany.mockResolvedValueOnce([
        {
          ...partido('p1', 'FINALIZADO', 12, 6, '2026-09-20T18:00:00Z'),
          mvpJugadorId: 'j1',
        },
      ]);

      const perfil = await service.jugador('j1');
      expect(perfil.liga.nombre).toBe('Liga Metro');
      expect(perfil.equipo).toEqual(A);
      expect(perfil.estadisticas).toMatchObject({
        td: 1,
        pat1: 1,
        intercepciones: 1,
        puntos: 7,
        partidos: 1,
        mvps: 1,
      });
      expect(perfil.partidos[0]).toMatchObject({
        id: 'p1',
        esMvp: true,
        puntos: 7,
        td: 1,
      });
    });
  });
});

describe('PublicoService.partido (resumen compartible, HU-2.7)', () => {
  let service: PublicoService;
  const mockPrisma2 = {
    partido: { findUnique: jest.fn() },
    eventoPartido: { findMany: jest.fn() },
    jugador: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicoService,
        { provide: PrismaService, useValue: mockPrisma2 },
      ],
    }).compile();
    service = module.get(PublicoService);
  });

  it('lanza NotFound si no existe', async () => {
    mockPrisma2.partido.findUnique.mockResolvedValueOnce(null);
    await expect(service.partido('nada')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('devuelve marcador, anotadores con nombre, MVP y árbitros sin correo', async () => {
    mockPrisma2.partido.findUnique.mockResolvedValueOnce({
      ...partido('p1', 'FINALIZADO', 13, 6, '2026-09-20T18:00:00Z'),
      mvpJugadorId: 'j1',
      categoria: {
        id: 'c1',
        nombre: 'Partidos rápidos',
        liga: {
          id: 'l1',
          nombre: 'Partidos rápidos de Beto',
          logoUrl: null,
          tipo: 'RAPIDA',
        },
      },
      mvpJugador: {
        id: 'j1',
        nombre: 'Ana',
        numeroJersey: '7',
        equipoId: A.id,
      },
      asignaciones: [{ rolEnCampo: 'Referee', arbitro: { nombre: 'Beto' } }],
    });
    mockPrisma2.eventoPartido.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        partidoId: 'p1',
        tipoEvento: 'TD',
        jugadorId: 'j1',
        equipoId: A.id,
      },
      {
        id: 'e2',
        partidoId: 'p1',
        tipoEvento: 'PAT1',
        jugadorId: 'j1',
        equipoId: A.id,
      },
      {
        id: 'e3',
        partidoId: 'p1',
        tipoEvento: 'TD',
        jugadorId: null,
        equipoId: A.id,
      },
      {
        id: 'e4',
        partidoId: 'p1',
        tipoEvento: 'TD',
        jugadorId: 'j2',
        equipoId: B.id,
      },
    ]);
    mockPrisma2.jugador.findMany.mockResolvedValueOnce([
      { id: 'j1', nombre: 'Ana', numeroJersey: '7' },
      { id: 'j2', nombre: 'Beto L.', numeroJersey: '9' },
    ]);

    const r = await service.partido('p1');
    expect(r).toMatchObject({
      id: 'p1',
      marcadorLocal: 13,
      marcadorVisitante: 6,
      liga: { nombre: 'Partidos rápidos de Beto', esRapida: true },
      mvp: { id: 'j1', nombre: 'Ana' },
      arbitros: [{ nombre: 'Beto', rolEnCampo: 'Referee' }],
    });
    expect(r).not.toHaveProperty('equipoLocalId');
    expect(JSON.stringify(r)).not.toContain('@');
    // Empate a 6: el jugador con nombre va antes que "sin jugador".
    expect(r.anotadores).toEqual([
      {
        jugadorId: 'j1',
        equipoId: A.id,
        puntos: 7,
        td: 1,
        nombre: 'Ana',
        numeroJersey: '7',
      },
      {
        jugadorId: 'j2',
        equipoId: B.id,
        puntos: 6,
        td: 1,
        nombre: 'Beto L.',
        numeroJersey: '9',
      },
      {
        jugadorId: null,
        equipoId: A.id,
        puntos: 6,
        td: 1,
        nombre: null,
        numeroJersey: null,
      },
    ]);
  });
});
