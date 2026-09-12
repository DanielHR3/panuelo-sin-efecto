import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LigasService } from './ligas.service';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';

const mockPrisma = {
  liga: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockOwnership = { assertCanManageLiga: jest.fn() };

describe('LigasService', () => {
  let service: LigasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LigasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OwnershipService, useValue: mockOwnership },
      ],
    }).compile();

    service = module.get<LigasService>(LigasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const arbitro = { sub: 'user-1', email: 'a@b.c', rol: 'ARBITRO' };
  const superadmin = { sub: 'boss', email: 'x@y.z', rol: 'SUPERADMIN' };

  describe('create', () => {
    it('asigna el propietario al usuario autenticado ignorando el del body', async () => {
      mockPrisma.liga.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l1', ...data }),
      );

      await service.create(
        { nombre: 'Liga X', propietarioId: 'otro-usuario' },
        arbitro,
      );

      expect(mockPrisma.liga.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          nombre: 'Liga X',
          propietarioId: 'user-1',
        }),
      });
    });

    it('permite a un SUPERADMIN fijar el propietario a otro usuario', async () => {
      mockPrisma.liga.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l1', ...data }),
      );

      await service.create(
        { nombre: 'Liga X', propietarioId: 'destinatario' },
        superadmin,
      );

      expect(mockPrisma.liga.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          nombre: 'Liga X',
          propietarioId: 'destinatario',
        }),
      });
    });

    it('HU-1.1: guarda logo y banderas de MVP/intercepciones cuando vienen en el body', async () => {
      mockPrisma.liga.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l1', ...data }),
      );

      await service.create(
        {
          nombre: 'Liga X',
          logoUrl: 'https://cdn.example.com/logo.png',
          registraMvp: false,
          registraIntercepciones: true,
        },
        arbitro,
      );

      expect(mockPrisma.liga.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Liga X',
          propietarioId: 'user-1',
          logoUrl: 'https://cdn.example.com/logo.png',
          registraMvp: false,
          registraIntercepciones: true,
        },
      });
    });

    it('HU-1.1: sin banderas en el body, la liga registra MVP e intercepciones por defecto', async () => {
      mockPrisma.liga.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l1', ...data }),
      );

      await service.create({ nombre: 'Liga X' }, arbitro);

      expect(mockPrisma.liga.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Liga X',
          propietarioId: 'user-1',
          logoUrl: null,
          registraMvp: true,
          registraIntercepciones: true,
        },
      });
    });

    it('traduce el error P2003 de Prisma a un BadRequestException legible', async () => {
      mockPrisma.liga.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('FK constraint failed', {
          code: 'P2003',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create({ nombre: 'Liga X' }, arbitro),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('propaga cualquier otro error sin transformarlo', async () => {
      const boom = new Error('fallo inesperado');
      mockPrisma.liga.create.mockRejectedValueOnce(boom);

      await expect(service.create({ nombre: 'Liga X' }, arbitro)).rejects.toBe(
        boom,
      );
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

  describe('update', () => {
    it('valida la propiedad antes de renombrar', async () => {
      mockPrisma.liga.update.mockResolvedValueOnce({ id: 'l1' });
      await service.update('l1', { nombre: 'Nuevo nombre' }, arbitro);
      expect(mockOwnership.assertCanManageLiga).toHaveBeenCalledWith(
        'l1',
        arbitro,
      );
    });

    it('HU-1.1: permite cambiar solo la configuración sin tocar el nombre', async () => {
      mockPrisma.liga.update.mockResolvedValueOnce({ id: 'l1' });
      await service.update(
        'l1',
        { registraMvp: false, logoUrl: 'https://cdn.example.com/x.png' },
        arbitro,
      );
      expect(mockPrisma.liga.update).toHaveBeenCalledWith({
        where: { id: 'l1' },
        data: { registraMvp: false, logoUrl: 'https://cdn.example.com/x.png' },
      });
    });

    it('HU-1.1: un logoUrl vacío se guarda como null (quitar el logo)', async () => {
      mockPrisma.liga.update.mockResolvedValueOnce({ id: 'l1' });
      await service.update('l1', { logoUrl: '' }, arbitro);
      expect(mockPrisma.liga.update).toHaveBeenCalledWith({
        where: { id: 'l1' },
        data: { logoUrl: null },
      });
    });
  });

  describe('remove', () => {
    it('valida la propiedad y borra', async () => {
      mockPrisma.liga.delete.mockResolvedValueOnce({ id: 'l1' });
      await expect(service.remove('l1', arbitro)).resolves.toEqual({
        id: 'l1',
        deleted: true,
      });
    });

    it('traduce P2003/P2014 (categorías dependientes) a BadRequestException', async () => {
      mockPrisma.liga.delete.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('FK', {
          code: 'P2003',
          clientVersion: 'test',
        }),
      );
      await expect(service.remove('l1', arbitro)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
