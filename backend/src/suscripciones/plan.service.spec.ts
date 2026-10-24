import { ForbiddenException } from '@nestjs/common';
import { PlanService } from './plan.service';

const admin = { sub: 'a', email: 'a@x.mx', rol: 'LIGA_ADMIN' };
const superadmin = { sub: 's', email: 's@x.mx', rol: 'SUPERADMIN' };
const dias = (n: number) => new Date(Date.now() + n * 86_400_000);

describe('PlanService', () => {
  const prisma = {
    suscripcion: { findUnique: jest.fn() },
    categoria: { findUnique: jest.fn() },
    equipo: { findUnique: jest.fn() },
  };
  const service = new PlanService(prisma as never);
  beforeEach(() => jest.clearAllMocks());

  it('una liga vencida no puede capturar, con un mensaje que dice qué hacer', async () => {
    prisma.suscripcion.findUnique.mockResolvedValueOnce({
      plan: 'COMPLETO',
      pruebaHasta: dias(-1),
      pagadoHasta: null,
    });
    await expect(
      service.assertPermite('l1', 'CAPTURAR', admin),
    ).rejects.toThrow(
      new ForbiddenException(
        'Tu liga no tiene un plan activo. Elige un plan en "Mi plan" para seguir capturando.',
      ),
    );
  });

  it('el plan Arbitraje no importa desde Excel', async () => {
    prisma.suscripcion.findUnique.mockResolvedValueOnce({
      plan: 'ARBITRAJE',
      pruebaHasta: null,
      pagadoHasta: dias(10),
    });
    await expect(
      service.assertPermite('l1', 'IMPORTAR', admin),
    ).rejects.toThrow(/plan Arbitraje no incluye importar/);
  });

  it('en prueba se permite todo', async () => {
    prisma.suscripcion.findUnique.mockResolvedValueOnce({
      plan: 'COMPLETO',
      pruebaHasta: dias(5),
      pagadoHasta: null,
    });
    await expect(
      service.assertPermite('l1', 'IMPORTAR', admin),
    ).resolves.toBeUndefined();
  });

  it('el superadmin no tiene límites ni consulta la suscripción', async () => {
    await expect(
      service.assertPermite('l1', 'CAPTURAR', superadmin),
    ).resolves.toBeUndefined();
    expect(prisma.suscripcion.findUnique).not.toHaveBeenCalled();
  });

  it('resuelve la liga desde una categoría o un equipo', async () => {
    prisma.categoria.findUnique.mockResolvedValueOnce({ ligaId: 'l9' });
    prisma.suscripcion.findUnique.mockResolvedValue({
      plan: 'CORTESIA',
      pruebaHasta: null,
      pagadoHasta: null,
    });
    await service.assertPermiteEnCategoria('c1', 'CAPTURAR', admin);
    prisma.equipo.findUnique.mockResolvedValueOnce({
      categoria: { ligaId: 'l9' },
    });
    await service.assertPermiteEnEquipo('e1', 'CAPTURAR', admin);
    expect(prisma.suscripcion.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ligaId: 'l9' } }),
    );
  });
});
