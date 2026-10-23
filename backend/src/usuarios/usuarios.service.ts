import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../common/hashing';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import type { Rol } from '../common/roles';
import { AuthUser } from '../common/decorators/current-user.decorator';

/** Campos seguros para devolver por API (nunca el passwordHash). */
const publicSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UsuarioSelect;

/**
 * Lo que ve un LIGA_ADMIN de un árbitro para asignarlo: sin email (no lo
 * necesita y son datos de contacto de terceros).
 */
const arbitroAsignableSelect = {
  id: true,
  nombre: true,
  rol: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto) {
    try {
      return await this.prisma.usuario.create({
        data: {
          nombre: dto.nombre,
          email: dto.email,
          rol: dto.rol,
          passwordHash: hashPassword(dto.password),
        },
        select: publicSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El email "${dto.email}" ya está registrado`,
        );
      }
      throw error;
    }
  }

  /** Incluye el passwordHash: solo para el flujo de login. */
  findByEmailWithHash(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  /**
   * Lista usuarios; nunca expone el passwordHash.
   * - SUPERADMIN: todos (o los del rol pedido), con email e invitados.
   * - Cualquier otro (LIGA_ADMIN): solo los árbitros con cuenta, sin email
   *   y sin invitados de partidos rápidos, sea cual sea el `rol` pedido.
   *   Es lo que necesita para asignar árbitros a sus partidos.
   */
  async findAll(user: AuthUser, rol?: Rol) {
    if (user.rol === 'SUPERADMIN') {
      return this.prisma.usuario.findMany({
        where: rol ? { rol } : undefined,
        select: publicSelect,
        orderBy: { nombre: 'asc' },
      });
    }
    return this.prisma.usuario.findMany({
      where: { rol: 'ARBITRO', esInvitado: false },
      select: arbitroAsignableSelect,
      orderBy: { nombre: 'asc' },
    });
  }

  async findById(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: publicSelect,
    });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return usuario;
  }
}
