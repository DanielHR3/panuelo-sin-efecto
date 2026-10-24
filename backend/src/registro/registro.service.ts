import {
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../common/hashing';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { suscripcionParaLigaNueva } from '../suscripciones/suscripcion';
import { RegistroDto } from './dto/registro.dto';

export const RELOJ = 'RELOJ';
const CATEGORIA_POR_DEFECTO = 'Varonil';

/**
 * Registro público de un organizador: en una sola transacción crea su cuenta
 * (LIGA_ADMIN), su liga con una primera categoría y la prueba gratis, y
 * devuelve la sesión iniciada (mismo JWT que el login).
 */
@Injectable()
export class RegistroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Optional()
    @Inject(RELOJ)
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  async registrar(dto: RegistroDto) {
    const email = dto.email.trim().toLowerCase();
    try {
      const { usuario, liga } = await this.prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            nombre: dto.nombre.trim(),
            email,
            passwordHash: hashPassword(dto.password),
            rol: 'LIGA_ADMIN',
          },
          select: { id: true, email: true, rol: true },
        });
        const liga = await tx.liga.create({
          data: {
            nombre: dto.nombreLiga.trim(),
            propietarioId: usuario.id,
            categorias: {
              create: {
                nombre: dto.categoria?.trim() || CATEGORIA_POR_DEFECTO,
              },
            },
            suscripcion: {
              create: suscripcionParaLigaNueva(
                { esSuperadmin: false, yaTuvoPrueba: false },
                this.ahora(),
              ),
            },
          },
          select: { id: true },
        });
        return { usuario, liga };
      });

      const payload: AuthUser = {
        sub: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      };
      return {
        access_token: await this.jwt.signAsync(payload),
        usuario: payload,
        ligaId: liga.id,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ese email ya tiene cuenta. Inicia sesión.',
        );
      }
      throw error;
    }
  }
}
