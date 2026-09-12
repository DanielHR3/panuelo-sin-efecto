import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';
import { CreateAsignacionDto } from './dto/create-asignacion.dto';
import { ORDEN_ESTADO, type EstadoPartido } from './partido.constants';

@Injectable()
export class PartidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(categoriaId: string, dto: CreatePartidoDto, user: AuthUser) {
    await this.ownership.assertCanManageCategoria(categoriaId, user);

    if (dto.equipoLocalId === dto.equipoVisitanteId) {
      throw new BadRequestException(
        'El equipo local y el visitante no pueden ser el mismo',
      );
    }

    const equipos = await this.prisma.equipo.findMany({
      where: {
        id: { in: [dto.equipoLocalId, dto.equipoVisitanteId] },
        categoriaId,
      },
      select: { id: true },
    });
    if (equipos.length !== 2) {
      throw new BadRequestException(
        'Ambos equipos deben pertenecer a la categoría indicada',
      );
    }

    return this.prisma.partido.create({
      data: {
        categoriaId,
        fechaHora: new Date(dto.fechaHora),
        dificultad: dto.dificultad,
        estado: 'PROGRAMADO',
        equipoLocalId: dto.equipoLocalId,
        equipoVisitanteId: dto.equipoVisitanteId,
      },
    });
  }

  async findAllByCategoria(categoriaId: string) {
    return this.prisma.partido.findMany({
      where: { categoriaId },
      orderBy: { fechaHora: 'asc' },
      include: { equipoLocal: true, equipoVisitante: true },
    });
  }

  async findOne(id: string) {
    const partido = await this.prisma.partido.findUnique({
      where: { id },
      include: {
        equipoLocal: true,
        equipoVisitante: true,
        asignaciones: true,
      },
    });
    if (!partido) throw new NotFoundException(`Partido ${id} no encontrado`);
    return partido;
  }

  async update(id: string, dto: UpdatePartidoDto, user: AuthUser) {
    await this.ownership.assertCanManagePartido(id, user);

    const partido = await this.prisma.partido.findUnique({
      where: { id },
      select: { estado: true },
    });
    if (!partido) throw new NotFoundException(`Partido ${id} no encontrado`);

    if (dto.estado) {
      this.assertTransicionValida(partido.estado as EstadoPartido, dto.estado);
    }

    return this.prisma.partido.update({
      where: { id },
      data: {
        ...(dto.fechaHora ? { fechaHora: new Date(dto.fechaHora) } : {}),
        ...(dto.dificultad ? { dificultad: dto.dificultad } : {}),
        ...(dto.estado ? { estado: dto.estado } : {}),
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.ownership.assertCanManagePartido(id, user);
    await this.prisma.partido.delete({ where: { id } });
    return { id, deleted: true };
  }

  // --- Asignación arbitral ---

  async listarAsignaciones(partidoId: string) {
    await this.findOne(partidoId); // 404 si no existe
    return this.prisma.asignacionArbitral.findMany({
      where: { partidoId },
      include: {
        arbitro: { select: { id: true, nombre: true, email: true } },
      },
    });
  }

  async asignarArbitro(
    partidoId: string,
    dto: CreateAsignacionDto,
    user: AuthUser,
  ) {
    await this.ownership.assertCanManagePartido(partidoId, user);

    const arbitro = await this.prisma.usuario.findUnique({
      where: { id: dto.arbitroId },
      select: { rol: true },
    });
    if (!arbitro || arbitro.rol !== 'ARBITRO') {
      throw new BadRequestException(
        `El usuario ${dto.arbitroId} no existe o no tiene rol ARBITRO`,
      );
    }

    return this.prisma.asignacionArbitral.upsert({
      where: { partidoId_arbitroId: { partidoId, arbitroId: dto.arbitroId } },
      create: {
        partidoId,
        arbitroId: dto.arbitroId,
        rolEnCampo: dto.rolEnCampo,
      },
      update: { rolEnCampo: dto.rolEnCampo },
    });
  }

  async quitarArbitro(partidoId: string, arbitroId: string, user: AuthUser) {
    await this.ownership.assertCanManagePartido(partidoId, user);
    await this.prisma.asignacionArbitral.delete({
      where: { partidoId_arbitroId: { partidoId, arbitroId } },
    });
    return { partidoId, arbitroId, deleted: true };
  }

  private assertTransicionValida(
    actual: EstadoPartido,
    siguiente: EstadoPartido,
  ): void {
    if (ORDEN_ESTADO[siguiente] < ORDEN_ESTADO[actual]) {
      throw new BadRequestException(
        `Transición de estado inválida: ${actual} → ${siguiente} (no se puede retroceder)`,
      );
    }
  }
}
