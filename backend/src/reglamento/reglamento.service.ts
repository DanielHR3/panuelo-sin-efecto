import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { PlanService } from '../suscripciones/plan.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

interface ArchivoSubido {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

/** Firma de todo PDF: los primeros bytes son "%PDF-". */
const FIRMA_PDF = Buffer.from('%PDF-');

/**
 * Reglamento de una liga (diseño, Parte 7). Sin PDF propio la app muestra el
 * resumen del reglamento IFAF de Flag Football; con plan Completo (o prueba)
 * el organizador sube el suyo, que lo reemplaza. Consultarlo es público: lo
 * necesitan árbitros, equipos y aficionados.
 */
@Injectable()
export class ReglamentoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly plan: PlanService,
  ) {}

  async subir(ligaId: string, archivo: ArchivoSubido, user: AuthUser) {
    await this.ownership.assertCanManageLiga(ligaId, user);
    await this.plan.assertPermite(ligaId, 'REGLAMENTO', user);
    if (
      archivo.mimetype !== 'application/pdf' ||
      !archivo.buffer.subarray(0, 5).equals(FIRMA_PDF)
    ) {
      throw new BadRequestException('Sube el reglamento en PDF');
    }
    const nombre = archivo.originalname.slice(0, 200);
    await this.prisma.reglamentoLiga.upsert({
      where: { ligaId },
      create: { ligaId, archivo: archivo.buffer, nombre },
      update: { archivo: archivo.buffer, nombre },
    });
    return { ligaId, nombre };
  }

  async quitar(ligaId: string, user: AuthUser) {
    await this.ownership.assertCanManageLiga(ligaId, user);
    await this.prisma.reglamentoLiga.deleteMany({ where: { ligaId } });
    return { ligaId, propio: null };
  }

  async info(ligaId: string) {
    const liga = await this.prisma.liga.findFirst({
      where: { id: ligaId, tipo: 'LIGA' },
      select: {
        id: true,
        nombre: true,
        reglamento: { select: { nombre: true, updatedAt: true } },
      },
    });
    if (!liga) throw new NotFoundException(`Liga ${ligaId} no encontrada`);
    return {
      ligaId: liga.id,
      liga: liga.nombre,
      propio: liga.reglamento
        ? {
            nombre: liga.reglamento.nombre,
            actualizado: liga.reglamento.updatedAt,
          }
        : null,
    };
  }

  async archivo(ligaId: string) {
    const r = await this.prisma.reglamentoLiga.findUnique({
      where: { ligaId },
      select: { archivo: true, nombre: true },
    });
    if (!r) throw new NotFoundException('Esta liga usa el reglamento IFAF');
    return r;
  }
}
