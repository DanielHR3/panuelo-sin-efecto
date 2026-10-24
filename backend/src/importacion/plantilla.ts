import ExcelJS from 'exceljs';

const ENCABEZADO: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: 'FF0A1A33' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD23F' } },
};

const INSTRUCCIONES = [
  'Cómo llenar esta plantilla',
  '',
  '1. Equipos: una fila por equipo con su categoría (Varonil, Femenil, Mixto…). El color es opcional (#RRGGBB).',
  '2. Jugadores: una fila por jugador. Equipo y categoría deben coincidir con la hoja Equipos o con equipos que ya tengas.',
  '3. Calendario: fecha dd/mm/aaaa y hora hh:mm en hora del centro de México.',
  '',
  'Puedes subir el archivo varias veces: los equipos se reutilizan por nombre, un jugador con el mismo número se actualiza y los partidos repetidos se omiten. Nada se borra.',
  'Antes de guardar verás una vista previa con lo que se va a crear y cualquier error por fila.',
  'Borra las filas de ejemplo antes de subir tu archivo.',
  '¿Usas Google Sheets? Archivo → Descargar → Microsoft Excel (.xlsx).',
];

function hoja(
  wb: ExcelJS.Workbook,
  nombre: string,
  columnas: [string, number][],
  ejemplo: unknown[][],
) {
  const ws = wb.addWorksheet(nombre);
  ws.columns = columnas.map(([header, width]) => ({ header, width }));
  ws.getRow(1).eachCell((c) => Object.assign(c, { style: ENCABEZADO }));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const fila of ejemplo) ws.addRow(fila);
}

/** Plantilla .xlsx con instrucciones y una fila de ejemplo por hoja. */
export async function crearPlantilla(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Pañuelo sin efecto';

  const ayuda = wb.addWorksheet('Instrucciones');
  ayuda.getColumn(1).width = 110;
  INSTRUCCIONES.forEach((linea, i) => {
    const celda = ayuda.getCell(i + 1, 1);
    celda.value = linea;
    celda.alignment = { wrapText: true };
    if (i === 0) celda.font = { bold: true, size: 14 };
  });

  hoja(
    wb,
    'Equipos',
    [
      ['Categoría', 16],
      ['Equipo', 28],
      ['Color', 12],
    ],
    [
      ['Varonil', 'Toros', '#B91C1C'],
      ['Varonil', 'Lobos', '#374151'],
    ],
  );
  hoja(
    wb,
    'Jugadores',
    [
      ['Categoría', 16],
      ['Equipo', 28],
      ['Nombre', 32],
      ['Número', 10],
    ],
    [
      ['Varonil', 'Toros', 'Ana Ruiz', 7],
      ['Varonil', 'Lobos', 'Beto Soto', 12],
    ],
  );
  hoja(
    wb,
    'Calendario',
    [
      ['Categoría', 16],
      ['Fecha', 14],
      ['Hora', 10],
      ['Local', 28],
      ['Visitante', 28],
    ],
    [['Varonil', '07/11/2026', '10:00', 'Toros', 'Lobos']],
  );

  return Buffer.from(await wb.xlsx.writeBuffer());
}
