import ExcelJS from 'exceljs';
import { leerLibro } from './leer-libro';
import { crearPlantilla } from './plantilla';

async function libro(hojas: Record<string, unknown[][]>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const [nombre, filas] of Object.entries(hojas)) {
    const ws = wb.addWorksheet(nombre);
    for (const f of filas) ws.addRow(f);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('leerLibro', () => {
  it('lee equipos, jugadores y calendario con encabezados en cualquier orden y con acentos', async () => {
    const buf = await libro({
      Equipos: [
        ['Equipo', 'Categoría', 'Color'],
        ['Toros', 'Varonil', '#B91C1C'],
        ['Lobos', 'Varonil', null],
      ],
      Jugadores: [
        ['CATEGORIA', 'equipo', 'Nombre', 'Número'],
        ['Varonil', 'Toros', 'Ana Ruiz', 7],
      ],
      Calendario: [
        ['Categoría', 'Fecha', 'Hora', 'Local', 'Visitante'],
        ['Varonil', '01/11/2026', '10:00', 'Toros', 'Lobos'],
      ],
    });
    const r = await leerLibro(buf);
    expect(r.errores).toEqual([]);
    expect(r.equipos).toEqual([
      { fila: 2, categoria: 'Varonil', equipo: 'Toros', color: '#B91C1C' },
      { fila: 3, categoria: 'Varonil', equipo: 'Lobos', color: null },
    ]);
    expect(r.jugadores).toEqual([
      {
        fila: 2,
        categoria: 'Varonil',
        equipo: 'Toros',
        nombre: 'Ana Ruiz',
        numero: '7',
      },
    ]);
    // 10:00 en la CDMX = 16:00 UTC.
    expect(r.partidos).toEqual([
      {
        fila: 2,
        categoria: 'Varonil',
        fechaHora: new Date('2026-11-01T16:00:00Z'),
        local: 'Toros',
        visitante: 'Lobos',
      },
    ]);
  });

  it('acepta fecha y hora como celdas de fecha de Excel', async () => {
    const buf = await libro({
      Calendario: [
        ['Categoría', 'Fecha', 'Hora', 'Local', 'Visitante'],
        [
          'Femenil',
          new Date(Date.UTC(2026, 10, 8)),
          new Date(Date.UTC(1899, 11, 30, 12, 30)),
          'Águilas',
          'Linces',
        ],
      ],
    });
    const r = await leerLibro(buf);
    expect(r.errores).toEqual([]);
    expect(r.partidos[0].fechaHora).toEqual(new Date('2026-11-08T18:30:00Z'));
  });

  it('reporta filas incompletas y fechas inválidas con hoja y fila, y salta filas vacías', async () => {
    const buf = await libro({
      Jugadores: [
        ['Categoría', 'Equipo', 'Nombre', 'Número'],
        ['Varonil', 'Toros', '', 7],
        [],
        ['Varonil', 'Toros', 'Leo', 'diez'],
      ],
      Calendario: [
        ['Categoría', 'Fecha', 'Hora', 'Local', 'Visitante'],
        ['Varonil', '31/02/2026', '10:00', 'Toros', 'Lobos'],
      ],
    });
    const r = await leerLibro(buf);
    expect(r.errores).toEqual([
      { hoja: 'Jugadores', fila: 2, mensaje: 'Falta el nombre' },
      { hoja: 'Jugadores', fila: 4, mensaje: 'El número "diez" no es válido' },
      {
        hoja: 'Calendario',
        fila: 2,
        mensaje: 'La fecha "31/02/2026" no es válida (usa dd/mm/aaaa)',
      },
    ]);
  });

  it('avisa si una hoja no tiene las columnas esperadas', async () => {
    const buf = await libro({ Equipos: [['Nombre del equipo']] });
    const r = await leerLibro(buf);
    expect(r.errores).toEqual([
      {
        hoja: 'Equipos',
        fila: 1,
        mensaje: 'Faltan columnas: Categoría, Equipo',
      },
    ]);
  });

  it('rechaza un archivo que no es Excel', async () => {
    const r = await leerLibro(Buffer.from('no soy un xlsx'));
    expect(r.errores).toEqual([
      {
        hoja: '',
        fila: 0,
        mensaje: 'El archivo no es un Excel (.xlsx) válido',
      },
    ]);
  });

  it('la plantilla descargable se lee sin errores y trae un ejemplo', async () => {
    const r = await leerLibro(await crearPlantilla());
    expect(r.errores).toEqual([]);
    expect(r.equipos.length).toBeGreaterThan(0);
    expect(r.jugadores.length).toBeGreaterThan(0);
    expect(r.partidos.length).toBeGreaterThan(0);
  });
});
