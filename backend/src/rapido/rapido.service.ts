import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
              // Equipos ad hoc sin roster: no hay a quién elegir de MVP y las
              // intercepciones se registran sin jugador. Se deja explícito.
              registraMvp: false,
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

  /**
   * Atajo "los equipos estaban al revés": intercambia nombre y color de los
   * dos equipos del partido rápido. Los eventos no se tocan (siguen apuntando
   * a la misma fila de Equipo), así que el marcador queda corregido de golpe.
   */
  async intercambiarEquipos(partidoId: string, usuario: AuthUser) {
    // Lectura y escritura bajo el mismo bloqueo de fila del partido (mismo
    // patrón que eventos.service.registrar): dos intercambios concurrentes
    // leerían los mismos nombres y el segundo desharía al primero a medias.
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT "id" FROM "Partido" WHERE "id" = ${partidoId} FOR UPDATE`;
      const partido = await tx.partido.findUnique({
        where: { id: partidoId },
        select: {
          categoria: {
            select: { liga: { select: { tipo: true, propietarioId: true } } },
          },
          asignaciones: { select: { arbitroId: true } },
          equipoLocal: {
            select: { id: true, nombre: true, colorPrimario: true },
          },
          equipoVisitante: {
            select: { id: true, nombre: true, colorPrimario: true },
          },
        },
      });
      if (!partido) throw new NotFoundException('Partido no encontrado');

      const puede =
        usuario.rol === 'SUPERADMIN' ||
        partido.categoria.liga.propietarioId === usuario.sub ||
        partido.asignaciones.some((a) => a.arbitroId === usuario.sub);
      if (!puede) {
        throw new ForbiddenException(
          'Solo el árbitro asignado o el dueño de la liga pueden corregir este partido',
        );
      }
      if (partido.categoria.liga.tipo !== 'RAPIDA') {
        throw new BadRequestException('Solo disponible en partidos rápidos');
      }

      const { equipoLocal: local, equipoVisitante: visitante } = partido;
      await tx.equipo.update({
        where: { id: local.id },
        data: {
          nombre: visitante.nombre,
          colorPrimario: visitante.colorPrimario,
        },
      });
      await tx.equipo.update({
        where: { id: visitante.id },
        data: { nombre: local.nombre, colorPrimario: local.colorPrimario },
      });
      return {
        equipoLocal: { id: local.id, nombre: visitante.nombre },
        equipoVisitante: { id: visitante.id, nombre: local.nombre },
      };
    });
  }
}
