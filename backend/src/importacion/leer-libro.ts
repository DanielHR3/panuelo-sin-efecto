import ExcelJS from 'exceljs';

/** Una fila con problema, para mostrarla tal cual al organizador. */
export interface ErrorImportacion {
  hoja: string;
  fila: number;
  mensaje: string;
}

export interface EquipoFila {
  fila: number;
  categoria: string;
  equipo: string;
  color: string | null;
}

export interface JugadorFila {
  fila: number;
  categoria: string;
  equipo: string;
  nombre: string;
  numero: string;
}

export interface PartidoFila {
  fila: number;
  categoria: string;
  fechaHora: Date;
  local: string;
  visitante: string;
}

export interface LibroLeido {
  equipos: EquipoFila[];
  jugadores: JugadorFila[];
  partidos: PartidoFila[];
  errores: ErrorImportacion[];
}

/** La CDMX no cambia de horario desde 2022: siempre UTC-6. */
const DESFASE_MEXICO_MS = 6 * 3_600_000;

type Campo = { clave: string; titulo: string; obligatorio: boolean };

const HOJAS: Record<'Equipos' | 'Jugadores' | 'Calendario', Campo[]> = {
  Equipos: [
    { clave: 'categoria', titulo: 'Categoría', obligatorio: true },
    { clave: 'equipo', titulo: 'Equipo', obligatorio: true },
    { clave: 'color', titulo: 'Color', obligatorio: false },
  ],
  Jugadores: [
    { clave: 'categoria', titulo: 'Categoría', obligatorio: true },
    { clave: 'equipo', titulo: 'Equipo', obligatorio: true },
    { clave: 'nombre', titulo: 'Nombre', obligatorio: true },
    { clave: 'numero', titulo: 'Número', obligatorio: true },
  ],
  Calendario: [
    { clave: 'categoria', titulo: 'Categoría', obligatorio: true },
    { clave: 'fecha', titulo: 'Fecha', obligatorio: true },
    { clave: 'hora', titulo: 'Hora', obligatorio: true },
    { clave: 'local', titulo: 'Local', obligatorio: true },
    { clave: 'visitante', titulo: 'Visitante', obligatorio: true },
  ],
};

/** "Categoría" → "categoria": encabezados sin acentos, mayúsculas ni espacios extra. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Texto de una celda, sea cadena, número, fórmula o texto enriquecido. */
function texto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    if ('richText' in valor)
      return valor.richText
        .map((t) => t.text)
        .join('')
        .trim();
    if ('text' in valor && typeof valor.text === 'string')
      return valor.text.trim();
    if ('result' in valor) return texto(valor.result);
    return '';
  }
  return String(valor).trim();
}

/** Día del calendario: celda de fecha de Excel o texto dd/mm/aaaa. */
function leerFecha(
  valor: ExcelJS.CellValue,
): { y: number; m: number; d: number } | null {
  if (valor instanceof Date) {
    return {
      y: valor.getUTCFullYear(),
      m: valor.getUTCMonth() + 1,
      d: valor.getUTCDate(),
    };
  }
  const t = texto(valor);
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t);
  if (!m) return null;
  const [d, mes, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const prueba = new Date(Date.UTC(y, mes - 1, d));
  if (prueba.getUTCMonth() !== mes - 1 || prueba.getUTCDate() !== d)
    return null;
  return { y, m: mes, d };
}

/** Hora del partido: celda de hora de Excel, fracción de día o texto hh:mm. */
function leerHora(valor: ExcelJS.CellValue): { h: number; min: number } | null {
  if (valor instanceof Date)
    return { h: valor.getUTCHours(), min: valor.getUTCMinutes() };
  if (typeof valor === 'number' && valor >= 0 && valor < 1) {
    const total = Math.round(valor * 24 * 60);
    return { h: Math.floor(total / 60), min: total % 60 };
  }
  const m = /^(\d{1,2}):(\d{2})/.exec(texto(valor));
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2])];
  return h < 24 && min < 60 ? { h, min } : null;
}

function hoja(
  wb: ExcelJS.Workbook,
  nombre: string,
): ExcelJS.Worksheet | undefined {
  return wb.worksheets.find((ws) => normalizar(ws.name) === normalizar(nombre));
}

/**
 * Recorre una hoja: ubica columnas por encabezado (fila 1) y devuelve las
 * filas con datos, saltando las vacías. Faltan columnas → un solo error.
 */
function filasDe(
  ws: ExcelJS.Worksheet | undefined,
  nombre: keyof typeof HOJAS,
  errores: ErrorImportacion[],
): { fila: number; celdas: Record<string, ExcelJS.CellValue> }[] {
  if (!ws) return [];
  const campos = HOJAS[nombre];
  const columna = new Map<string, number>();
  ws.getRow(1).eachCell((celda, col) => {
    const campo = campos.find(
      (c) => normalizar(c.titulo) === normalizar(texto(celda.value)),
    );
    if (campo && !columna.has(campo.clave)) columna.set(campo.clave, col);
  });
  const faltan = campos.filter((c) => c.obligatorio && !columna.has(c.clave));
  if (faltan.length > 0) {
    errores.push({
      hoja: nombre,
      fila: 1,
      mensaje: `Faltan columnas: ${faltan.map((c) => c.titulo).join(', ')}`,
    });
    return [];
  }
  const filas: { fila: number; celdas: Record<string, ExcelJS.CellValue> }[] =
    [];
  for (let n = 2; n <= ws.rowCount; n++) {
    const row = ws.getRow(n);
    const celdas: Record<string, ExcelJS.CellValue> = {};
    for (const [clave, col] of columna) celdas[clave] = row.getCell(col).value;
    if (
      Object.values(celdas).every(
        (v) => texto(v) === '' && !(v instanceof Date),
      )
    )
      continue;
    filas.push({ fila: n, celdas });
  }
  return filas;
}

/** Lee el .xlsx de una liga. No toca la base: solo valida la forma de cada fila. */
export async function leerLibro(archivo: Buffer): Promise<LibroLeido> {
  const wb = new ExcelJS.Workbook();
  try {
    // exceljs acepta ArrayBuffer/Buffer; el cast evita el choque de tipos de Node.
    await wb.xlsx.load(archivo as unknown as ArrayBuffer);
  } catch {
    return {
      equipos: [],
      jugadores: [],
      partidos: [],
      errores: [
        {
          hoja: '',
          fila: 0,
          mensaje: 'El archivo no es un Excel (.xlsx) válido',
        },
      ],
    };
  }

  const errores: ErrorImportacion[] = [];
  const falta = (h: string, fila: number, que: string) =>
    errores.push({ hoja: h, fila, mensaje: `Falta ${que}` });

  const equipos: EquipoFila[] = [];
  for (const { fila, celdas } of filasDe(
    hoja(wb, 'Equipos'),
    'Equipos',
    errores,
  )) {
    const categoria = texto(celdas.categoria);
    const equipo = texto(celdas.equipo);
    if (!categoria) falta('Equipos', fila, 'la categoría');
    else if (!equipo) falta('Equipos', fila, 'el nombre del equipo');
    else
      equipos.push({
        fila,
        categoria,
        equipo,
        color: texto(celdas.color) || null,
      });
  }

  const jugadores: JugadorFila[] = [];
  for (const { fila, celdas } of filasDe(
    hoja(wb, 'Jugadores'),
    'Jugadores',
    errores,
  )) {
    const categoria = texto(celdas.categoria);
    const equipo = texto(celdas.equipo);
    const nombre = texto(celdas.nombre);
    const numero = texto(celdas.numero);
    if (!categoria) falta('Jugadores', fila, 'la categoría');
    else if (!equipo) falta('Jugadores', fila, 'el equipo');
    else if (!nombre) falta('Jugadores', fila, 'el nombre');
    else if (!/^\d{1,3}$/.test(numero))
      errores.push({
        hoja: 'Jugadores',
        fila,
        mensaje: `El número "${numero}" no es válido`,
      });
    else
      jugadores.push({
        fila,
        categoria,
        equipo,
        nombre,
        numero: String(Number(numero)),
      });
  }

  const partidos: PartidoFila[] = [];
  for (const { fila, celdas } of filasDe(
    hoja(wb, 'Calendario'),
    'Calendario',
    errores,
  )) {
    const categoria = texto(celdas.categoria);
    const local = texto(celdas.local);
    const visitante = texto(celdas.visitante);
    const dia = leerFecha(celdas.fecha);
    const hora = leerHora(celdas.hora);
    if (!categoria) falta('Calendario', fila, 'la categoría');
    else if (!dia)
      errores.push({
        hoja: 'Calendario',
        fila,
        mensaje: `La fecha "${texto(celdas.fecha)}" no es válida (usa dd/mm/aaaa)`,
      });
    else if (!hora)
      errores.push({
        hoja: 'Calendario',
        fila,
        mensaje: `La hora "${texto(celdas.hora)}" no es válida (usa hh:mm)`,
      });
    else if (!local || !visitante)
      falta('Calendario', fila, 'el equipo local o el visitante');
    else
      partidos.push({
        fila,
        categoria,
        fechaHora: new Date(
          Date.UTC(dia.y, dia.m - 1, dia.d, hora.h, hora.min) +
            DESFASE_MEXICO_MS,
        ),
        local,
        visitante,
      });
  }

  return { equipos, jugadores, partidos, errores };
}
