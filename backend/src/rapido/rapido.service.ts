import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../common/hashing';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CrearPartidoRapidoDto } from './dto/crear-partido-rapido.dto';

const NOMBRE_INVITADO = 'Árbitro invitado';
const CATEGORIA_RAPIDA = 'Partidos rápidos';

/**
 * HU-2.7 — Partido rápido sin cuenta. Un árbitro escribe dos nombres de
 * equipo y empieza a arbitrar. Por debajo se crea (una sola vez por
 * dispositivo) un usuario invitado con su propia liga de tipo RAPIDA, y cada
 * partido rápido es un `Partido` normal dentro de ella: scoreboard, cola
 * offline, deshacer, MVP y reconciliación funcionan sin ningún caso especial.
 * El invitado recibe el mismo JWT que un árbitro con cuenta.
 */
@Injectable()
export class RapidoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async crear(dto: CrearPartidoRapidoDto, actual: AuthUser | null) {
    const local = dto.equipoLocal.trim();
    const visitante = dto.equipoVisitante.trim();
    if (local.toLowerCase() === visitante.toLowerCase()) {
      throw new BadRequestException(
        'Los dos equipos necesitan nombres distintos',
      );
    }
    const nombreArbitro = dto.arbitro?.trim() || NOMBRE_INVITADO;

    // Si el token trae un usuario que sigue existiendo, se reutiliza (sea
    // invitado o árbitro con cuenta); si no, se crea un invitado nuevo.
    const existente = actual
      ? await this.prisma.usuario.findUnique({
          where: { id: actual.sub },
          select: { id: true, email: true, rol: true },
        })
      : null;

    const { usuario, partidoId } = await this.prisma.$transaction(
      async (tx) => {
        const usuario =
          existente ??
          (await tx.usuario.create({
            data: {
              nombre: nombreArbitro,
              email: `${randomUUID()}@invitado.panuelo`,
              // Nadie conoce esta contraseña: el invitado solo entra con su token.
              passwordHash: hashPassword(randomBytes(32).toString('hex')),
              rol: 'ARBITRO',
              esInvitado: true,
            },
            select: { id: true, email: true, rol: true },
          }));

        const liga =
          (await tx.liga.findFirst({
            where: { propietarioId: usuario.id, tipo: 'RAPIDA' },
            select: { id: true },
          })) ??
          (await tx.liga.create({
            data: {
              nombre: `Partidos rápidos de ${nombreArbitro}`,
              tipo: 'RAPIDA',
              propietarioId: usuario.id,
              registraMvp: true,
              registraIntercepciones: true,
            },
            select: { id: true },
          }));

        const categoria =
          (await tx.categoria.findFirst({
            where: { ligaId: liga.id },
            select: { id: true },
          })) ??
          (await tx.categoria.create({
            data: { nombre: CATEGORIA_RAPIDA, ligaId: liga.id },
            select: { id: true },
          }));

        const equipoLocal = await tx.equipo.create({
          data: { nombre: local, categoriaId: categoria.id },
          select: { id: true },
        });
        const equipoVisitante = await tx.equipo.create({
          data: { nombre: visitante, categoriaId: categoria.id },
          select: { id: true },
        });

        const partido = await tx.partido.create({
          data: {
            categoriaId: categoria.id,
            fechaHora: new Date(),
            dificultad: 'REGULAR',
            estado: 'PROGRAMADO',
            equipoLocalId: equipoLocal.id,
            equipoVisitanteId: equipoVisitante.id,
          },
          select: { id: true },
        });
        await tx.asignacionArbitral.create({
          data: {
            partidoId: partido.id,
            arbitroId: usuario.id,
            rolEnCampo: 'Referee',
          },
        });

        return { usuario, partidoId: partido.id };
      },
    );

    const payload: AuthUser = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };
    return {
      access_token: await this.jwt.signAsync(payload),
      partidoId,
      usuario: payload,
    };
  }
}
