import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { verifyPassword } from '../common/hashing';
import { AuthUser } from '../common/decorators/current-user.decorator';

const superadmin: AuthUser = {
  sub: 'boss',
  email: 's@x.mx',
  rol: 'SUPERADMIN',
};
const ligaAdmin: AuthUser = { sub: 'adm', email: 'a@x.mx', rol: 'LIGA_ADMIN' };

const mockPrisma = {
  usuario: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};
const mockOwnership = { assertCanManageLiga: jest.fn() };

describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OwnershipService, useValue: mockOwnership },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('hashea la contraseña antes de persistirla y no la devuelve en claro', async () => {
      mockPrisma.usuario.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'u1', ...data }),
      );

      await service.create(
        {
          nombre: 'Ana',
          email: 'ana@liga.mx',
          password: 'secreto12',
          rol: 'ARBITRO',
        },
        superadmin,
      );

      const [[call]] = mockPrisma.usuario.create.mock.calls as unknown[][];
      const { data } = call as { data: { passwordHash: string } };
      expect(data.passwordHash).not.toContain('secreto12');
      expect(verifyPassword('secreto12', data.passwordHash)).toBe(true);
    });

    it('traduce el email duplicado (P2002) a ConflictException', async () => {
      mockPrisma.usuario.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create(
          {
            nombre: 'Ana',
            email: 'ana@liga.mx',
            password: 'secreto12',
            rol: 'ARBITRO',
          },
          superadmin,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findById', () => {
    it('lanza NotFoundException si no existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
      await expect(service.findById('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('SUPERADMIN sin rol: consulta sin filtro de where, con email', async () => {
      mockPrisma.usuario.findMany.mockResolvedValueOnce([]);
      await service.findAll(superadmin);
      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
          select: expect.objectContaining({ email: true }) as object,
        }),
      );
    });

    it('SUPERADMIN con rol: filtra por ese rol (invitados incluidos)', async () => {
      mockPrisma.usuario.findMany.mockResolvedValueOnce([]);
      await service.findAll(superadmin, 'ARBITRO');
      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { rol: 'ARBITRO' } }),
      );
    });

    it('LIGA_ADMIN: solo los árbitros de SUS ligas, con email y su liga', async () => {
      mockPrisma.usuario.findMany.mockResolvedValueOnce([]);
      await service.findAll(ligaAdmin, 'ARBITRO');
      const [[arg]] = mockPrisma.usuario.findMany.mock.calls as [
        [{ where: unknown; select: Record<string, unknown> }],
      ];
      expect(arg.where).toEqual({
        rol: 'ARBITRO',
        esInvitado: false,
        ligaArbitro: { propietarioId: 'adm' },
      });
      expect(arg.select).not.toHaveProperty('passwordHash');
      expect(arg.select).toMatchObject({ id: true, nombre: true, email: true });
      expect(arg.select).toHaveProperty('ligaArbitro');
    });

    it('LIGA_ADMIN: ignora el filtro de rol y nunca lista admins', async () => {
      mockPrisma.usuario.findMany.mockResolvedValueOnce([]);
      await service.findAll(ligaAdmin, 'SUPERADMIN');
      expect(mockPrisma.usuario.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ rol: 'ARBITRO' }) as object,
        }),
      );
    });
  });
});

describe('UsuariosService.create (árbitros por liga)', () => {
  let service: UsuariosService;
  const dto = {
    nombre: 'Ana',
    email: 'ana@liga.mx',
    password: 'contraseña-123',
    rol: 'ARBITRO' as const,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.usuario.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'u1', ...data }),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OwnershipService, useValue: mockOwnership },
      ],
    }).compile();
    service = module.get(UsuariosService);
  });

  it('LIGA_ADMIN crea un árbitro en una liga suya', async () => {
    await service.create({ ...dto, ligaId: 'liga-1' }, ligaAdmin);
    expect(mockOwnership.assertCanManageLiga).toHaveBeenCalledWith(
      'liga-1',
      ligaAdmin,
    );
    const [[arg]] = mockPrisma.usuario.create.mock.calls as [
      [{ data: Record<string, unknown> }],
    ];
    expect(arg.data).toMatchObject({ rol: 'ARBITRO', ligaArbitroId: 'liga-1' });
  });

  it('LIGA_ADMIN no puede crear un árbitro sin liga', async () => {
    await expect(service.create(dto, ligaAdmin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockPrisma.usuario.create).not.toHaveBeenCalled();
  });

  it('LIGA_ADMIN no puede crear admins', async () => {
    await expect(
      service.create(
        { ...dto, rol: 'LIGA_ADMIN', ligaId: 'liga-1' },
        ligaAdmin,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockPrisma.usuario.create).not.toHaveBeenCalled();
  });

  it('LIGA_ADMIN no puede crear árbitros en una liga ajena', async () => {
    mockOwnership.assertCanManageLiga.mockRejectedValueOnce(
      new ForbiddenException(),
    );
    await expect(
      service.create({ ...dto, ligaId: 'ajena' }, ligaAdmin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockPrisma.usuario.create).not.toHaveBeenCalled();
  });

  it('SUPERADMIN puede crear un árbitro sin liga o un admin', async () => {
    await service.create(dto, superadmin);
    await service.create(
      { ...dto, rol: 'LIGA_ADMIN', email: 'b@x.mx' },
      superadmin,
    );
    expect(mockPrisma.usuario.create).toHaveBeenCalledTimes(2);
    expect(mockOwnership.assertCanManageLiga).not.toHaveBeenCalled();
  });

  it('una liga solo se puede indicar para árbitros', async () => {
    await expect(
      service.create(
        { ...dto, rol: 'LIGA_ADMIN', ligaId: 'liga-1' },
        superadmin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
