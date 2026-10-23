import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { calcularMarcador, filtrarEventosVigentes } from '../eventos/marcador';
import { ResolverDiscrepanciaDto } from './dto/resolver-discrepancia.dto';

const eventoPublico = {
  id: true,
  tipoEvento: true,
  equipoId: true,
  jugadorId: true,
  arbitroId: true,
  timestamp: true,
  descartado: true,
} as const;

@Injectable()
export class DiscrepanciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async listar(partidoId: string, user: AuthUser) {
    await this.ownership.assertCanManagePartido(partidoId, user);
    const [discrepancias, vigentes] = await Promise.all([
      this.prisma.discrepanciaEvento.findMany({
        where: { partidoId },
        orderBy: { createdAt: 'asc' },
        include: {
          eventoA: { select: eventoPublico },
          eventoB: { select: eventoPublico },
        },
      }),
      this.idsVigentes(this.prisma, partidoId),
    ]);
    // `anulado`: el evento sigue en la bitácora pero ya no cuenta para el
    // marcador (ANULAR_EVENTO o UNDO posterior). Se calcula al leer — nada
    // se persiste — así que deshacer un ANULAR_EVENTO lo devuelve a false.
    const conVigencia = <E extends { id: string; descartado: boolean }>(
      e: E,
    ) => ({ ...e, anulado: !e.descartado && !vigentes.has(e.id) });
    return discrepancias.map((d) => ({
      ...d,
      eventoA: conVigencia(d.eventoA),
      eventoB: conVigencia(d.eventoB),
    }));
  }

  async resolver(
    partidoId: string,
    discrepanciaId: string,
    dto: ResolverDiscrepanciaDto,
    user: AuthUser,
  ) {
    const discrepancia = await this.cargar(partidoId, discrepanciaId, user);
    if (discrepancia.estado === 'RESUELTA') {
      throw new BadRequestException('Esta discrepancia ya fue resuelta');
    }

    const eventoDescartadoId =
      dto.accion === 'DESCARTAR_A'
        ? discrepancia.eventoAId
        : dto.accion === 'DESCARTAR_B'
          ? discrepancia.eventoBId
          : null;

    return this.prisma.$transaction(async (tx) => {
      await this.bloquearPartido(tx, partidoId);

      if (eventoDescartadoId) {
        // Si la contraparte ya no cuenta (anulada con ANULAR_EVENTO o
        // deshecha), descartar este lado borraría la jugada por completo.
        const contraparteId =
          eventoDescartadoId === discrepancia.eventoAId
            ? discrepancia.eventoBId
            : discrepancia.eventoAId;
        const vigentes = await this.idsVigentes(tx, partidoId);
        if (!vigentes.has(contraparteId)) {
          throw new BadRequestException(
            'El otro evento ya fue anulado; descartar este dejaría la jugada sin registrar',
          );
        }
        await tx.eventoPartido.update({
          where: { id: eventoDescartadoId },
          data: { descartado: true },
        });
        await this.recalcularMarcador(tx, partidoId);
      }

      return tx.discrepanciaEvento.update({
        where: { id: discrepanciaId },
        data: {
          estado: 'RESUELTA',
          eventoDescartadoId,
          resueltoPorId: user.sub,
          resolvedAt: new Date(),
        },
      });
    });
  }

  /**
   * Deshace una resolución: la discrepancia vuelve a PENDIENTE y, si se había
   * descartado un evento, este vuelve a contar para el marcador — salvo que
   * otra discrepancia resuelta siga descartándolo (un mismo evento puede
   * formar parte de varios pares). La fila del evento nunca se borra ni se
   * reescribe fuera del flag `descartado` (Caja Negra).
   */
  async reabrir(partidoId: string, discrepanciaId: string, user: AuthUser) {
    const discrepancia = await this.cargar(partidoId, discrepanciaId, user);
    if (discrepancia.estado !== 'RESUELTA') {
      throw new BadRequestException(
        'Solo se puede reabrir una discrepancia ya resuelta',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.bloquearPartido(tx, partidoId);

      const eventoId = discrepancia.eventoDescartadoId;
      if (eventoId) {
        const otrasQueLoDescartan = await tx.discrepanciaEvento.count({
          where: {
            id: { not: discrepanciaId },
            estado: 'RESUELTA',
            eventoDescartadoId: eventoId,
          },
        });
        if (otrasQueLoDescartan === 0) {
          await tx.eventoPartido.update({
            where: { id: eventoId },
            data: { descartado: false },
          });
          await this.recalcularMarcador(tx, partidoId);
        }
      }

      return tx.discrepanciaEvento.update({
        where: { id: discrepanciaId },
        data: {
          estado: 'PENDIENTE',
          eventoDescartadoId: null,
          resueltoPorId: null,
          resolvedAt: null,
        },
      });
    });
  }

  private async cargar(
    partidoId: string,
    discrepanciaId: string,
    user: AuthUser,
  ) {
    await this.ownership.assertCanManagePartido(partidoId, user);
    const discrepancia = await this.prisma.discrepanciaEvento.findUnique({
      where: { id: discrepanciaId },
    });
    if (!discrepancia || discrepancia.partidoId !== partidoId) {
      throw new NotFoundException(
        `Discrepancia ${discrepanciaId} no encontrada en el partido ${partidoId}`,
      );
    }
    return discrepancia;
  }

  /**
   * Ids de los eventos que siguen contando para el marcador: la misma pila
   * de cancelación (UNDO / ANULAR_EVENTO) que `calcularMarcador`, sobre los
   * eventos no descartados y en el mismo orden.
   */
  private async idsVigentes(
    db: Prisma.TransactionClient,
    partidoId: string,
  ): Promise<Set<string>> {
    const eventos = await db.eventoPartido.findMany({
      where: { partidoId, descartado: false },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
      select: { id: true, tipoEvento: true, eventoAnuladoId: true },
    });
    return new Set(filtrarEventosVigentes(eventos).map((e) => e.id));
  }

  /**
   * Mismo bloqueo por partido que eventos.service.registrar: el recálculo del
   * marcador compite con cualquier evento que llegue en paralelo por la
   * misma caché denormalizada.
   */
  private bloquearPartido(tx: Prisma.TransactionClient, partidoId: string) {
    return tx.$executeRaw`SELECT "id" FROM "Partido" WHERE "id" = ${partidoId} FOR UPDATE`;
  }

  /** Recalcula la caché `marcadorLocal/Visitante` a partir de los eventos vigentes. */
  private async recalcularMarcador(
    tx: Prisma.TransactionClient,
    partidoId: string,
  ) {
    const partido = await tx.partido.findUniqueOrThrow({
      where: { id: partidoId },
      select: { equipoLocalId: true, equipoVisitanteId: true },
    });
    const eventos = await tx.eventoPartido.findMany({
      where: { partidoId, descartado: false },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        tipoEvento: true,
        equipoId: true,
        eventoAnuladoId: true,
      },
    });
    const marcador = calcularMarcador(
      eventos,
      partido.equipoLocalId,
      partido.equipoVisitanteId,
    );
    await tx.partido.update({
      where: { id: partidoId },
      data: {
        marcadorLocal: marcador.local,
        marcadorVisitante: marcador.visitante,
      },
    });
  }
}
