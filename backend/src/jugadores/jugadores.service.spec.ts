import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JugadoresService } from './jugadores.service';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' };
const mockPrisma = {
  jugador: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockOwnership = {
  assertCanManageEquipo: jest.fn(),
  assertCanManageJugador: jest.fn(),
};

describe('JugadoresService', () => {
  let service: JugadoresService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JugadoresService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OwnershipService, useValue: mockOwnership },
      ],
    }).compile();
    service = module.get(JugadoresService);
  });

  it('create() valida la propiedad del equipo e inserta con equipoId', async () => {
    mockPrisma.jugador.create.mockResolvedValueOnce({ id: 'j1' });
    await service.create(
      'eq-1',
      { nombre: 'A. Pérez', numeroJersey: '12' },
      user,
    );
    expect(mockOwnership.assertCanManageEquipo).toHaveBeenCalledWith(
      'eq-1',
      user,
    );
    expect(mockPrisma.jugador.create).toHaveBeenCalledWith({
      data: { nombre: 'A. Pérez', numeroJersey: '12', equipoId: 'eq-1' },
    });
  });

  it('findOne() lanza NotFound si no existe', async () => {
    mockPrisma.jugador.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update() valida la propiedad del jugador', async () => {
    mockPrisma.jugador.update.mockResolvedValueOnce({ id: 'j1' });
    await service.update('j1', { numeroJersey: '99' }, user);
    expect(mockOwnership.assertCanManageJugador).toHaveBeenCalledWith(
      'j1',
      user,
    );
  });
});
