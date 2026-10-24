import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReglamentoService } from './reglamento.service';

const admin = { sub: 'adm', email: 'a@x.mx', rol: 'LIGA_ADMIN' };
const pdf = (bytes = '%PDF-1.7 hola') => ({
  buffer: Buffer.from(bytes),
  mimetype: 'application/pdf',
  originalname: 'Reglas Liga.pdf',
});

describe('ReglamentoService', () => {
  const prisma = {
    liga: { findFirst: jest.fn() },
    reglamentoLiga: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const ownership = { assertCanManageLiga: jest.fn() };
  const plan = { assertPermite: jest.fn() };
  const service = new ReglamentoService(
    prisma as never,
    ownership as never,
    plan as never,
  );
  beforeEach(() => jest.clearAllMocks());

  it('sube el PDF de una liga propia con plan que lo incluye', async () => {
    await service.subir('l1', pdf(), admin);
    expect(ownership.assertCanManageLiga).toHaveBeenCalledWith('l1', admin);
    expect(plan.assertPermite).toHaveBeenCalledWith('l1', 'REGLAMENTO', admin);
    expect(prisma.reglamentoLiga.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ligaId: 'l1' },
        create: expect.objectContaining({
          ligaId: 'l1',
          nombre: 'Reglas Liga.pdf',
        }) as object,
      }),
    );
  });

  it('solo acepta PDF (revisa la firma del archivo, no solo el tipo declarado)', async () => {
    await expect(
      service.subir(
        'l1',
        { ...pdf('<html>'), mimetype: 'application/pdf' },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.subir('l1', { ...pdf(), mimetype: 'image/png' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.reglamentoLiga.upsert).not.toHaveBeenCalled();
  });

  it('respeta el plan (Arbitraje o vencida no suben reglamento)', async () => {
    plan.assertPermite.mockRejectedValueOnce(new ForbiddenException());
    await expect(service.subir('l1', pdf(), admin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.reglamentoLiga.upsert).not.toHaveBeenCalled();
  });

  it('quitar el reglamento vuelve al de IFAF', async () => {
    await service.quitar('l1', admin);
    expect(ownership.assertCanManageLiga).toHaveBeenCalledWith('l1', admin);
    expect(prisma.reglamentoLiga.deleteMany).toHaveBeenCalledWith({
      where: { ligaId: 'l1' },
    });
  });

  it('info pública: nombre de la liga y si tiene reglamento propio (sin partidos rápidos)', async () => {
    prisma.liga.findFirst.mockResolvedValueOnce({
      id: 'l1',
      nombre: 'Liga X',
      reglamento: { nombre: 'r.pdf', updatedAt: new Date(0) },
    });
    expect(await service.info('l1')).toEqual({
      ligaId: 'l1',
      liga: 'Liga X',
      propio: { nombre: 'r.pdf', actualizado: new Date(0) },
    });
    expect(prisma.liga.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'l1', tipo: 'LIGA' } }),
    );
    prisma.liga.findFirst.mockResolvedValueOnce(null);
    await expect(service.info('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el PDF público da 404 si la liga no tiene reglamento propio', async () => {
    prisma.reglamentoLiga.findUnique.mockResolvedValueOnce(null);
    await expect(service.archivo('l1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
