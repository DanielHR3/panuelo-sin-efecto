import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
});
