import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { estadoSuscripcion, type ResumenSuscripcion } from './suscripcion';
import { permite, type Capacidad } from './cobro';

const MENSAJES: Record<Capacidad, (s: ResumenSuscripcion) => string> = {
  CAPTURAR: () =>
    'Tu liga no tiene un plan activo. Elige un plan en "Mi plan" para seguir capturando.',
  IMPORTAR: (s) =>
    s.estado === 'VENCIDA'
      ? 'Tu liga no tiene un plan activo. Elige un plan en "Mi plan" para importar.'
      : 'Tu plan Arbitraje no incluye importar desde Excel. Cambia al plan Completo.',
  PUBLICO: () => 'Tu plan no incluye página pública.',
};

/**
 * Aplica en el backend lo que permite el plan de una liga (no basta con
 * esconder botones). El SUPERADMIN no tiene límites.
 */
@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async resumen(ligaId: string): Promise<ResumenSuscripcion | null> {
    const s = await this.prisma.suscripcion.findUnique({
      where: { ligaId },
      select: { plan: true, pruebaHasta: true, pagadoHasta: true },
    });
    return s ? estadoSuscripcion(s, new Date()) : null;
  }

  async assertPermite(
    ligaId: string,
    capacidad: Capacidad,
    user: AuthUser,
  ): Promise<void> {
    if (user.rol === 'SUPERADMIN') return;
    const s = await this.resumen(ligaId);
    if (!permite(s, capacidad))
      throw new ForbiddenException(MENSAJES[capacidad](s!));
  }

  async assertPermiteEnCategoria(
    categoriaId: string,
    capacidad: Capacidad,
    user: AuthUser,
  ) {
    const c = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
      select: { ligaId: true },
    });
    if (c) await this.assertPermite(c.ligaId, capacidad, user);
  }

  async assertPermiteEnEquipo(
    equipoId: string,
    capacidad: Capacidad,
    user: AuthUser,
  ) {
    const e = await this.prisma.equipo.findUnique({
      where: { id: equipoId },
      select: { categoria: { select: { ligaId: true } } },
    });
    if (e) await this.assertPermite(e.categoria.ligaId, capacidad, user);
  }
}
