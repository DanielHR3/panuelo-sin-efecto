import ExcelJS from 'exceljs';
import { ForbiddenException } from '@nestjs/common';
import { ImportacionService } from './importacion.service';

async function libro(hojas: Record<string, unknown[][]>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const [nombre, filas] of Object.entries(hojas)) {
    const ws = wb.addWorksheet(nombre);
    for (const f of filas) ws.addRow(f);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const user = { sub: 'adm', email: 'a@x.mx', rol: 'LIGA_ADMIN' };

describe('ImportacionService', () => {
  let n = 0;
  const id = (p: string) => `${p}${++n}`;
  const tx = {
    categoria: { create: jest.fn(() => Promise.resolve({ id: id('c') })) },
    equipo: { create: jest.fn(() => Promise.resolve({ id: id('e') })) },
    jugador: { createMany: jest.fn(), update: jest.fn() },
    partido: { createMany: jest.fn() },
  };
  const prisma = {
    categoria: { findMany: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const ownership = { assertCanManageLiga: jest.fn() };
  const plan = { assertPermite: jest.fn() };
  const service = new ImportacionService(
    prisma as never,
    ownership as never,
    plan as never,
  );

  let archivo: Buffer;
  beforeAll(async () => {
    archivo = await libro({
      Equipos: [
        ['Categoría', 'Equipo'],
        ['Varonil', 'Toros'],
        ['Varonil', 'Lobos'],
      ],
      Jugadores: [
        ['Categoría', 'Equipo', 'Nombre', 'Número'],
        ['Varonil', 'Toros', 'Ana', 7],
      ],
      Calendario: [
        ['Categoría', 'Fecha', 'Hora', 'Local', 'Visitante'],
        ['Varonil', '07/11/2026', '10:00', 'Toros', 'Lobos'],
      ],
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.categoria.findMany.mockResolvedValue([]);
  });

  it('valida que la liga sea del usuario antes de leer nada', async () => {
    ownership.assertCanManageLiga.mockRejectedValueOnce(
      new ForbiddenException(),
    );
    await expect(
      service.importar('l1', archivo, false, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.categoria.findMany).not.toHaveBeenCalled();
  });

  it('sin confirmar solo devuelve la vista previa, no escribe', async () => {
    const r = await service.importar('l1', archivo, false, user);
    expect(r.aplicado).toBe(false);
    expect(r.resumen).toMatchObject({
      categoriasNuevas: 1,
      equiposNuevos: 2,
      jugadoresNuevos: 1,
      partidosNuevos: 1,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('confirmado crea todo en una transacción con los ids resueltos', async () => {
    const r = await service.importar('l1', archivo, true, user);
    expect(r.aplicado).toBe(true);
    expect(tx.categoria.create).toHaveBeenCalledWith({
      data: { nombre: 'Varonil', ligaId: 'l1' },
      select: { id: true },
    });
    expect(tx.equipo.create).toHaveBeenCalledTimes(2);
    const [[jug]] = tx.jugador.createMany.mock.calls as [
      [{ data: { nombre: string; numeroJersey: string; equipoId: string }[] }],
    ];
    expect(jug.data).toEqual([
      expect.objectContaining({ nombre: 'Ana', numeroJersey: '7' }),
    ]);
    const [[par]] = tx.partido.createMany.mock.calls as [
      [{ data: Record<string, unknown>[] }],
    ];
    expect(par.data[0]).toMatchObject({
      estado: 'PROGRAMADO',
      dificultad: 'REGULAR',
      fechaHora: new Date('2026-11-07T16:00:00Z'),
    });
    expect(par.data[0].equipoLocalId).not.toEqual(
      par.data[0].equipoVisitanteId,
    );
  });

  it('con errores no escribe nada aunque se confirme', async () => {
    const malo = await libro({
      Jugadores: [
        ['Categoría', 'Equipo', 'Nombre', 'Número'],
        ['Varonil', 'Nadie', 'Ana', 7],
      ],
    });
    const r = await service.importar('l1', malo, true, user);
    expect(r.aplicado).toBe(false);
    expect(r.errores).toHaveLength(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
