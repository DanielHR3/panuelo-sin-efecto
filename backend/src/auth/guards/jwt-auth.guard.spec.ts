import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
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

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let jwt: { verifyAsync: jest.Mock };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = new Reflector();
    jwt = { verifyAsync: jest.fn() };
    guard = new JwtAuthGuard(jwt as unknown as JwtService, reflector);
  });

  it('deja pasar las rutas @Public sin exigir token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
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
  });

  it('adjunta el payload a request.user con un token válido', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const payload = { sub: 'u1', email: 'a@b.c', rol: 'ARBITRO' };
    jwt.verifyAsync.mockResolvedValueOnce(payload);
    const ctx = context({ authorization: 'Bearer ok' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((ctx as unknown as { __req: { user: unknown } }).__req.user).toEqual(
      payload,
    );
  });
});
