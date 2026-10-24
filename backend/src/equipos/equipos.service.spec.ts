import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EquiposService } from './equipos.service';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { PlanService } from '../suscripciones/plan.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' };
const mockPrisma = {
  equipo: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockOwnership = {
  assertCanManageCategoria: jest.fn(),
  assertCanManageEquipo: jest.fn(),
};

describe('EquiposService', () => {
  let service: EquiposService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquiposService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OwnershipService, useValue: mockOwnership },
        {
          provide: PlanService,
          useValue: {
            assertPermite: jest.fn(),
            assertPermiteEnCategoria: jest.fn(),
            assertPermiteEnEquipo: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(EquiposService);
  });

  it('create() valida la propiedad de la categoría e inserta con categoriaId', async () => {
    mockPrisma.equipo.create.mockResolvedValueOnce({ id: 'e1' });
    await service.create('cat-1', { nombre: 'Dragones' }, user);
    expect(mockOwnership.assertCanManageCategoria).toHaveBeenCalledWith(
      'cat-1',
      user,
    );
    expect(mockPrisma.equipo.create).toHaveBeenCalledWith({
      data: { nombre: 'Dragones', categoriaId: 'cat-1' },
    });
  });

  it('findOne() lanza NotFound si no existe', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('x', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findOne() de un equipo ajeno propaga el 403', async () => {
    mockOwnership.assertCanManageEquipo.mockRejectedValueOnce(
      new ForbiddenException(),
    );
    await expect(service.findOne('e1', user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(mockPrisma.equipo.findUnique).not.toHaveBeenCalled();
  });

  it('findAllByCategoria() valida la propiedad de la categoría', async () => {
    mockPrisma.equipo.findMany.mockResolvedValueOnce([]);
    await service.findAllByCategoria('cat-1', user);
    expect(mockOwnership.assertCanManageCategoria).toHaveBeenCalledWith(
      'cat-1',
      user,
    );
  });

  it('remove() valida la propiedad del equipo', async () => {
    mockPrisma.equipo.delete.mockResolvedValueOnce({ id: 'e1' });
    await service.remove('e1', user);
    expect(mockOwnership.assertCanManageEquipo).toHaveBeenCalledWith(
      'e1',
      user,
    );
  });
});
