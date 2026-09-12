import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
import { verifyPassword } from '../common/hashing';

const mockPrisma = {
  usuario: {
    create: jest.fn(),
    findUnique: jest.fn(),
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
});
