import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LigasService } from './ligas.service';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const mockPrisma = {
  liga: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  suscripcion: { count: jest.fn() },
  pruebaUsada: { count: jest.fn().mockResolvedValue(0) },
  $transaction: jest.fn(),
};
const mockOwnership = {
  assertCanManageLiga: jest.fn(),
  // Regla real: el filtro es puro y no toca Prisma.
  filtroLigasVisibles: jest.fn((u: AuthUser) =>
    OwnershipService.prototype.filtroLigasVisibles.call(null, u),
  ),
};

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
    beforeEach(() => mockPrisma.suscripcion.count.mockResolvedValue(0));

    it('la primera liga de un organizador nace con 30 días de prueba', async () => {
      mockPrisma.liga.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l1', ...data }),
      );
      await service.create({ nombre: 'Liga X' }, arbitro);
      const [[arg]] = mockPrisma.liga.create.mock.calls as [
        [
          {
            data: {
              suscripcion: {
                create: { plan: string; pruebaHasta: Date | null };
              };
            };
          },
        ],
      ];
      expect(arg.data.suscripcion.create.plan).toBe('COMPLETO');
      expect(arg.data.suscripcion.create.pruebaHasta).toBeInstanceOf(Date);
    });

    it('si el organizador ya tuvo prueba, la liga nueva nace sin prueba', async () => {
      mockPrisma.suscripcion.count.mockResolvedValueOnce(1);
      mockPrisma.liga.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l2', ...data }),
      );
      await service.create({ nombre: 'Otra liga' }, arbitro);
      const [[arg]] = mockPrisma.liga.create.mock.calls as [
        [{ data: { suscripcion: { create: { pruebaHasta: Date | null } } } }],
      ];
      expect(arg.data.suscripcion.create.pruebaHasta).toBeNull();
      expect(mockPrisma.suscripcion.count).toHaveBeenCalledWith({
        where: {
          pruebaHasta: { not: null },
          liga: { propietarioId: 'user-1' },
        },
      });
    });

    it('si su correo ya usó la prueba en una liga borrada, la liga nueva nace sin prueba', async () => {
      mockPrisma.pruebaUsada.count.mockResolvedValueOnce(1);
      mockPrisma.liga.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l4', ...data }),
      );
      await service.create({ nombre: 'Liga nueva' }, arbitro);
      const [[arg]] = mockPrisma.liga.create.mock.calls as [
        [{ data: { suscripcion: { create: { pruebaHasta: Date | null } } } }],
      ];
      expect(arg.data.suscripcion.create.pruebaHasta).toBeNull();
      expect(mockPrisma.pruebaUsada.count).toHaveBeenCalledWith({
        where: { email: arbitro.email.toLowerCase() },
      });
    });

    it('las ligas que crea un SUPERADMIN son de cortesía', async () => {
      mockPrisma.liga.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l3', ...data }),
      );
      await service.create({ nombre: 'Liga Z' }, superadmin);
      const [[arg]] = mockPrisma.liga.create.mock.calls as [
        [{ data: { suscripcion: { create: { plan: string } } } }],
      ];
      expect(arg.data.suscripcion.create.plan).toBe('CORTESIA');
    });

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          nombre: 'Liga X',
          propietarioId: 'user-1',
          logoUrl: 'https://cdn.example.com/logo.png',
          registraMvp: false,
          registraIntercepciones: true,
        }),
      });
    });

    it('HU-1.1: sin banderas en el body, la liga registra MVP e intercepciones por defecto', async () => {
      mockPrisma.liga.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l1', ...data }),
      );

      await service.create({ nombre: 'Liga X' }, arbitro);

      expect(mockPrisma.liga.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          nombre: 'Liga X',
          propietarioId: 'user-1',
          logoUrl: null,
          registraMvp: true,
          registraIntercepciones: true,
        }),
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

  describe('findAll', () => {
    const ligaAdmin = { sub: 'admin-1', email: 'a@x.mx', rol: 'LIGA_ADMIN' };

    it('un LIGA_ADMIN solo lista sus ligas y nunca las RAPIDA', async () => {
      mockPrisma.liga.findMany.mockResolvedValueOnce([]);
      await service.findAll(ligaAdmin);
      expect(mockPrisma.liga.findMany).toHaveBeenCalledWith({
        where: { propietarioId: 'admin-1', tipo: 'LIGA' },
        include: { categorias: true, suscripcion: true },
      });
    });

    it('cada liga trae el estado de su suscripción calculado', async () => {
      mockPrisma.liga.findMany.mockResolvedValueOnce([
        {
          id: 'l1',
          suscripcion: {
            plan: 'CORTESIA',
            pruebaHasta: null,
            pagadoHasta: null,
          },
        },
        { id: 'r1', suscripcion: null },
      ]);
      const ligas = await service.findAll(ligaAdmin);
      expect(ligas[0].suscripcion).toMatchObject({ estado: 'CORTESIA' });
      expect(ligas[1].suscripcion).toBeNull();
    });

    it('un SUPERADMIN lista todas las ligas, con nombre y correo del organizador', async () => {
      mockPrisma.liga.findMany.mockResolvedValueOnce([]);
      await service.findAll(superadmin);
      expect(mockPrisma.liga.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          categorias: true,
          suscripcion: true,
          propietario: { select: { nombre: true, email: true } },
        },
      });
    });
  });

  describe('findOne', () => {
    it('valida la propiedad antes de leer', async () => {
      mockPrisma.liga.findUnique.mockResolvedValueOnce({ id: 'l1' });
      await service.findOne('l1', arbitro);
      expect(mockOwnership.assertCanManageLiga).toHaveBeenCalledWith(
        'l1',
        arbitro,
      );
    });

    it('propaga el 403 de una liga ajena sin consultarla', async () => {
      mockOwnership.assertCanManageLiga.mockRejectedValueOnce(
        new ForbiddenException(),
      );
      await expect(service.findOne('l1', arbitro)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mockPrisma.liga.findUnique).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException cuando la liga no existe', async () => {
      mockPrisma.liga.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.findOne('inexistente', superadmin),
      ).rejects.toBeInstanceOf(NotFoundException);
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

  describe('remove (SUPERADMIN)', () => {
    const superadmin: AuthUser = {
      sub: 's1',
      email: 's@x.mx',
      rol: 'SUPERADMIN',
    };

    it('exige escribir el nombre exacto de la liga y no borra nada si no coincide', async () => {
      mockPrisma.liga.findUnique.mockResolvedValue({
        nombre: 'Liga del Valle',
      });
      await expect(
        service.remove('l1', superadmin, { confirmar: 'liga del valle' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.remove('l1', superadmin)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('con el nombre correcto borra todo en una transacción y devuelve el resumen', async () => {
      mockPrisma.liga.findUnique.mockResolvedValue({
        nombre: 'Liga del Valle',
      });
      mockPrisma.$transaction.mockResolvedValue({ liga: 'Liga del Valle' });
      await expect(
        service.remove('l1', superadmin, { confirmar: ' Liga del Valle ' }),
      ).resolves.toEqual({
        id: 'l1',
        deleted: true,
        resumen: { liga: 'Liga del Valle' },
      });
      expect(mockPrisma.liga.delete).not.toHaveBeenCalled();
    });

    it('404 si la liga no existe', async () => {
      mockPrisma.liga.findUnique.mockResolvedValue(null);
      await expect(
        service.remove('l1', superadmin, { confirmar: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
