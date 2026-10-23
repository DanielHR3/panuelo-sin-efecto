import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OwnershipService } from './ownership.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './decorators/current-user.decorator';

const mockPrisma = {
  liga: { findUnique: jest.fn() },
  categoria: { findUnique: jest.fn() },
  partido: { findUnique: jest.fn() },
};

const superadmin: AuthUser = {
  sub: 'boss',
  email: 's@x.mx',
  rol: 'SUPERADMIN',
};
const duenio: AuthUser = { sub: 'admin-1', email: 'a@x.mx', rol: 'LIGA_ADMIN' };
const otroAdmin: AuthUser = {
  sub: 'admin-2',
  email: 'b@x.mx',
  rol: 'LIGA_ADMIN',
};
const arbitro: AuthUser = { sub: 'ref-1', email: 'r@x.mx', rol: 'ARBITRO' };

/** Partido de la liga de `admin-1`; `asignados` son los arbitroId que la consulta devuelve. */
function partido(asignados: string[] = [], propietarioId = 'admin-1') {
  return {
    categoria: { liga: { propietarioId } },
    asignaciones: asignados.map((arbitroId) => ({ arbitroId })),
  };
}

describe('OwnershipService', () => {
  let service: OwnershipService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OwnershipService(mockPrisma as unknown as PrismaService);
  });

  describe('lectura de liga y categoría (misma regla que la escritura)', () => {
    it('un LIGA_ADMIN no puede leer la liga de otro (403)', async () => {
      mockPrisma.liga.findUnique.mockResolvedValueOnce({
        propietarioId: 'admin-1',
      });
      await expect(
        service.assertCanManageLiga('liga-1', otroAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('un LIGA_ADMIN no puede leer la categoría de otra liga (403)', async () => {
      mockPrisma.categoria.findUnique.mockResolvedValueOnce({
        liga: { propietarioId: 'admin-1' },
      });
      await expect(
        service.assertCanManageCategoria('cat-1', otroAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('404 si la liga no existe', async () => {
      mockPrisma.liga.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.assertCanManageLiga('nada', duenio),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assertCanReadPartido', () => {
    it('404 si el partido no existe', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.assertCanReadPartido('nada', superadmin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('SUPERADMIN lee cualquier partido', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(
        partido([], 'alguien-mas'),
      );
      await expect(
        service.assertCanReadPartido('p1', superadmin),
      ).resolves.toBeUndefined();
    });

    it('el dueño de la liga lee el partido', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(partido());
      await expect(
        service.assertCanReadPartido('p1', duenio),
      ).resolves.toBeUndefined();
    });

    it('un LIGA_ADMIN de otra liga recibe 403', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(partido());
      await expect(
        service.assertCanReadPartido('p1', otroAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('el árbitro asignado lee el partido', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(partido(['ref-1']));
      await expect(
        service.assertCanReadPartido('p1', arbitro),
      ).resolves.toBeUndefined();
    });

    it('un árbitro no asignado recibe 403', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(partido([]));
      await expect(
        service.assertCanReadPartido('p1', arbitro),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('un invitado lee los partidos de su liga RAPIDA (es el dueño)', async () => {
      const invitado: AuthUser = {
        sub: 'guest-1',
        email: 'g@invitado.panuelo',
        rol: 'ARBITRO',
      };
      mockPrisma.partido.findUnique.mockResolvedValueOnce(
        partido([], 'guest-1'),
      );
      await expect(
        service.assertCanReadPartido('p1', invitado),
      ).resolves.toBeUndefined();
    });

    it('solo consulta la asignación del propio usuario', async () => {
      mockPrisma.partido.findUnique.mockResolvedValueOnce(partido(['ref-1']));
      await service.assertCanReadPartido('p1', arbitro);
      expect(mockPrisma.partido.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
        select: {
          categoria: { select: { liga: { select: { propietarioId: true } } } },
          asignaciones: {
            where: { arbitroId: 'ref-1' },
            select: { arbitroId: true },
          },
        },
      });
    });
  });

  describe('filtroLigasVisibles', () => {
    it('SUPERADMIN ve todas las ligas, incluidas las RAPIDA', () => {
      expect(service.filtroLigasVisibles(superadmin)).toEqual({});
    });

    it('un LIGA_ADMIN solo ve sus ligas y nunca las RAPIDA', () => {
      expect(service.filtroLigasVisibles(duenio)).toEqual({
        propietarioId: 'admin-1',
        tipo: 'LIGA',
      });
    });

    it('un ARBITRO solo ve ligas propias que no sean RAPIDA', () => {
      expect(service.filtroLigasVisibles(arbitro)).toEqual({
        propietarioId: 'ref-1',
        tipo: 'LIGA',
      });
    });
  });
});
