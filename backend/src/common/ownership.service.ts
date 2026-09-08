import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './decorators/current-user.decorator';

/**
 * Autorización a nivel de recurso: un LIGA_ADMIN (o ARBITRO) solo puede
 * gestionar recursos que cuelgan de una liga de su propiedad. Un SUPERADMIN
 * puede gestionar cualquiera.
 *
 * Cada método resuelve el `propietarioId` de la liga dueña del recurso en una
 * sola consulta y lo compara con el usuario autenticado. Lanza NotFound si el
 * recurso no existe y Forbidden si no es el propietario.
 */
@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  private assertOwner(
    propietarioId: string | undefined,
    user: AuthUser,
    recurso: string,
    id: string,
  ): void {
    if (propietarioId === undefined) {
      throw new NotFoundException(`${recurso} ${id} no encontrado`);
    }
    if (user.rol === 'SUPERADMIN') return;
    if (propietarioId !== user.sub) {
      throw new ForbiddenException(
        `No tienes permiso sobre ${recurso.toLowerCase()} ${id}`,
      );
    }
  }

  async assertCanManageLiga(ligaId: string, user: AuthUser): Promise<void> {
    const liga = await this.prisma.liga.findUnique({
      where: { id: ligaId },
      select: { propietarioId: true },
    });
    this.assertOwner(liga?.propietarioId, user, 'Liga', ligaId);
  }

  async assertCanManageCategoria(
    categoriaId: string,
    user: AuthUser,
  ): Promise<void> {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
      select: { liga: { select: { propietarioId: true } } },
    });
    this.assertOwner(
      categoria?.liga.propietarioId,
      user,
      'Categoría',
      categoriaId,
    );
  }

  async assertCanManageEquipo(equipoId: string, user: AuthUser): Promise<void> {
    const equipo = await this.prisma.equipo.findUnique({
      where: { id: equipoId },
      select: {
        categoria: { select: { liga: { select: { propietarioId: true } } } },
      },
    });
    this.assertOwner(
      equipo?.categoria.liga.propietarioId,
      user,
      'Equipo',
      equipoId,
    );
  }

  async assertCanManageJugador(
    jugadorId: string,
    user: AuthUser,
  ): Promise<void> {
    const jugador = await this.prisma.jugador.findUnique({
      where: { id: jugadorId },
      select: {
        equipo: {
          select: {
            categoria: {
              select: { liga: { select: { propietarioId: true } } },
            },
          },
        },
      },
    });
    this.assertOwner(
      jugador?.equipo.categoria.liga.propietarioId,
      user,
      'Jugador',
      jugadorId,
    );
  }

  async assertCanManagePartido(
    partidoId: string,
    user: AuthUser,
  ): Promise<void> {
    const partido = await this.prisma.partido.findUnique({
      where: { id: partidoId },
      select: {
        categoria: { select: { liga: { select: { propietarioId: true } } } },
      },
    });
    this.assertOwner(
      partido?.categoria.liga.propietarioId,
      user,
      'Partido',
      partidoId,
    );
  }
}
