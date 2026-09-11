import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    await this.ownership.assertCanManagePartido(partidoId, user);

    const discrepancia = await this.prisma.discrepanciaEvento.findUnique({
      where: { id: discrepanciaId },
    });
    if (!discrepancia || discrepancia.partidoId !== partidoId) {
      throw new NotFoundException(
        `Discrepancia ${discrepanciaId} no encontrada en el partido ${partidoId}`,
      );
    }
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
      if (eventoDescartadoId) {
        await tx.eventoPartido.update({
          where: { id: eventoDescartadoId },
          data: { descartado: true },
        });

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
}
