import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateLigaDto } from './dto/create-liga.dto';
import { UpdateLigaDto } from './dto/update-liga.dto';

/** HU-1.1: el formulario manda "" para "sin logo"; en la base es null. */
function normalizarLogo(
  logoUrl: string | undefined,
): string | null | undefined {
  if (logoUrl === undefined) return undefined;
  const limpio = logoUrl.trim();
  return limpio === '' ? null : limpio;
}

@Injectable()
export class LigasService {
  constructor(
    private prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(createLigaDto: CreateLigaDto, currentUser: AuthUser) {
    // Solo un SUPERADMIN puede crear una liga a nombre de otro usuario.
    const propietarioId =
      currentUser.rol === 'SUPERADMIN' && createLigaDto.propietarioId
        ? createLigaDto.propietarioId
        : currentUser.sub;

    try {
      return await this.prisma.liga.create({
        data: {
          nombre: createLigaDto.nombre,
          propietarioId,
          logoUrl: normalizarLogo(createLigaDto.logoUrl) ?? null,
          registraMvp: createLigaDto.registraMvp ?? true,
          registraIntercepciones: createLigaDto.registraIntercepciones ?? true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          `El propietarioId "${propietarioId}" no corresponde a un usuario existente`,
        );
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.liga.findMany({
      include: { categorias: true },
    });
  }

  async findOne(id: string) {
    const liga = await this.prisma.liga.findUnique({
      where: { id },
      include: { categorias: true },
    });
    if (!liga) throw new NotFoundException(`Liga con ID ${id} no encontrada`);
    return liga;
  }

  async update(id: string, dto: UpdateLigaDto, user: AuthUser) {
    await this.ownership.assertCanManageLiga(id, user);
    const data: Prisma.LigaUpdateInput = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.logoUrl !== undefined) data.logoUrl = normalizarLogo(dto.logoUrl);
    if (dto.registraMvp !== undefined) data.registraMvp = dto.registraMvp;
    if (dto.registraIntercepciones !== undefined) {
      data.registraIntercepciones = dto.registraIntercepciones;
    }
    return this.prisma.liga.update({ where: { id }, data });
  }

  async remove(id: string, user: AuthUser) {
    await this.ownership.assertCanManageLiga(id, user);
    try {
      await this.prisma.liga.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2003' || error.code === 'P2014')
      ) {
        throw new BadRequestException(
          'No se puede eliminar la liga: primero elimina sus categorías',
        );
      }
      throw error;
    }
    return { id, deleted: true };
  }
}
