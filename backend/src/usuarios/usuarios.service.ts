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

/** Campos seguros para devolver por API (nunca el passwordHash). */
const publicSelect = {
  id: true,
  nombre: true,
  email: true,
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
   * Lista usuarios, opcionalmente filtrados por rol. Pensado para que un
   * LIGA_ADMIN o SUPERADMIN encuentre árbitros a la hora de asignarlos a un
   * partido; nunca expone el passwordHash.
   */
  async findAll(rol?: Rol) {
    return this.prisma.usuario.findMany({
      where: rol ? { rol } : undefined,
      select: publicSelect,
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
