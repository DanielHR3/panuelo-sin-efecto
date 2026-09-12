import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextWithUser(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite el acceso cuando el handler no declara @Roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextWithUser({ rol: 'ARBITRO' }))).toBe(true);
  });

  it('permite el acceso cuando el rol del usuario está en la lista', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['SUPERADMIN', 'LIGA_ADMIN']);
    expect(guard.canActivate(contextWithUser({ rol: 'LIGA_ADMIN' }))).toBe(
      true,
    );
  });

  it('lanza ForbiddenException cuando el rol no está autorizado', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPERADMIN']);
    expect(() =>
      guard.canActivate(contextWithUser({ rol: 'ARBITRO' })),
    ).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException cuando no hay usuario en la request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ARBITRO']);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
