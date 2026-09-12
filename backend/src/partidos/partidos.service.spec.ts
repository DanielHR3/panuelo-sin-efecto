import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PartidosService } from './partidos.service';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' };

const mockPrisma = {
  partido: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  equipo: { findMany: jest.fn() },
  usuario: { findUnique: jest.fn() },
  jugador: { findUnique: jest.fn() },
  asignacionArbitral: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
};
const mockOwnership = {
  assertCanManageCategoria: jest.fn(),
  assertCanManagePartido: jest.fn(),
};

const baseDto = {
  fechaHora: '2026-09-20T18:00:00.000Z',
  dificultad: 'REGULAR' as const,
  equipoLocalId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  equipoVisitanteId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
};

describe('PartidosService', () => {
  let service: PartidosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartidosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OwnershipService, useValue: mockOwnership },
      ],
    }).compile();
    service = module.get(PartidosService);
  });

  describe('create', () => {
    it('rechaza si local y visitante son el mismo equipo', async () => {
      await expect(
        service.create(
          'cat-1',
          { ...baseDto, equipoVisitanteId: baseDto.equipoLocalId },
          user,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza si algún equipo no pertenece a la categoría', async () => {
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { id: baseDto.equipoLocalId },
      ]);
      await expect(
        service.create('cat-1', baseDto, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crea el partido en estado PROGRAMADO cuando los equipos son válidos', async () => {
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { id: baseDto.equipoLocalId },
        { id: baseDto.equipoVisitanteId },
      ]);
      mockPrisma.partido.create.mockResolvedValueOnce({ id: 'p1' });

      await service.create('cat-1', baseDto, user);

      expect(mockOwnership.assertCanManageCategoria).toHaveBeenCalledWith(
        'cat-1',
        user,
      );
      const [[arg]] = mockPrisma.partido.create.mock.calls as unknown[][];
      const { data } = arg as { data: { estado: string } };
      expect(data.estado).toBe('PROGRAMADO');
    });
  });

  describe('update', () => {
    it('permite avanzar PROGRAMADO → EN_CURSO', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce({
        estado: 'PROGRAMADO',
      });
      mockPrisma.partido.update.mockResolvedValueOnce({ id: 'p1' });
      await service.update('p1', { estado: 'EN_CURSO' }, user);
      expect(mockPrisma.partido.update).toHaveBeenCalled();
    });

    it('rechaza retroceder FINALIZADO → EN_CURSO', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce({
        estado: 'FINALIZADO',
      });
      await expect(
        service.update('p1', { estado: 'EN_CURSO' }, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('asignarArbitro', () => {
    it('rechaza si el usuario no tiene rol ARBITRO', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValueOnce({
        rol: 'LIGA_ADMIN',
      });
      await expect(
        service.asignarArbitro(
          'p1',
          { arbitroId: 'x', rolEnCampo: 'Referee' },
          user,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('hace upsert de la asignación para un ARBITRO válido', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValueOnce({ rol: 'ARBITRO' });
      mockPrisma.asignacionArbitral.upsert.mockResolvedValueOnce({});
      await service.asignarArbitro(
        'p1',
        { arbitroId: 'ref-1', rolEnCampo: 'Umpire' },
        user,
      );
      expect(mockOwnership.assertCanManagePartido).toHaveBeenCalledWith(
        'p1',
        user,
      );
      expect(mockPrisma.asignacionArbitral.upsert).toHaveBeenCalled();
    });
  });

  it('findAsignados() filtra por asignaciones.some.arbitroId', async () => {
    mockPrisma.partido.findMany.mockResolvedValueOnce([]);
    await service.findAsignados('ref-1');
    expect(mockPrisma.partido.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { asignaciones: { some: { arbitroId: 'ref-1' } } },
      }),
    );
  });

  it('findOne() lanza NotFound si no existe', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findOne() incluye las asignaciones con los datos públicos del árbitro', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce({ id: 'p1' });
    await service.findOne('p1');
    const [arg] = mockPrisma.partido.findUnique.mock.calls[0] as [
      { include: { asignaciones: unknown } },
    ];
    expect(arg.include.asignaciones).toEqual({
      include: { arbitro: { select: { id: true, nombre: true, email: true } } },
    });
  });

  it('findOne() incluye el jugador elegido como MVP', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce({ id: 'p1' });
    await service.findOne('p1');
    const [arg] = mockPrisma.partido.findUnique.mock.calls[0] as [
      { include: { mvpJugador: unknown } },
    ];
    expect(arg.include.mvpJugador).toBe(true);
  });

  it('findAllByCategoria() incluye las asignaciones con los datos públicos del árbitro', async () => {
    mockPrisma.partido.findMany.mockResolvedValueOnce([]);
    await service.findAllByCategoria('cat-1');
    const [arg] = mockPrisma.partido.findMany.mock.calls[0] as [
      { include: { asignaciones: unknown } },
    ];
    expect(arg.include.asignaciones).toEqual({
      include: { arbitro: { select: { id: true, nombre: true, email: true } } },
    });
  });

  describe('setMvp', () => {
    const LOCAL_ID = 'equipo-local';
    const VISITA_ID = 'equipo-visitante';
    const arbitroAsignado: AuthUser = {
      sub: 'ref-1',
      email: 'r@r.mx',
      rol: 'ARBITRO',
    };
    const arbitroAjeno: AuthUser = {
      sub: 'ref-2',
      email: 'r2@r.mx',
      rol: 'ARBITRO',
    };
    const superadmin: AuthUser = {
      sub: 'boss',
      email: 'x@y.z',
      rol: 'SUPERADMIN',
    };

    function partidoBase(estado: string) {
      return {
        estado,
        equipoLocalId: LOCAL_ID,
        equipoVisitanteId: VISITA_ID,
        categoria: { liga: { propietarioId: 'liga-admin-dueno' } },
        asignaciones: [{ arbitroId: 'ref-1' }],
      };
    }

    it('lanza NotFound si el partido no existe', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.setMvp('p1', { jugadorId: 'j1' }, arbitroAsignado),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza a un árbitro no asignado ni dueño', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(
        partidoBase('FINALIZADO'),
      );
      await expect(
        service.setMvp('p1', { jugadorId: 'j1' }, arbitroAjeno),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza si el partido no está FINALIZADO', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(
        partidoBase('EN_CURSO'),
      );
      await expect(
        service.setMvp('p1', { jugadorId: 'j1' }, arbitroAsignado),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza si el jugador no pertenece a ninguno de los dos equipos', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(
        partidoBase('FINALIZADO'),
      );
      mockPrisma.jugador.findUnique.mockResolvedValueOnce({
        equipoId: 'otro-equipo',
      });
      await expect(
        service.setMvp('p1', { jugadorId: 'j1' }, arbitroAsignado),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza si el jugador no existe', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(
        partidoBase('FINALIZADO'),
      );
      mockPrisma.jugador.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.setMvp('p1', { jugadorId: 'j1' }, arbitroAsignado),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('permite al árbitro asignado elegir un jugador del equipo visitante', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(
        partidoBase('FINALIZADO'),
      );
      mockPrisma.jugador.findUnique.mockResolvedValueOnce({
        equipoId: VISITA_ID,
      });
      mockPrisma.partido.update.mockResolvedValueOnce({ id: 'p1' });

      await service.setMvp('p1', { jugadorId: 'j1' }, arbitroAsignado);

      expect(mockPrisma.partido.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: { mvpJugadorId: 'j1' },
        }),
      );
    });

    it('permite al dueño de la liga aunque no esté asignado como árbitro', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(
        partidoBase('FINALIZADO'),
      );
      mockPrisma.jugador.findUnique.mockResolvedValueOnce({
        equipoId: LOCAL_ID,
      });
      mockPrisma.partido.update.mockResolvedValueOnce({ id: 'p1' });

      await expect(
        service.setMvp(
          'p1',
          { jugadorId: 'j1' },
          { sub: 'liga-admin-dueno', email: 'd@d.mx', rol: 'LIGA_ADMIN' },
        ),
      ).resolves.toBeDefined();
    });

    it('permite al SUPERADMIN aunque no esté asignado ni sea dueño', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(
        partidoBase('FINALIZADO'),
      );
      mockPrisma.jugador.findUnique.mockResolvedValueOnce({
        equipoId: LOCAL_ID,
      });
      mockPrisma.partido.update.mockResolvedValueOnce({ id: 'p1' });

      await expect(
        service.setMvp('p1', { jugadorId: 'j1' }, superadmin),
      ).resolves.toBeDefined();
    });
  });
});
