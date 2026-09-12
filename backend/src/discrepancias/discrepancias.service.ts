import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { calcularMarcador } from '../eventos/marcador';
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
    return this.prisma.discrepanciaEvento.findMany({
      where: { partidoId },
      orderBy: { createdAt: 'asc' },
      include: {
        eventoA: { select: eventoPublico },
        eventoB: { select: eventoPublico },
      },
    });
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
      select: { tipoEvento: true, equipoId: true },
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
