import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { RegistrarEventoDto } from './dto/registrar-evento.dto';
import {
  calcularMarcador,
  filtrarEventosVigentes,
  type Marcador,
} from './marcador';
import { esAnulable, puntosDe } from './evento.constants';
import { detectarDiscrepancias } from './discrepancias';

const PLAZO_CORRECCION_MS = 48 * 3600_000;
/** Tolerancia de deriva de reloj del dispositivo para `dto.timestamp`. */
const MAX_TIMESTAMP_FUTURO_MS = 5 * 60_000;

@Injectable()
export class EventosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

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

    if (dto.tipoEvento === 'ANULAR_EVENTO' && !dto.eventoAnuladoId) {
      throw new BadRequestException(
        'ANULAR_EVENTO requiere eventoAnuladoId (el evento que se anula)',
      );
    }
    if (dto.eventoAnuladoId && dto.tipoEvento !== 'ANULAR_EVENTO') {
      throw new BadRequestException(
        'eventoAnuladoId solo aplica a ANULAR_EVENTO',
      );
    }
    if (
      dto.timestamp &&
      new Date(dto.timestamp).getTime() > Date.now() + MAX_TIMESTAMP_FUTURO_MS
    ) {
      throw new BadRequestException(
        'El timestamp del evento no puede estar en el futuro',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Serialización por partido (HU-2.6, finding 2). En PostgreSQL con
        // READ COMMITTED dos transacciones concurrentes NO se serializan
        // solas (SQLite sí lo hacía): ambas podrían leer "EN_CURSO" y
        // finalizar/detectar dos veces. El bloqueo de fila hace que la
        // segunda espere a que la primera confirme, y su lectura fresca de
        // abajo vea ya FINALIZADO — y se rechace como cualquier evento
        // genuinamente tardío.
        await tx.$executeRaw`SELECT "id" FROM "Partido" WHERE "id" = ${partidoId} FOR UPDATE`;

        // Un timestamp enviado por el cliente no puede caer antes de la
        // última reapertura: si no, un UNDO/TD retrofechado se colaría en
        // el partido original (por debajo del tope de REABRIR en la pila)
        // o alargaría el plazo de 48 h. Se lee bajo el bloqueo.
        if (dto.timestamp) {
          await this.assertTimestampTrasReapertura(
            tx,
            partidoId,
            new Date(dto.timestamp),
          );
        }

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
        if (dto.tipoEvento === 'REABRIR_PARTIDO') {
          await this.assertPuedeReabrir(tx, partidoId, partido, arbitro);
        } else if (dto.tipoEvento === 'ANULAR_EVENTO') {
          await this.assertPuedeAnular(
            tx,
            partidoId,
            dto.eventoAnuladoId as string,
          );
        }

        const evento = await tx.eventoPartido.create({
          data: {
            partidoId,
            tipoEvento: dto.tipoEvento,
            clientEventId: dto.clientEventId ?? null,
            equipoId: dto.equipoId ?? null,
            eventoAnuladoId: dto.eventoAnuladoId ?? null,
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
            eventoAnuladoId: true,
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
            // Backstop de la restricción única @@unique([eventoAId,
            // eventoBId]) del schema, además del bloqueo de fila de arriba:
            // si por lo que sea este mismo par ya existiera, se ignora en
            // la propia base (ON CONFLICT DO NOTHING). Un catch de P2002
            // no serviría: en PostgreSQL cualquier error dentro de la
            // transacción la deja abortada y el resto fallaría igual.
            await tx.discrepanciaEvento.createMany({
              data: pares.map((p) => ({
                partidoId,
                eventoAId: p.eventoAId,
                eventoBId: p.eventoBId,
                estado: 'PENDIENTE',
              })),
              skipDuplicates: true,
            });
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

  /** Bitácora completa: árbitro asignado, dueño de la liga o SUPERADMIN. */
  async listar(partidoId: string, user: AuthUser) {
    await this.ownership.assertCanReadPartido(partidoId, user); // 404/403
    return this.prisma.eventoPartido.findMany({
      where: { partidoId },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });
  }

  /** `GET .../marcador`: misma autorización de lectura que la bitácora. */
  async leerMarcador(partidoId: string, user: AuthUser): Promise<Marcador> {
    await this.ownership.assertCanReadPartido(partidoId, user);
    return this.getMarcador(partidoId);
  }

  /** Uso interno (sin autorización): el llamador ya validó el acceso. */
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
      select: {
        id: true,
        tipoEvento: true,
        equipoId: true,
        eventoAnuladoId: true,
      },
    });
    return calcularMarcador(
      eventos,
      partido.equipoLocalId,
      partido.equipoVisitanteId,
    );
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
   * mismo tiempo generan dos transacciones; el bloqueo de fila del partido
   * (SELECT ... FOR UPDATE en `registrar`) las serializa, así que la
   * segunda en obtener el bloqueo ve aquí el `estado`/conteo de FIN_MITAD
   * que la primera ya confirmó, y esta función la trata como un evento
   * tardío normal (mismo error que cualquier evento después de FINALIZADO)
   * en vez de volver a finalizar y volver a disparar la detección de
   * discrepancias.
   */
  private async resolverTransicionEstado(
    tx: Prisma.TransactionClient,
    partidoId: string,
    estadoActual: string,
    dto: RegistrarEventoDto,
  ): Promise<string> {
    if (dto.tipoEvento === 'REABRIR_PARTIDO') {
      if (estadoActual !== 'FINALIZADO') {
        throw new BadRequestException('El partido no está finalizado');
      }
      return 'EN_CURSO';
    }
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

  /**
   * Reabrir un partido finalizado: el dueño de la liga y el superadmin
   * siempre pueden; el árbitro asignado solo dentro de las 48 h siguientes
   * al último FIN_MITAD.
   */
  private async assertPuedeReabrir(
    tx: Prisma.TransactionClient,
    partidoId: string,
    partido: { categoria: { liga: { propietarioId: string } } },
    usuario: AuthUser,
  ): Promise<void> {
    const esDuenoOSuperadmin =
      usuario.rol === 'SUPERADMIN' ||
      partido.categoria.liga.propietarioId === usuario.sub;
    if (esDuenoOSuperadmin) return;

    const ultimoFin = await tx.eventoPartido.findFirst({
      where: { partidoId, tipoEvento: 'FIN_MITAD', descartado: false },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      select: { timestamp: true },
    });
    if (
      ultimoFin &&
      ultimoFin.timestamp.getTime() < Date.now() - PLAZO_CORRECCION_MS
    ) {
      throw new ForbiddenException(
        'El plazo para corregir este partido (48 h) ya terminó; pídeselo al organizador de la liga',
      );
    }
  }

  private async assertTimestampTrasReapertura(
    tx: Prisma.TransactionClient,
    partidoId: string,
    timestamp: Date,
  ): Promise<void> {
    const ultimaReapertura = await tx.eventoPartido.findFirst({
      where: { partidoId, tipoEvento: 'REABRIR_PARTIDO' },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      select: { timestamp: true },
    });
    if (
      ultimaReapertura &&
      timestamp.getTime() < ultimaReapertura.timestamp.getTime()
    ) {
      throw new BadRequestException(
        'El timestamp del evento no puede ser anterior a la reapertura del partido',
      );
    }
  }

  /**
   * ANULAR_EVENTO solo vale tras reabrir el partido, contra un evento
   * anulable de este mismo partido que siga vigente.
   */
  private async assertPuedeAnular(
    tx: Prisma.TransactionClient,
    partidoId: string,
    eventoAnuladoId: string,
  ): Promise<void> {
    // Se leen también los descartados solo para dar un mensaje claro si el
    // objetivo es uno de ellos; la vigencia se calcula, como en el
    // marcador, únicamente sobre los no descartados.
    const todos = await tx.eventoPartido.findMany({
      where: { partidoId },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        tipoEvento: true,
        eventoAnuladoId: true,
        descartado: true,
      },
    });
    const eventos = todos.filter((e) => !e.descartado);
    if (!eventos.some((e) => e.tipoEvento === 'REABRIR_PARTIDO')) {
      throw new BadRequestException(
        'Solo se pueden anular eventos al corregir un partido finalizado',
      );
    }
    const objetivo = eventos.find((e) => e.id === eventoAnuladoId);
    if (!objetivo && todos.some((e) => e.id === eventoAnuladoId)) {
      throw new BadRequestException(
        'Ese evento fue descartado al resolver una discrepancia',
      );
    }
    if (!objetivo) {
      throw new BadRequestException(
        'El evento a anular no pertenece a este partido',
      );
    }
    if (!esAnulable(objetivo.tipoEvento)) {
      throw new BadRequestException('Ese evento no se puede anular');
    }
    const vigentes = filtrarEventosVigentes(eventos);
    if (!vigentes.some((e) => e.id === eventoAnuladoId)) {
      throw new BadRequestException('Ese evento ya está anulado');
    }
  }
}
