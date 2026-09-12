import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { RegistrarEventoDto } from './dto/registrar-evento.dto';
import { calcularMarcador, type Marcador } from './marcador';
import { puntosDe } from './evento.constants';

@Injectable()
export class EventosService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(
    partidoId: string,
    dto: RegistrarEventoDto,
    arbitro: AuthUser,
  ): Promise<{ evento: unknown; marcador: Marcador; duplicado: boolean }> {
    const partido = await this.prisma.partido.findUnique({
      where: { id: partidoId },
      select: {
        estado: true,
        equipoLocalId: true,
        equipoVisitanteId: true,
        categoria: { select: { liga: { select: { propietarioId: true } } } },
        asignaciones: { select: { arbitroId: true } },
      },
    });
    if (!partido)
      throw new NotFoundException(`Partido ${partidoId} no encontrado`);

    this.assertPuedeRegistrar(partido, arbitro);

    // Idempotencia: si el cliente ya envió este clientEventId, se devuelve el
    // evento existente en vez de duplicarlo (reintento de la cola offline).
    if (dto.clientEventId) {
      const existente = await this.prisma.eventoPartido.findUnique({
        where: {
          partidoId_clientEventId: {
            partidoId,
            clientEventId: dto.clientEventId,
          },
        },
      });
      if (existente) {
        return {
          evento: existente,
          marcador: await this.getMarcador(partidoId),
          duplicado: true,
        };
      }
    }

    if (
      dto.equipoId &&
      ![partido.equipoLocalId, partido.equipoVisitanteId].includes(dto.equipoId)
    ) {
      throw new BadRequestException(
        'equipoId no corresponde a ninguno de los equipos del partido',
      );
    }
    if (puntosDe(dto.tipoEvento) > 0 && !dto.equipoId) {
      throw new BadRequestException(
        `El evento ${dto.tipoEvento} requiere equipoId (el equipo que anota)`,
      );
    }

    const nuevoEstado = await this.resolverTransicionEstado(
      partidoId,
      partido,
      dto,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const evento = await tx.eventoPartido.create({
          data: {
            partidoId,
            tipoEvento: dto.tipoEvento,
            clientEventId: dto.clientEventId ?? null,
            equipoId: dto.equipoId ?? null,
            jugadorId: dto.jugadorId ?? null,
            arbitroId: arbitro.sub,
            ...(dto.timestamp ? { timestamp: new Date(dto.timestamp) } : {}),
          },
        });

        const todos = await tx.eventoPartido.findMany({
          where: { partidoId },
          orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
          select: { tipoEvento: true, equipoId: true },
        });
        const marcador = calcularMarcador(
          todos,
          partido.equipoLocalId,
          partido.equipoVisitanteId,
        );

        await tx.partido.update({
          where: { id: partidoId },
          data: {
            marcadorLocal: marcador.local,
            marcadorVisitante: marcador.visitante,
            ...(nuevoEstado !== partido.estado ? { estado: nuevoEstado } : {}),
          },
        });

        return { evento, marcador, duplicado: false };
      });
    } catch (error) {
      // Carrera: dos reintentos concurrentes con el mismo clientEventId.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        dto.clientEventId
      ) {
        const existente = await this.prisma.eventoPartido.findUniqueOrThrow({
          where: {
            partidoId_clientEventId: {
              partidoId,
              clientEventId: dto.clientEventId,
            },
          },
        });
        return {
          evento: existente,
          marcador: await this.getMarcador(partidoId),
          duplicado: true,
        };
      }
      throw error;
    }
  }

  async listar(partidoId: string) {
    await this.assertPartidoExiste(partidoId);
    return this.prisma.eventoPartido.findMany({
      where: { partidoId },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });
  }

  async getMarcador(partidoId: string): Promise<Marcador> {
    const partido = await this.prisma.partido.findUnique({
      where: { id: partidoId },
      select: { equipoLocalId: true, equipoVisitanteId: true },
    });
    if (!partido)
      throw new NotFoundException(`Partido ${partidoId} no encontrado`);

    const eventos = await this.prisma.eventoPartido.findMany({
      where: { partidoId },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
      select: { tipoEvento: true, equipoId: true },
    });
    return calcularMarcador(
      eventos,
      partido.equipoLocalId,
      partido.equipoVisitanteId,
    );
  }

  private async assertPartidoExiste(partidoId: string): Promise<void> {
    const existe = await this.prisma.partido.findUnique({
      where: { id: partidoId },
      select: { id: true },
    });
    if (!existe)
      throw new NotFoundException(`Partido ${partidoId} no encontrado`);
  }

  private assertPuedeRegistrar(
    partido: {
      categoria: { liga: { propietarioId: string } };
      asignaciones: { arbitroId: string }[];
    },
    arbitro: AuthUser,
  ): void {
    const esDuenoOSuperadmin =
      arbitro.rol === 'SUPERADMIN' ||
      partido.categoria.liga.propietarioId === arbitro.sub;
    const esArbitroAsignado = partido.asignaciones.some(
      (a) => a.arbitroId === arbitro.sub,
    );
    if (!esDuenoOSuperadmin && !esArbitroAsignado) {
      throw new ForbiddenException(
        'Solo el árbitro asignado o el dueño de la liga pueden registrar eventos de este partido',
      );
    }
  }

  /**
   * PROGRAMADO solo acepta INICIO_MITAD (transiciona a EN_CURSO).
   * FINALIZADO no acepta más eventos.
   * El segundo FIN_MITAD en EN_CURSO cierra el partido.
   */
  private async resolverTransicionEstado(
    partidoId: string,
    partido: { estado: string },
    dto: RegistrarEventoDto,
  ): Promise<string> {
    if (partido.estado === 'FINALIZADO') {
      throw new BadRequestException(
        'El partido ya finalizó; no admite más eventos',
      );
    }
    if (partido.estado === 'PROGRAMADO') {
      if (dto.tipoEvento !== 'INICIO_MITAD') {
        throw new BadRequestException(
          'El partido no ha comenzado: el primer evento debe ser INICIO_MITAD',
        );
      }
      return 'EN_CURSO';
    }
    if (dto.tipoEvento === 'FIN_MITAD') {
      const finesPrevios = await this.prisma.eventoPartido.count({
        where: { partidoId, tipoEvento: 'FIN_MITAD' },
      });
      if (finesPrevios >= 1) return 'FINALIZADO';
    }
    return partido.estado;
  }
}
