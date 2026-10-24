import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard global: exige `Authorization: Bearer <jwt>` válido y adjunta el payload
 * a `request.user`. Las rutas marcadas con `@Public()` se dejan pasar sin token.
 *
 * Además comprueba que la cuenta siga existiendo: un JWT dura hasta 7 días y
 * no se puede revocar, así que sin esto una cuenta borrada (p. ej. al eliminar
 * una liga desde el superadmin) seguiría entrando hasta que caducara. El rol
 * se toma de la base, no del token, para que un cambio de rol aplique al
 * instante. Cuesta una consulta por clave primaria por petición.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Falta el token de autenticación');
    }

    let payload: AuthUser;
    try {
      payload = await this.jwtService.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, rol: true },
    });
    if (!usuario) {
      throw new UnauthorizedException('La cuenta ya no existe');
    }

    request.user = { ...payload, rol: usuario.rol };
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
