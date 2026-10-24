import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EntradaBitacora {
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  rol?: string | null;
  metodo: string;
  ruta: string;
  params?: Record<string, unknown> | null;
  detalle?: unknown;
  estado: number;
}

export interface FiltrosBitacora {
  usuario?: string;
  ruta?: string;
  antes?: string;
}

const POR_PAGINA = 50;

@Injectable()
export class BitacoraService {
  private readonly logger = new Logger(BitacoraService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Nunca lanza: si la bitácora falla, la petición original no se cae. */
  async registrar(e: EntradaBitacora): Promise<void> {
    try {
      await this.prisma.bitacora.create({
        data: {
          usuarioId: e.usuarioId ?? null,
          usuarioEmail: e.usuarioEmail ?? null,
          rol: e.rol ?? null,
          metodo: e.metodo,
          ruta: e.ruta,
          params: (e.params ?? undefined) as Prisma.InputJsonValue | undefined,
          detalle: e.detalle ?? undefined,
          estado: e.estado,
        },
      });
    } catch (err) {
      this.logger.warn(`No se pudo escribir la bitácora: ${String(err)}`);
    }
  }

  /** SUPERADMIN: lo más reciente primero, 50 por página (`antes` = fecha ISO). */
  listar(f: FiltrosBitacora) {
    const antes = f.antes ? new Date(f.antes) : null;
    return this.prisma.bitacora.findMany({
      where: {
        ...(f.usuario
          ? {
              usuarioEmail: { contains: f.usuario.trim(), mode: 'insensitive' },
            }
          : {}),
        ...(f.ruta
          ? { ruta: { contains: f.ruta.trim(), mode: 'insensitive' } }
          : {}),
        ...(antes && !Number.isNaN(antes.getTime())
          ? { fecha: { lt: antes } }
          : {}),
      },
      orderBy: { fecha: 'desc' },
      take: POR_PAGINA,
    });
  }
}
