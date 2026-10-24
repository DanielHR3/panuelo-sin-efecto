import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { BitacoraService } from './bitacora.service';
import { depurar } from './depurar';

const METODOS_QUE_CAMBIAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Anota en la bitácora cada cambio que pasa por la API, salga bien o mal
 * (un login fallido también queda). Las lecturas (GET) no se anotan. Si la
 * respuesta trae un `resumen` (p. ej. lo que se borró con una liga), se
 * guarda junto al cuerpo.
 */
@Injectable()
export class BitacoraInterceptor implements NestInterceptor {
  constructor(private readonly bitacora: BitacoraService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!METODOS_QUE_CAMBIAN.has(req.method)) return next.handle();

    const anotar = (estado: number, respuesta?: unknown) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const resumen =
        respuesta && typeof respuesta === 'object' && 'resumen' in respuesta
          ? respuesta.resumen
          : undefined;
      const detalle = {
        ...(Object.keys(body).length ? { cuerpo: depurar(body) } : {}),
        ...(Object.keys(req.query ?? {}).length
          ? { query: depurar(req.query) }
          : {}),
        ...(resumen !== undefined ? { resumen: depurar(resumen) } : {}),
      };
      void this.bitacora.registrar({
        usuarioId: req.user?.sub,
        // Sin sesión (login, registro) se anota el correo que se intentó.
        usuarioEmail:
          req.user?.email ??
          (typeof body.email === 'string' ? body.email.toLowerCase() : null),
        rol: req.user?.rol,
        metodo: req.method,
        ruta: (req.route as { path?: string } | undefined)?.path ?? req.path,
        params: Object.keys(req.params ?? {}).length ? req.params : null,
        detalle: Object.keys(detalle).length ? detalle : null,
        estado,
      });
    };

    return next.handle().pipe(
      tap({
        next: (respuesta) =>
          anotar(
            ctx.switchToHttp().getResponse<Response>().statusCode,
            respuesta,
          ),
        error: (err: unknown) =>
          anotar(err instanceof HttpException ? err.getStatus() : 500),
      }),
    );
  }
}
