import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../common/hashing';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import type { Rol } from '../common/roles';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { OwnershipService } from '../common/ownership.service';

/** Campos seguros para devolver por API (nunca el passwordHash). */
const publicSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UsuarioSelect;

/** Lo mismo más la liga del árbitro, para listarlo y asignarlo. */
const arbitroConLigaSelect = {
  ...publicSelect,
  ligaArbitro: { select: { id: true, nombre: true } },
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private ownership: OwnershipService,
  ) {}

  /**
   * Alta de usuario.
   * - SUPERADMIN: cualquier rol; un árbitro puede quedar ligado a una liga.
   * - LIGA_ADMIN: solo árbitros, y siempre dentro de una liga suya.
   */
  async create(dto: CreateUsuarioDto, user: AuthUser) {
    if (user.rol !== 'SUPERADMIN') {
      if (dto.rol !== 'ARBITRO') {
        throw new ForbiddenException('Solo puedes dar de alta árbitros');
      }
      if (!dto.ligaId) {
        throw new BadRequestException('Elige la liga del árbitro');
      }
    }
    if (dto.ligaId && dto.rol !== 'ARBITRO') {
      throw new BadRequestException(
        'Solo un árbitro puede pertenecer a una liga',
      );
    }
    if (dto.ligaId) await this.ownership.assertCanManageLiga(dto.ligaId, user);

    try {
      return await this.prisma.usuario.create({
        data: {
          nombre: dto.nombre,
          email: dto.email,
          rol: dto.rol,
          passwordHash: hashPassword(dto.password),
          ligaArbitroId: dto.ligaId ?? null,
        },
        select: arbitroConLigaSelect,
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
    // Sin distinguir mayúsculas: el registro guarda el email en minúsculas y
    // la gente lo teclea como sea al iniciar sesión.
    return this.prisma.usuario.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
  }

  /**
   * Lista usuarios; nunca expone el passwordHash.
   * - SUPERADMIN: todos (o los del rol pedido), con email, liga e invitados.
   * - Cualquier otro (LIGA_ADMIN): solo los árbitros de SUS ligas (los que
   *   él dio de alta), sea cual sea el `rol` pedido; nunca invitados.
   */
  async findAll(user: AuthUser, rol?: Rol) {
    if (user.rol === 'SUPERADMIN') {
      return this.prisma.usuario.findMany({
        where: rol ? { rol } : undefined,
        select: arbitroConLigaSelect,
        orderBy: { nombre: 'asc' },
      });
    }
    return this.prisma.usuario.findMany({
      where: {
        rol: 'ARBITRO',
        esInvitado: false,
        ligaArbitro: { propietarioId: user.sub },
      },
      select: arbitroConLigaSelect,
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
