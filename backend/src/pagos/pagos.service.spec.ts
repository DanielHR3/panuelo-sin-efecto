import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PagosService } from './pagos.service';

const AHORA = new Date('2026-10-23T18:00:00Z');
const admin = { sub: 'adm', email: 'a@x.mx', rol: 'LIGA_ADMIN' };
const superadmin = { sub: 'boss', email: 's@x.mx', rol: 'SUPERADMIN' };

describe('PagosService', () => {
  const tx = {
    pago: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    suscripcion: { findUnique: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    pago: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const ownership = { assertCanManageLiga: jest.fn() };
  const env: Record<string, string | undefined> = {};
  const service = new PagosService(
    prisma as never,
    ownership as never,
    env,
    () => AHORA,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(env)) delete env[k];
  });

  describe('datosDePago', () => {
    it('sin variables de entorno dice que no está configurado (nunca inventa una CLABE)', () => {
      expect(service.datosDePago()).toEqual({
        configurado: false,
        clabe: null,
        banco: null,
        beneficiario: null,
        precios: {
          ARBITRAJE: { MENSUAL: 9_900, ANUAL: 99_000 },
          COMPLETO: { MENSUAL: 29_900, ANUAL: 299_000 },
        },
      });
    });

    it('con las variables muestra los datos para transferir', () => {
      Object.assign(env, {
        PAGO_CLABE: '012345678901234567',
        PAGO_BANCO: 'Banco X',
        PAGO_BENEFICIARIO: 'Nombre Y',
      });
      expect(service.datosDePago()).toMatchObject({
        configurado: true,
        clabe: '012345678901234567',
        banco: 'Banco X',
        beneficiario: 'Nombre Y',
      });
    });
  });

  describe('crear', () => {
    it('crea un pago pendiente con monto y referencia única', async () => {
      prisma.pago.findFirst.mockResolvedValueOnce(null);
      prisma.pago.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'p1', ...data }),
      );
      const p = await service.crear(
        'l1',
        { plan: 'COMPLETO', periodo: 'ANUAL' },
        admin,
      );
      expect(ownership.assertCanManageLiga).toHaveBeenCalledWith('l1', admin);
      expect(p).toMatchObject({
        plan: 'COMPLETO',
        periodo: 'ANUAL',
        montoCentavos: 299_000,
        estado: 'PENDIENTE',
        creadoPorId: 'adm',
      });
      expect(p.referencia).toMatch(/^PSE-[2-9A-HJKMNP-Z]{6}$/);
    });

    it('no deja abrir un segundo pago mientras haya uno pendiente', async () => {
      prisma.pago.findFirst.mockResolvedValueOnce({
        id: 'p0',
        referencia: 'PSE-AAAAAA',
      });
      await expect(
        service.crear('l1', { plan: 'COMPLETO', periodo: 'MENSUAL' }, admin),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('subirComprobante', () => {
    const pago = { id: 'p1', ligaId: 'l1', estado: 'PENDIENTE' };

    it('acepta foto o PDF de un pago pendiente propio', async () => {
      prisma.pago.findUnique.mockResolvedValueOnce(pago);
      prisma.pago.update.mockResolvedValueOnce({ id: 'p1' });
      await service.subirComprobante(
        'p1',
        {
          buffer: Buffer.from('x'),
          mimetype: 'image/jpeg',
          originalname: 'ticket.jpg',
        },
        admin,
      );
      expect(ownership.assertCanManageLiga).toHaveBeenCalledWith('l1', admin);
      expect(prisma.pago.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            comprobanteTipo: 'image/jpeg',
            comprobanteNombre: 'ticket.jpg',
          }) as object,
        }),
      );
    });

    it('rechaza otros tipos de archivo', async () => {
      prisma.pago.findUnique.mockResolvedValueOnce(pago);
      await expect(
        service.subirComprobante(
          'p1',
          {
            buffer: Buffer.from('x'),
            mimetype: 'text/html',
            originalname: 'a.html',
          },
          admin,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('no cambia el comprobante de un pago ya resuelto', async () => {
      prisma.pago.findUnique.mockResolvedValueOnce({
        ...pago,
        estado: 'CONFIRMADO',
      });
      await expect(
        service.subirComprobante(
          'p1',
          {
            buffer: Buffer.from('x'),
            mimetype: 'application/pdf',
            originalname: 'a.pdf',
          },
          admin,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('resolver', () => {
    const pendiente = {
      id: 'p1',
      ligaId: 'l1',
      estado: 'PENDIENTE',
      plan: 'ARBITRAJE',
      periodo: 'MENSUAL',
    };

    it('solo el superadmin confirma', async () => {
      await expect(
        service.resolver('p1', { accion: 'CONFIRMAR' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('confirmar fija el plan pagado y extiende pagadoHasta desde hoy', async () => {
      prisma.pago.findUnique.mockResolvedValueOnce(pendiente);
      tx.suscripcion.findUnique.mockResolvedValueOnce({ pagadoHasta: null });
      await service.resolver('p1', { accion: 'CONFIRMAR' }, superadmin);
      expect(tx.suscripcion.update).toHaveBeenCalledWith({
        where: { ligaId: 'l1' },
        data: {
          plan: 'ARBITRAJE',
          pagadoHasta: new Date('2026-11-23T18:00:00Z'),
        },
      });
      expect(tx.pago.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1', estado: 'PENDIENTE' },
          data: expect.objectContaining({
            estado: 'CONFIRMADO',
            resueltoPorId: 'boss',
          }) as object,
        }),
      );
    });

    it('dos confirmaciones simultáneas no extienden el plan dos veces', async () => {
      prisma.pago.findUnique.mockResolvedValueOnce(pendiente);
      tx.pago.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(
        service.resolver('p1', { accion: 'CONFIRMAR' }, superadmin),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.suscripcion.update).not.toHaveBeenCalled();
    });

    it('si paga durante la prueba, el periodo pagado empieza al terminar la prueba', async () => {
      prisma.pago.findUnique.mockResolvedValueOnce(pendiente);
      tx.suscripcion.findUnique.mockResolvedValueOnce({
        pagadoHasta: null,
        pruebaHasta: new Date('2026-11-10T18:00:00Z'),
      });
      await service.resolver('p1', { accion: 'CONFIRMAR' }, superadmin);
      expect(tx.suscripcion.update).toHaveBeenCalledWith({
        where: { ligaId: 'l1' },
        data: {
          plan: 'ARBITRAJE',
          pagadoHasta: new Date('2026-12-10T18:00:00Z'),
        },
      });
    });

    it('rechazar exige motivo y no toca la suscripción', async () => {
      prisma.pago.findUnique.mockResolvedValue(pendiente);
      await expect(
        service.resolver('p1', { accion: 'RECHAZAR' }, superadmin),
      ).rejects.toBeInstanceOf(BadRequestException);
      await service.resolver(
        'p1',
        { accion: 'RECHAZAR', motivo: 'No llegó la transferencia' },
        superadmin,
      );
      expect(tx.suscripcion.update).not.toHaveBeenCalled();
      expect(prisma.pago.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'RECHAZADO',
            motivoRechazo: 'No llegó la transferencia',
          }) as object,
        }),
      );
      prisma.pago.findUnique.mockReset();
    });

    it('un pago ya resuelto no se vuelve a resolver', async () => {
      prisma.pago.findUnique.mockResolvedValueOnce({
        ...pendiente,
        estado: 'CONFIRMADO',
      });
      await expect(
        service.resolver('p1', { accion: 'CONFIRMAR' }, superadmin),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404 si no existe', async () => {
      prisma.pago.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.resolver('x', { accion: 'CONFIRMAR' }, superadmin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
