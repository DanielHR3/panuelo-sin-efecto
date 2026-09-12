import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateLigaDto } from './dto/create-liga.dto';

@Injectable()
export class LigasService {
  constructor(private prisma: PrismaService) {}

  async create(createLigaDto: CreateLigaDto, currentUser: AuthUser) {
    // Solo un SUPERADMIN puede crear una liga a nombre de otro usuario.
    const propietarioId =
      currentUser.rol === 'SUPERADMIN' && createLigaDto.propietarioId
        ? createLigaDto.propietarioId
        : currentUser.sub;

    try {
      return await this.prisma.liga.create({
        data: { nombre: createLigaDto.nombre, propietarioId },
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
}
