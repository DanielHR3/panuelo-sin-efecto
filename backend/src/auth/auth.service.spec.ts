import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { hashPassword } from '../common/hashing';

const mockUsuarios = { findByEmailWithHash: jest.fn() };
const mockJwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosService, useValue: mockUsuarios },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('devuelve un access_token y el payload cuando las credenciales son válidas', async () => {
    mockUsuarios.findByEmailWithHash.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.c',
      rol: 'LIGA_ADMIN',
      passwordHash: hashPassword('clave-buena'),
    });

    const res = await service.login({
      email: 'a@b.c',
      password: 'clave-buena',
    });

    expect(res.access_token).toBe('signed.jwt.token');
    expect(mockJwt.signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'a@b.c',
      rol: 'LIGA_ADMIN',
    });
  });

  it('rechaza con Unauthorized si el email no existe', async () => {
    mockUsuarios.findByEmailWithHash.mockResolvedValueOnce(null);
    await expect(
      service.login({ email: 'x@y.z', password: 'lo-que-sea' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza con Unauthorized si la contraseña no coincide', async () => {
    mockUsuarios.findByEmailWithHash.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.c',
      rol: 'ARBITRO',
      passwordHash: hashPassword('la-correcta'),
    });
    await expect(
      service.login({ email: 'a@b.c', password: 'la-incorrecta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
