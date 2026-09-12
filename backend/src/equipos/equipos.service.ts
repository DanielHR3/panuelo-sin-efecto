import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';

@Injectable()
export class EquiposService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(categoriaId: string, dto: CreateEquipoDto, user: AuthUser) {
    await this.ownership.assertCanManageCategoria(categoriaId, user);
    return this.prisma.equipo.create({ data: { ...dto, categoriaId } });
  }

  async findAllByCategoria(categoriaId: string) {
    return this.prisma.equipo.findMany({
      where: { categoriaId },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { id },
      include: { jugadores: { orderBy: { numeroJersey: 'asc' } } },
    });
    if (!equipo) throw new NotFoundException(`Equipo ${id} no encontrado`);
    return equipo;
  }

  async update(id: string, dto: UpdateEquipoDto, user: AuthUser) {
    await this.ownership.assertCanManageEquipo(id, user);
    return this.prisma.equipo.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    await this.ownership.assertCanManageEquipo(id, user);
    await this.prisma.equipo.delete({ where: { id } });
    return { id, deleted: true };
  }
}
