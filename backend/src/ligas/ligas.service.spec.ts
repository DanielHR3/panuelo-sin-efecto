import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LigasService } from './ligas.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  liga: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('LigasService', () => {
  let service: LigasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LigasService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LigasService>(LigasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('traduce el error P2003 de Prisma a un BadRequestException legible', async () => {
      mockPrisma.liga.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('FK constraint failed', {
          code: 'P2003',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create({ nombre: 'Liga X', propietarioId: 'no-existe' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('propaga cualquier otro error sin transformarlo', async () => {
      const boom = new Error('fallo inesperado');
      mockPrisma.liga.create.mockRejectedValueOnce(boom);

      await expect(
        service.create({ nombre: 'Liga X', propietarioId: 'abc' }),
      ).rejects.toBe(boom);
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException cuando la liga no existe', async () => {
      mockPrisma.liga.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('inexistente')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
