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
  eventoPartido: { update: jest.fn(), findMany: jest.fn() },
  partido: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  discrepanciaEvento: { update: jest.fn() },
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
    mockTx.partido.findUniqueOrThrow.mockResolvedValue({
      equipoLocalId: LOCAL_ID,
      equipoVisitanteId: VISITA_ID,
    });
    mockTx.eventoPartido.findMany.mockResolvedValue([]);
    mockTx.discrepanciaEvento.update.mockResolvedValue({});

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
});
