import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateJugadorDto } from './dto/create-jugador.dto';
import { UpdateJugadorDto } from './dto/update-jugador.dto';

@Injectable()
export class JugadoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(equipoId: string, dto: CreateJugadorDto, user: AuthUser) {
    await this.ownership.assertCanManageEquipo(equipoId, user);
    return this.prisma.jugador.create({ data: { ...dto, equipoId } });
  }

  async findAllByEquipo(equipoId: string) {
    return this.prisma.jugador.findMany({
      where: { equipoId },
      orderBy: { numeroJersey: 'asc' },
    });
  }

  async findOne(id: string) {
    const jugador = await this.prisma.jugador.findUnique({ where: { id } });
    if (!jugador) throw new NotFoundException(`Jugador ${id} no encontrado`);
    return jugador;
  }

  async update(id: string, dto: UpdateJugadorDto, user: AuthUser) {
    await this.ownership.assertCanManageJugador(id, user);
    return this.prisma.jugador.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    await this.ownership.assertCanManageJugador(id, user);
    await this.prisma.jugador.delete({ where: { id } });
    return { id, deleted: true };
  }
}
