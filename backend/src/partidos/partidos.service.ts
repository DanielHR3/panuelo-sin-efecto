import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';
import { CreateAsignacionDto } from './dto/create-asignacion.dto';
import { SetMvpDto } from './dto/set-mvp.dto';
import { ORDEN_ESTADO, type EstadoPartido } from './partido.constants';

/** Campos públicos del árbitro asignado (nunca el passwordHash). */
const arbitroPublico = {
  id: true,
  nombre: true,
  email: true,
} satisfies Prisma.UsuarioSelect;

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
      include: {
        equipoLocal: true,
        equipoVisitante: true,
        asignaciones: { include: { arbitro: { select: arbitroPublico } } },
      },
    });
  }

  /**
   * Detalle completo, con el roster de ambos equipos: es lo que necesita el
   * marcador del árbitro para el selector de jugadores.
   */
  async findOne(id: string) {
    const partido = await this.prisma.partido.findUnique({
      where: { id },
      include: {
        equipoLocal: {
          include: { jugadores: { orderBy: { numeroJersey: 'asc' } } },
        },
        equipoVisitante: {
          include: { jugadores: { orderBy: { numeroJersey: 'asc' } } },
        },
        asignaciones: { include: { arbitro: { select: arbitroPublico } } },
        mvpJugador: true,
      },
    });
    if (!partido) throw new NotFoundException(`Partido ${id} no encontrado`);
    return partido;
  }

  /** Partidos donde el usuario tiene una asignación arbitral. Para la PWA del árbitro. */
  async findAsignados(arbitroId: string) {
    return this.prisma.partido.findMany({
      where: { asignaciones: { some: { arbitroId } } },
      orderBy: { fechaHora: 'asc' },
      include: {
        equipoLocal: true,
        equipoVisitante: true,
        categoria: { include: { liga: true } },
      },
    });
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
      include: { arbitro: { select: arbitroPublico } },
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

  /**
   * MVP del partido (HU-2.5). Autorización igual a la de registrar eventos
   * (árbitro asignado o dueño de la liga o SUPERADMIN) porque quien lo
   * dispara normalmente es el árbitro en cancha, no un admin — a diferencia
   * de `update()`/`remove()`, que son solo-admin (ver `assertCanManagePartido`).
   */
  async setMvp(id: string, dto: SetMvpDto, user: AuthUser) {
    const partido = await this.prisma.partido.findUnique({
      where: { id },
      select: {
        estado: true,
        equipoLocalId: true,
        equipoVisitanteId: true,
        categoria: { select: { liga: { select: { propietarioId: true } } } },
        asignaciones: { select: { arbitroId: true } },
      },
    });
    if (!partido) throw new NotFoundException(`Partido ${id} no encontrado`);

    this.assertPuedeElegirMvp(partido, user);

    if (partido.estado !== 'FINALIZADO') {
      throw new BadRequestException(
        'Solo se puede asignar el MVP de un partido finalizado',
      );
    }

    const jugador = await this.prisma.jugador.findUnique({
      where: { id: dto.jugadorId },
      select: { equipoId: true },
    });
    if (
      !jugador ||
      ![partido.equipoLocalId, partido.equipoVisitanteId].includes(
        jugador.equipoId,
      )
    ) {
      throw new BadRequestException(
        'jugadorId debe pertenecer al roster de alguno de los dos equipos del partido',
      );
    }

    return this.prisma.partido.update({
      where: { id },
      data: { mvpJugadorId: dto.jugadorId },
      include: { mvpJugador: true },
    });
  }

  private assertPuedeElegirMvp(
    partido: {
      categoria: { liga: { propietarioId: string } };
      asignaciones: { arbitroId: string }[];
    },
    user: AuthUser,
  ): void {
    const esDuenoOSuperadmin =
      user.rol === 'SUPERADMIN' ||
      partido.categoria.liga.propietarioId === user.sub;
    const esArbitroAsignado = partido.asignaciones.some(
      (a) => a.arbitroId === user.sub,
    );
    if (!esDuenoOSuperadmin && !esArbitroAsignado) {
      throw new ForbiddenException(
        'Solo el árbitro asignado o el dueño de la liga pueden elegir el MVP de este partido',
      );
    }
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
