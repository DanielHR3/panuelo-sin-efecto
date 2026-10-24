import { randomInt } from 'node:crypto';
import type { ResumenSuscripcion } from './suscripcion';

export const PLANES_PAGADOS = ['ARBITRAJE', 'COMPLETO'] as const;
export type PlanPagado = (typeof PLANES_PAGADOS)[number];
export const PERIODOS = ['MENSUAL', 'ANUAL'] as const;
export type Periodo = (typeof PERIODOS)[number];

/** Precios en centavos de MXN, IVA incluido (diseño, Parte 5). */
export const PRECIO_MENSUAL_CENTAVOS: Record<PlanPagado, number> = {
  ARBITRAJE: 9_900,
  COMPLETO: 29_900,
};
/** El pago anual cuesta 10 meses y cubre 12. */
const MESES_COBRADOS: Record<Periodo, number> = { MENSUAL: 1, ANUAL: 10 };
const MESES_CUBIERTOS: Record<Periodo, number> = { MENSUAL: 1, ANUAL: 12 };

export function montoCentavos(plan: PlanPagado, periodo: Periodo): number {
  return PRECIO_MENSUAL_CENTAVOS[plan] * MESES_COBRADOS[periodo];
}

/** Suma meses de calendario sin desbordar (31 ene + 1 mes = 28 feb). */
function sumarMeses(fecha: Date, meses: number): Date {
  const d = new Date(fecha);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimo = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return d;
}

/** Nuevo `pagadoHasta` al confirmar un pago: desde max(hoy, pagadoHasta). */
export function extenderPagado(
  pagadoHasta: Date | null,
  ahora: Date,
  periodo: Periodo,
): Date {
  const desde = pagadoHasta && pagadoHasta > ahora ? pagadoHasta : ahora;
  return sumarMeses(desde, MESES_CUBIERTOS[periodo]);
}

/** Sin 0/O, 1/I/L: se dicta por teléfono y se teclea en el concepto del SPEI. */
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generarReferencia(): string {
  let r = 'PSE-';
  for (let i = 0; i < 6; i++) r += ALFABETO[randomInt(ALFABETO.length)];
  return r;
}

export type Capacidad = 'CAPTURAR' | 'IMPORTAR' | 'PUBLICO' | 'REGLAMENTO';

/**
 * Qué deja hacer el plan de una liga. Sin suscripción (partidos rápidos) no
 * hay límites. Vencida: todo se ve en el panel, pero no se captura nada nuevo
 * ni sale en la página pública. Arbitraje: captura sin importación ni página
 * pública.
 */
export function permite(
  s: ResumenSuscripcion | null,
  capacidad: Capacidad,
): boolean {
  if (!s) return true;
  if (s.estado === 'VENCIDA') return false;
  if (s.estado === 'ACTIVA' && s.plan === 'ARBITRAJE')
    return capacidad === 'CAPTURAR';
  return true;
}
