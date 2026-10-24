import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { BitacoraInterceptor } from './bitacora.interceptor';

function contexto(req: Record<string, unknown>, statusCode = 201) {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('BitacoraInterceptor', () => {
  const bitacora = { registrar: jest.fn() };
  const interceptor = new BitacoraInterceptor(bitacora as never);
  beforeEach(() => jest.clearAllMocks());

  it('no anota lecturas (GET)', async () => {
    await lastValueFrom(
      interceptor.intercept(contexto({ method: 'GET' }), {
        handle: () => of(1),
      }),
    );
    expect(bitacora.registrar).not.toHaveBeenCalled();
  });

  it('anota quién, qué ruta, parámetros, cuerpo depurado y el resumen de la respuesta', async () => {
    const req = {
      method: 'DELETE',
      user: { sub: 'u1', email: 's@x.mx', rol: 'SUPERADMIN' },
      route: { path: '/ligas/:id' },
      params: { id: 'l1' },
      query: { borrarCuenta: 'true' },
      body: {},
    };
    await lastValueFrom(
      interceptor.intercept(contexto(req, 200), {
        handle: () => of({ id: 'l1', resumen: { partidos: 3 } }),
      }),
    );
    expect(bitacora.registrar).toHaveBeenCalledWith({
      usuarioId: 'u1',
      usuarioEmail: 's@x.mx',
      rol: 'SUPERADMIN',
      metodo: 'DELETE',
      ruta: '/ligas/:id',
      params: { id: 'l1' },
      detalle: { query: { borrarCuenta: 'true' }, resumen: { partidos: 3 } },
      estado: 200,
    });
  });

  it('anota también los intentos fallidos sin sesión, con el correo y sin la contraseña', async () => {
    const req = {
      method: 'POST',
      route: { path: '/auth/login' },
      params: {},
      query: {},
      body: { email: 'Alguien@X.mx', password: 'secreta' },
    };
    await expect(
      lastValueFrom(
        interceptor.intercept(contexto(req), {
          handle: () => throwError(() => new BadRequestException()),
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(bitacora.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioEmail: 'alguien@x.mx',
        estado: 400,
        detalle: { cuerpo: { email: 'Alguien@X.mx', password: '[oculto]' } },
      }),
    );
  });
});
