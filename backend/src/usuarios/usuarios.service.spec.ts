import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
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

describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrisma },
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

      await service.create({
        nombre: 'Ana',
        email: 'ana@liga.mx',
        password: 'secreto12',
        rol: 'ARBITRO',
      });

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
        service.create({
          nombre: 'Ana',
          email: 'ana@liga.mx',
          password: 'secreto12',
          rol: 'ARBITRO',
        }),
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

    it('LIGA_ADMIN: solo árbitros con cuenta (sin invitados) y sin email', async () => {
      mockPrisma.usuario.findMany.mockResolvedValueOnce([]);
      await service.findAll(ligaAdmin, 'ARBITRO');
      const [[arg]] = mockPrisma.usuario.findMany.mock.calls as [
        [{ where: unknown; select: Record<string, unknown> }],
      ];
      expect(arg.where).toEqual({ rol: 'ARBITRO', esInvitado: false });
      expect(arg.select).not.toHaveProperty('email');
      expect(arg.select).not.toHaveProperty('passwordHash');
      expect(arg.select).toMatchObject({ id: true, nombre: true });
    });

    it('LIGA_ADMIN: ignora el filtro de rol y nunca lista admins', async () => {
      mockPrisma.usuario.findMany.mockResolvedValueOnce([]);
      await service.findAll(ligaAdmin);
      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { rol: 'ARBITRO', esInvitado: false },
        }),
      );
      mockPrisma.usuario.findMany.mockResolvedValueOnce([]);
      await service.findAll(ligaAdmin, 'SUPERADMIN');
      expect(mockPrisma.usuario.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { rol: 'ARBITRO', esInvitado: false },
        }),
      );
    });
  });
});
