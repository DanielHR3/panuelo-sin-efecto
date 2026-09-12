import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiscrepanciasService } from './discrepancias.service';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const admin: AuthUser = { sub: 'admin-1', email: 'a@a.mx', rol: 'LIGA_ADMIN' };
const LOCAL_ID = 'equipo-local';
const VISITA_ID = 'equipo-visitante';

const mockTx = {
  $executeRaw: jest.fn(),
  eventoPartido: { update: jest.fn(), findMany: jest.fn() },
  partido: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  discrepanciaEvento: { update: jest.fn(), count: jest.fn() },
};

const mockPrisma = {
  discrepanciaEvento: { findMany: jest.fn(), findUnique: jest.fn() },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
};

const mockOwnership = { assertCanManagePartido: jest.fn() };

function discrepanciaPendiente() {
  return {
    id: 'd1',
    partidoId: 'p1',
    eventoAId: 'e1',
    eventoBId: 'e2',
    estado: 'PENDIENTE',
    eventoDescartadoId: null,
    resueltoPorId: null,
    resolvedAt: null,
  };
}

describe('DiscrepanciasService', () => {
  let service: DiscrepanciasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx.$executeRaw.mockResolvedValue(1);
    mockTx.partido.findUniqueOrThrow.mockResolvedValue({
      equipoLocalId: LOCAL_ID,
      equipoVisitanteId: VISITA_ID,
    });
    mockTx.eventoPartido.findMany.mockResolvedValue([]);
    mockTx.discrepanciaEvento.update.mockResolvedValue({});
    mockTx.discrepanciaEvento.count.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscrepanciasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OwnershipService, useValue: mockOwnership },
      ],
    }).compile();
    service = module.get(DiscrepanciasService);
  });

  describe('listar', () => {
    it('valida la autorización de admin y devuelve las discrepancias con los eventos incluidos', async () => {
      mockPrisma.discrepanciaEvento.findMany.mockResolvedValueOnce([]);
      await service.listar('p1', admin);
      expect(mockOwnership.assertCanManagePartido).toHaveBeenCalledWith(
        'p1',
        admin,
      );
      const [arg] = mockPrisma.discrepanciaEvento.findMany.mock.calls[0] as [
        { where: unknown; include: { eventoA: unknown; eventoB: unknown } },
      ];
      expect(arg.where).toEqual({ partidoId: 'p1' });
      expect(arg.include.eventoA).toBeDefined();
      expect(arg.include.eventoB).toBeDefined();
    });
  });

  describe('resolver', () => {
    it('lanza NotFound si la discrepancia no existe', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.resolver('p1', 'd1', { accion: 'MANTENER_AMBOS' }, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza NotFound si la discrepancia pertenece a otro partido', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce({
        ...discrepanciaPendiente(),
        partidoId: 'otro-partido',
      });
      await expect(
        service.resolver('p1', 'd1', { accion: 'MANTENER_AMBOS' }, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza resolver una discrepancia ya RESUELTA', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce({
        ...discrepanciaPendiente(),
        estado: 'RESUELTA',
      });
      await expect(
        service.resolver('p1', 'd1', { accion: 'MANTENER_AMBOS' }, admin),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('bloquea la fila del partido (FOR UPDATE) antes de recalcular el marcador', async () => {
      // El recálculo del marcador compite con eventos.service.registrar por
      // la misma caché denormalizada: el mismo bloqueo por partido evita que
      // un evento tardío y una resolución pisen el marcador entre sí.
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      await service.resolver('p1', 'd1', { accion: 'DESCARTAR_A' }, admin);

      expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
      const sql = (
        mockTx.$executeRaw.mock.calls[0] as [TemplateStringsArray]
      )[0]
        .join('?')
        .toUpperCase();
      expect(sql).toContain('FOR UPDATE');
      const lockOrder = mockTx.$executeRaw.mock.invocationCallOrder[0];
      const updateOrder =
        mockTx.eventoPartido.update.mock.invocationCallOrder[0];
      expect(lockOrder).toBeLessThan(updateOrder);
    });

    it('DESCARTAR_A marca el eventoA como descartado, recalcula el marcador y cierra la discrepancia', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      await service.resolver('p1', 'd1', { accion: 'DESCARTAR_A' }, admin);

      expect(mockTx.eventoPartido.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { descartado: true },
      });
      expect(mockTx.partido.update).toHaveBeenCalled();
      expect(mockTx.discrepanciaEvento.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          estado: 'RESUELTA',
          eventoDescartadoId: 'e1',
          resueltoPorId: 'admin-1',
        }),
      });
    });

    it('DESCARTAR_B marca el eventoB como descartado', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      await service.resolver('p1', 'd1', { accion: 'DESCARTAR_B' }, admin);

      expect(mockTx.eventoPartido.update).toHaveBeenCalledWith({
        where: { id: 'e2' },
        data: { descartado: true },
      });
      expect(mockTx.discrepanciaEvento.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({ eventoDescartadoId: 'e2' }),
      });
    });

    it('MANTENER_AMBOS no descarta ningún evento ni recalcula el marcador', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      await service.resolver('p1', 'd1', { accion: 'MANTENER_AMBOS' }, admin);

      expect(mockTx.eventoPartido.update).not.toHaveBeenCalled();
      expect(mockTx.partido.update).not.toHaveBeenCalled();
      expect(mockTx.discrepanciaEvento.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          estado: 'RESUELTA',
          eventoDescartadoId: null,
        }),
      });
    });
  });

  describe('reabrir (deshace una resolución)', () => {
    function discrepanciaResuelta(eventoDescartadoId: string | null) {
      return {
        ...discrepanciaPendiente(),
        estado: 'RESUELTA',
        eventoDescartadoId,
        resueltoPorId: 'admin-1',
        resolvedAt: new Date('2026-09-20T19:00:00.000Z'),
      };
    }

    it('valida la autorización de admin sobre el partido', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaResuelta(null),
      );
      await service.reabrir('p1', 'd1', admin);
      expect(mockOwnership.assertCanManagePartido).toHaveBeenCalledWith(
        'p1',
        admin,
      );
    });

    it('lanza NotFound si no existe o pertenece a otro partido', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(null);
      await expect(service.reabrir('p1', 'd1', admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce({
        ...discrepanciaResuelta(null),
        partidoId: 'otro',
      });
      await expect(service.reabrir('p1', 'd1', admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rechaza reabrir una discrepancia que sigue PENDIENTE', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      await expect(service.reabrir('p1', 'd1', admin)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('si se había descartado un evento, lo reincorpora y recalcula el marcador', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaResuelta('e1'),
      );
      await service.reabrir('p1', 'd1', admin);

      expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
      expect(mockTx.eventoPartido.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { descartado: false },
      });
      expect(mockTx.partido.update).toHaveBeenCalled();
      expect(mockTx.discrepanciaEvento.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: {
          estado: 'PENDIENTE',
          eventoDescartadoId: null,
          resueltoPorId: null,
          resolvedAt: null,
        },
      });
    });

    it('si se había resuelto como "mantener ambos", solo vuelve a PENDIENTE', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaResuelta(null),
      );
      await service.reabrir('p1', 'd1', admin);

      expect(mockTx.eventoPartido.update).not.toHaveBeenCalled();
      expect(mockTx.partido.update).not.toHaveBeenCalled();
      expect(mockTx.discrepanciaEvento.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: {
          estado: 'PENDIENTE',
          eventoDescartadoId: null,
          resueltoPorId: null,
          resolvedAt: null,
        },
      });
    });

    it('no reincorpora un evento que otra discrepancia también descartó', async () => {
      // El mismo evento puede ser el "descartado" de dos discrepancias
      // distintas (p. ej. e1 emparejado con e2 y con e3). Reabrir una sola
      // no debe devolverlo al marcador mientras la otra siga descartándolo.
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaResuelta('e1'),
      );
      mockTx.discrepanciaEvento.count.mockResolvedValueOnce(1);
      await service.reabrir('p1', 'd1', admin);

      expect(mockTx.eventoPartido.update).not.toHaveBeenCalled();
      expect(mockTx.partido.update).not.toHaveBeenCalled();
      expect(mockTx.discrepanciaEvento.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({ estado: 'PENDIENTE' }),
      });
    });
  });
});
