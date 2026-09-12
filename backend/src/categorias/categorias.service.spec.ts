import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' };

const mockPrisma = {
  categoria: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockOwnership = {
  assertCanManageLiga: jest.fn(),
  assertCanManageCategoria: jest.fn(),
};

describe('CategoriasService', () => {
  let service: CategoriasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OwnershipService, useValue: mockOwnership },
      ],
    }).compile();
    service = module.get(CategoriasService);
  });

  it('create() valida la propiedad de la liga antes de insertar', async () => {
    mockPrisma.categoria.create.mockResolvedValueOnce({ id: 'c1' });
    await service.create('liga-1', { nombre: 'Varonil' }, user);
    expect(mockOwnership.assertCanManageLiga).toHaveBeenCalledWith(
      'liga-1',
      user,
    );
    expect(mockPrisma.categoria.create).toHaveBeenCalledWith({
      data: { nombre: 'Varonil', ligaId: 'liga-1' },
    });
  });

  it('findOne() lanza NotFound si no existe', async () => {
    mockPrisma.categoria.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update() valida la propiedad de la categoría', async () => {
    mockPrisma.categoria.update.mockResolvedValueOnce({ id: 'c1' });
    await service.update('c1', { nombre: 'Femenil' }, user);
    expect(mockOwnership.assertCanManageCategoria).toHaveBeenCalledWith(
      'c1',
      user,
    );
  });

  it('remove() valida la propiedad y borra', async () => {
    mockPrisma.categoria.delete.mockResolvedValueOnce({ id: 'c1' });
    await expect(service.remove('c1', user)).resolves.toEqual({
      id: 'c1',
      deleted: true,
    });
    expect(mockOwnership.assertCanManageCategoria).toHaveBeenCalledWith(
      'c1',
      user,
    );
  });
});
