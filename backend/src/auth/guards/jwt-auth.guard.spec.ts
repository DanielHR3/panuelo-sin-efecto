import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

function context(headers: Record<string, string>): ExecutionContext {
  const req: { headers: Record<string, string>; user?: unknown } = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
    __req: req,
  } as unknown as ExecutionContext & { __req: typeof req };
}

function usuarioDe(ctx: ExecutionContext) {
  return (ctx as unknown as { __req: { user: unknown } }).__req.user;
}

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let jwt: { verifyAsync: jest.Mock };
  let prisma: { usuario: { findUnique: jest.Mock } };
  let guard: JwtAuthGuard;
  const payload = { sub: 'u1', email: 'a@b.c', rol: 'ARBITRO' };

  beforeEach(() => {
    reflector = new Reflector();
    jwt = { verifyAsync: jest.fn() };
    prisma = { usuario: { findUnique: jest.fn() } };
    guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      reflector,
      prisma as unknown as PrismaService,
    );
  });

  it('deja pasar las rutas @Public sin exigir token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza cuando falta el header Authorization', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    await expect(guard.canActivate(context({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza cuando el token es inválido', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jwt.verifyAsync.mockRejectedValueOnce(new Error('bad'));
    await expect(
      guard.canActivate(context({ authorization: 'Bearer roto' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  it('adjunta el payload a request.user con un token válido y cuenta viva', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValueOnce(payload);
    prisma.usuario.findUnique.mockResolvedValueOnce({
      id: 'u1',
      rol: 'ARBITRO',
    });
    const ctx = context({ authorization: 'Bearer ok' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(usuarioDe(ctx)).toEqual(payload);
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { id: true, rol: true },
    });
  });

  it('rechaza un token válido si la cuenta ya no existe (borrada tras emitirlo)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValueOnce(payload);
    prisma.usuario.findUnique.mockResolvedValueOnce(null);
    const ctx = context({ authorization: 'Bearer ok' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(usuarioDe(ctx)).toBeUndefined();
  });

  it('usa el rol actual de la base, no el que traía el token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValueOnce(payload);
    prisma.usuario.findUnique.mockResolvedValueOnce({
      id: 'u1',
      rol: 'LIGA_ADMIN',
    });
    const ctx = context({ authorization: 'Bearer ok' });

    await guard.canActivate(ctx);
    expect(usuarioDe(ctx)).toEqual({ ...payload, rol: 'LIGA_ADMIN' });
  });
});
