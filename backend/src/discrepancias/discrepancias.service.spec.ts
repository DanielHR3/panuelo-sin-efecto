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
  eventoPartido: { findMany: jest.fn() },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
};

const mockOwnership = { assertCanManagePartido: jest.fn() };

const td = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  tipoEvento: 'TD',
  equipoId: LOCAL_ID,
  eventoAnuladoId: null,
  ...extra,
});
const reabrir = { id: 'r1', tipoEvento: 'REABRIR_PARTIDO', equipoId: null };
const anularE = (id: string, objetivo: string) => ({
  id,
  tipoEvento: 'ANULAR_EVENTO',
  equipoId: null,
  eventoAnuladoId: objetivo,
});

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
    // Por defecto ambos lados de la discrepancia siguen vigentes.
    mockTx.eventoPartido.findMany.mockResolvedValue([td('e1'), td('e2')]);
    mockPrisma.eventoPartido.findMany.mockResolvedValue([td('e1'), td('e2')]);
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

  describe('listar: vigencia de cada lado (ANULAR_EVENTO posterior)', () => {
    const fila = () => ({
      id: 'd1',
      eventoA: { id: 'e1', tipoEvento: 'TD', descartado: false },
      eventoB: { id: 'e2', tipoEvento: 'TD', descartado: false },
    });

    it('marca anulado=false en ambos lados si siguen vigentes', async () => {
      mockPrisma.discrepanciaEvento.findMany.mockResolvedValueOnce([fila()]);
      const [d] = await service.listar('p1', admin);
      expect(d.eventoA.anulado).toBe(false);
      expect(d.eventoB.anulado).toBe(false);
    });

    it('marca anulado=true en el lado anulado por ANULAR_EVENTO', async () => {
      mockPrisma.discrepanciaEvento.findMany.mockResolvedValueOnce([fila()]);
      mockPrisma.eventoPartido.findMany.mockResolvedValueOnce([
        td('e1'),
        td('e2'),
        reabrir,
        anularE('a1', 'e2'),
      ]);
      const [d] = await service.listar('p1', admin);
      expect(d.eventoA.anulado).toBe(false);
      expect(d.eventoB.anulado).toBe(true);
      const [arg] = mockPrisma.eventoPartido.findMany.mock.calls[0] as [
        { where: unknown; orderBy: unknown },
      ];
      expect(arg.where).toEqual({ partidoId: 'p1', descartado: false });
      expect(arg.orderBy).toEqual([{ timestamp: 'asc' }, { id: 'asc' }]);
    });

    it('un UNDO del ANULAR_EVENTO devuelve la vigencia (calculada al leer)', async () => {
      mockPrisma.discrepanciaEvento.findMany.mockResolvedValueOnce([fila()]);
      mockPrisma.eventoPartido.findMany.mockResolvedValueOnce([
        td('e1'),
        td('e2'),
        reabrir,
        anularE('a1', 'e2'),
        { id: 'u1', tipoEvento: 'UNDO_LAST_ACTION', equipoId: null },
      ]);
      const [d] = await service.listar('p1', admin);
      expect(d.eventoB.anulado).toBe(false);
    });
  });

  describe('resolver', () => {
    it('rechaza descartar A si B ya fue anulado', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      mockTx.eventoPartido.findMany.mockResolvedValue([
        td('e1'),
        td('e2'),
        reabrir,
        anularE('a1', 'e2'),
      ]);
      const p = service.resolver('p1', 'd1', { accion: 'DESCARTAR_A' }, admin);
      await expect(p).rejects.toBeInstanceOf(BadRequestException);
      await expect(p).rejects.toThrow(
        'El otro evento ya fue anulado; descartar este dejaría la jugada sin registrar',
      );
      expect(mockTx.eventoPartido.update).not.toHaveBeenCalled();
      expect(mockTx.discrepanciaEvento.update).not.toHaveBeenCalled();
    });

    it('permite descartar el lado anulado (B) si A sigue vigente', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      mockTx.eventoPartido.findMany.mockResolvedValue([
        td('e1'),
        td('e2'),
        reabrir,
        anularE('a1', 'e2'),
      ]);
      await service.resolver('p1', 'd1', { accion: 'DESCARTAR_B' }, admin);
      expect(mockTx.eventoPartido.update).toHaveBeenCalledWith({
        where: { id: 'e2' },
        data: { descartado: true },
      });
    });

    it('MANTENER_AMBOS sigue permitido aunque un lado esté anulado', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      mockTx.eventoPartido.findMany.mockResolvedValue([
        td('e1'),
        td('e2'),
        reabrir,
        anularE('a1', 'e1'),
      ]);
      await expect(
        service.resolver('p1', 'd1', { accion: 'MANTENER_AMBOS' }, admin),
      ).resolves.toBeDefined();
    });

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
