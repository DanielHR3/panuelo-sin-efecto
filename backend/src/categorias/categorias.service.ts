import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(ligaId: string, dto: CreateCategoriaDto, user: AuthUser) {
    await this.ownership.assertCanManageLiga(ligaId, user);
    return this.prisma.categoria.create({ data: { ...dto, ligaId } });
  }

  async findAllByLiga(ligaId: string) {
    return this.prisma.categoria.findMany({
      where: { ligaId },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: { equipos: true },
    });
    if (!categoria) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }
    return categoria;
  }

  async update(id: string, dto: UpdateCategoriaDto, user: AuthUser) {
    await this.ownership.assertCanManageCategoria(id, user);
    return this.prisma.categoria.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    await this.ownership.assertCanManageCategoria(id, user);
    await this.prisma.categoria.delete({ where: { id } });
    return { id, deleted: true };
  }
}
