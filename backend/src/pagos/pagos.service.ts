import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  extenderPagado,
  generarReferencia,
  montoCentavos,
  PERIODOS,
  PLANES_PAGADOS,
  type Periodo,
  type PlanPagado,
} from '../suscripciones/cobro';
import { CrearPagoDto } from './dto/crear-pago.dto';
import { ResolverPagoDto } from './dto/resolver-pago.dto';

export const ENTORNO_PAGOS = 'ENTORNO_PAGOS';
export const RELOJ_PAGOS = 'RELOJ_PAGOS';

const TIPOS_COMPROBANTE = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

/** Lo que sale por API de un pago: nunca los bytes del comprobante. */
export const pagoPublico = {
  id: true,
  ligaId: true,
  plan: true,
  periodo: true,
  montoCentavos: true,
  referencia: true,
  estado: true,
  motivoRechazo: true,
  comprobanteNombre: true,
  comprobanteTipo: true,
  resueltoAt: true,
  createdAt: true,
} as const;

interface ArchivoSubido {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

/**
 * Cobro por SPEI manual (diseño, Parte 5): el organizador abre un pago con
 * su referencia, transfiere y sube el comprobante; el SUPERADMIN lo confirma
 * (extiende el plan) o lo rechaza con motivo. Los datos bancarios vienen del
 * entorno (PAGO_CLABE, PAGO_BANCO, PAGO_BENEFICIARIO), nunca del código.
 */
@Injectable()
export class PagosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    @Optional()
    @Inject(ENTORNO_PAGOS)
    private readonly env: Record<string, string | undefined> = process.env,
    @Optional()
    @Inject(RELOJ_PAGOS)
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  datosDePago() {
    const clabe = this.env.PAGO_CLABE?.trim() || null;
    const banco = this.env.PAGO_BANCO?.trim() || null;
    const beneficiario = this.env.PAGO_BENEFICIARIO?.trim() || null;
    const precios = Object.fromEntries(
      PLANES_PAGADOS.map((plan) => [
        plan,
        Object.fromEntries(
          PERIODOS.map((periodo) => [periodo, montoCentavos(plan, periodo)]),
        ),
      ]),
    ) as Record<PlanPagado, Record<Periodo, number>>;
    return {
      configurado: Boolean(clabe && banco && beneficiario),
      clabe,
      banco,
      beneficiario,
      precios,
    };
  }

  async crear(ligaId: string, dto: CrearPagoDto, user: AuthUser) {
    await this.ownership.assertCanManageLiga(ligaId, user);
    const pendiente = await this.prisma.pago.findFirst({
      where: { ligaId, estado: 'PENDIENTE' },
      select: { id: true, referencia: true },
    });
    if (pendiente) {
      throw new ConflictException(
        `Ya tienes un pago pendiente (${pendiente.referencia}). Espera a que lo revisemos.`,
      );
    }
    return this.prisma.pago.create({
      data: {
        ligaId,
        plan: dto.plan,
        periodo: dto.periodo,
        montoCentavos: montoCentavos(dto.plan, dto.periodo),
        referencia: generarReferencia(),
        estado: 'PENDIENTE',
        creadoPorId: user.sub,
      },
      select: { ...pagoPublico, creadoPorId: true },
    });
  }

  async listarDeLiga(ligaId: string, user: AuthUser) {
    await this.ownership.assertCanManageLiga(ligaId, user);
    return this.prisma.pago.findMany({
      where: { ligaId },
      orderBy: { createdAt: 'desc' },
      select: pagoPublico,
    });
  }

  /** Para el SUPERADMIN: pagos por estado (por defecto, los pendientes). */
  async listar(estado: string | undefined, user: AuthUser) {
    if (user.rol !== 'SUPERADMIN')
      throw new ForbiddenException('Solo el administrador revisa pagos');
    return this.prisma.pago.findMany({
      where: { estado: estado ?? 'PENDIENTE' },
      orderBy: { createdAt: 'asc' },
      select: {
        ...pagoPublico,
        liga: {
          select: {
            nombre: true,
            propietario: { select: { nombre: true, email: true } },
          },
        },
      },
    });
  }

  private async pagoPropio(id: string, user: AuthUser) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      select: { id: true, ligaId: true, estado: true },
    });
    if (!pago) throw new NotFoundException(`Pago ${id} no encontrado`);
    await this.ownership.assertCanManageLiga(pago.ligaId, user);
    return pago;
  }

  async subirComprobante(id: string, archivo: ArchivoSubido, user: AuthUser) {
    const pago = await this.pagoPropio(id, user);
    if (pago.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Este pago ya fue revisado; no se puede cambiar el comprobante',
      );
    }
    if (!TIPOS_COMPROBANTE.includes(archivo.mimetype)) {
      throw new BadRequestException('Sube una foto (JPG, PNG, HEIC) o un PDF');
    }
    return this.prisma.pago.update({
      where: { id },
      data: {
        comprobante: archivo.buffer,
        comprobanteTipo: archivo.mimetype,
        comprobanteNombre: archivo.originalname.slice(0, 200),
      },
      select: pagoPublico,
    });
  }

  async comprobante(id: string, user: AuthUser) {
    await this.pagoPropio(id, user);
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      select: {
        comprobante: true,
        comprobanteTipo: true,
        comprobanteNombre: true,
      },
    });
    if (!pago?.comprobante)
      throw new NotFoundException('Este pago no tiene comprobante');
    return pago;
  }

  async resolver(id: string, dto: ResolverPagoDto, user: AuthUser) {
    if (user.rol !== 'SUPERADMIN')
      throw new ForbiddenException('Solo el administrador revisa pagos');
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      select: {
        id: true,
        ligaId: true,
        estado: true,
        plan: true,
        periodo: true,
      },
    });
    if (!pago) throw new NotFoundException(`Pago ${id} no encontrado`);
    if (pago.estado !== 'PENDIENTE')
      throw new BadRequestException('Este pago ya fue revisado');
    const ahora = this.ahora();

    if (dto.accion === 'RECHAZAR') {
      const motivo = dto.motivo?.trim();
      if (!motivo)
        throw new BadRequestException('Escribe el motivo del rechazo');
      return this.prisma.pago.update({
        where: { id },
        data: {
          estado: 'RECHAZADO',
          motivoRechazo: motivo,
          resueltoPorId: user.sub,
          resueltoAt: ahora,
        },
        select: pagoPublico,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      // Solo un PENDIENTE pasa a CONFIRMADO: dos clics simultáneos no
      // extienden el plan dos veces.
      const r = await tx.pago.updateMany({
        where: { id, estado: 'PENDIENTE' },
        data: {
          estado: 'CONFIRMADO',
          resueltoPorId: user.sub,
          resueltoAt: ahora,
        },
      });
      if (r.count === 0)
        throw new BadRequestException('Este pago ya fue revisado');
      const s = await tx.suscripcion.findUnique({
        where: { ligaId: pago.ligaId },
        select: { pagadoHasta: true, pruebaHasta: true },
      });
      // Quien paga durante su prueba no pierde los días gratis que le quedan:
      // el periodo pagado empieza al terminar lo que ya tenía.
      const ultimo = [s?.pagadoHasta, s?.pruebaHasta]
        .filter((d): d is Date => d instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      await tx.suscripcion.update({
        where: { ligaId: pago.ligaId },
        data: {
          plan: pago.plan,
          pagadoHasta: extenderPagado(
            ultimo ?? null,
            ahora,
            pago.periodo as Periodo,
          ),
        },
      });
    });
    return { id, estado: 'CONFIRMADO' };
  }
}
