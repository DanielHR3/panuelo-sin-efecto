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
import {
  calcularMarcador,
  filtrarEventosVigentes,
  type Marcador,
} from './marcador';
import { puntosDe } from './evento.constants';
import { detectarDiscrepancias } from './discrepancias';

@Injectable()
export class EventosService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(
    partidoId: string,
    dto: RegistrarEventoDto,
    arbitro: AuthUser,
  ): Promise<{ evento: unknown; marcador: Marcador; duplicado: boolean }> {
    // Nota (HU-2.6, finding 2): este `partido` solo se usa para autorización
    // (categoria/liga/asignaciones) y los ids de equipo — nunca para decidir
    // la transición de estado. `estado` se relee FRESCO desde dentro de la
    // transacción (ver más abajo), porque dos árbitros pulsando "fin de
    // partido" casi al mismo tiempo pueden leer este `estado` de aquí afuera
    // ANTES de que exista ninguna transacción confirmada.
    const partido = await this.prisma.partido.findUnique({
      where: { id: partidoId },
      select: {
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

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Lectura FRESCA de estado, dentro de la transacción (HU-2.6,
        // finding 2). SQLite serializa las transacciones de escritura: una
        // transacción que arranca después de que otra ya confirmó ve el
        // estado que esa otra dejó, así que dos "fin de partido" casi
        // simultáneos ya no pueden finalizar/detectar dos veces — la
        // segunda ve FINALIZADO y es rechazada como cualquier evento
        // genuinamente tardío.
        const estadoActual = await tx.partido.findUniqueOrThrow({
          where: { id: partidoId },
          select: { estado: true },
        });
        const nuevoEstado = await this.resolverTransicionEstado(
          tx,
          partidoId,
          estadoActual.estado,
          dto,
        );

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
          where: { partidoId, descartado: false },
          orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            tipoEvento: true,
            equipoId: true,
            arbitroId: true,
            timestamp: true,
          },
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
            ...(nuevoEstado !== estadoActual.estado
              ? { estado: nuevoEstado }
              : {}),
          },
        });

        if (
          nuevoEstado === 'FINALIZADO' &&
          nuevoEstado !== estadoActual.estado &&
          partido.asignaciones.length > 1
        ) {
          // Finding 1: solo se alimenta al detector con eventos que siguen
          // vigentes (no cancelados por un UNDO_LAST_ACTION posterior),
          // usando la MISMA pila de cancelación que calcularMarcador — así
          // nunca se puede emparejar como "posible duplicado" un evento que
          // el marcador ya ignora.
          const vigentes = filtrarEventosVigentes(todos);
          const pares = detectarDiscrepancias(vigentes);
          if (pares.length > 0) {
            try {
              await tx.discrepanciaEvento.createMany({
                data: pares.map((p) => ({
                  partidoId,
                  eventoAId: p.eventoAId,
                  eventoBId: p.eventoBId,
                  estado: 'PENDIENTE',
                })),
              });
            } catch (err) {
              // Backstop de la restricción única @@unique([eventoAId,
              // eventoBId]) del schema, además de la lectura fresca de
              // arriba: si por lo que sea este mismo par ya existiera (no
              // debería, la lectura fresca ya cierra la carrera del
              // finding 2), se trata como "ya detectado" en vez de tirar
              // toda la transacción — `skipDuplicates` de Prisma no está
              // disponible en SQLite, así que el no-op se hace a mano.
              if (!(
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002'
              )) {
                throw err;
              }
            }
          }
        }

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
      where: { partidoId, descartado: false },
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
   *
   * Recibe `tx` (el cliente de la transacción) y `estadoActual` ya leído
   * fresco DESDE DENTRO de esa transacción (HU-2.6, finding 2) — nunca del
   * `this.prisma` exterior. Dos árbitros pulsando "fin de partido" casi al
   * mismo tiempo generan dos transacciones; SQLite las serializa, así que
   * la segunda en arrancar ve aquí el `estado`/conteo de FIN_MITAD que la
   * primera ya confirmó, y esta función la trata como un evento tardío
   * normal (mismo error que cualquier evento después de FINALIZADO) en vez
   * de volver a finalizar y volver a disparar la detección de
   * discrepancias.
   */
  private async resolverTransicionEstado(
    tx: Prisma.TransactionClient,
    partidoId: string,
    estadoActual: string,
    dto: RegistrarEventoDto,
  ): Promise<string> {
    if (estadoActual === 'FINALIZADO') {
      throw new BadRequestException(
        'El partido ya finalizó; no admite más eventos',
      );
    }
    if (estadoActual === 'PROGRAMADO') {
      if (dto.tipoEvento !== 'INICIO_MITAD') {
        throw new BadRequestException(
          'El partido no ha comenzado: el primer evento debe ser INICIO_MITAD',
        );
      }
      return 'EN_CURSO';
    }
    if (dto.tipoEvento === 'FIN_MITAD') {
      const finesPrevios = await tx.eventoPartido.count({
        where: { partidoId, tipoEvento: 'FIN_MITAD' },
      });
      if (finesPrevios >= 1) return 'FINALIZADO';
    }
    return estadoActual;
  }
}
