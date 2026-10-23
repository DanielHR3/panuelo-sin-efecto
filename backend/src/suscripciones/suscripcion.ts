/** Días de prueba gratis (plan completo) de la primera liga de un organizador. */
export const DIAS_PRUEBA = 30;

export const PLANES = ['ARBITRAJE', 'COMPLETO', 'CORTESIA'] as const;
export type Plan = (typeof PLANES)[number];

export type EstadoSuscripcion = 'PRUEBA' | 'ACTIVA' | 'VENCIDA' | 'CORTESIA';

export interface DatosSuscripcion {
  plan: string;
  pruebaHasta: Date | null;
  pagadoHasta: Date | null;
}

export interface ResumenSuscripcion {
  estado: EstadoSuscripcion;
  plan: string;
  /** Cuándo termina la prueba o el periodo pagado (null en cortesía/vencida sin fecha). */
  vence: Date | null;
  /** Días que faltan para `vence`, redondeados hacia arriba; null sin vencimiento. */
  diasRestantes: number | null;
}

const DIA_MS = 86_400_000;

/**
 * El estado nunca se guarda: sale de las fechas. Un pago vigente pesa más que
 * la prueba (si alguien paga a mitad de su prueba, cuenta lo pagado).
 */
export function estadoSuscripcion(
  s: DatosSuscripcion,
  ahora: Date,
): ResumenSuscripcion {
  if (s.plan === 'CORTESIA') {
    return {
      estado: 'CORTESIA',
      plan: s.plan,
      vence: null,
      diasRestantes: null,
    };
  }
  const dias = (hasta: Date) =>
    Math.max(0, Math.ceil((hasta.getTime() - ahora.getTime()) / DIA_MS));
  if (s.pagadoHasta && s.pagadoHasta > ahora) {
    return {
      estado: 'ACTIVA',
      plan: s.plan,
      vence: s.pagadoHasta,
      diasRestantes: dias(s.pagadoHasta),
    };
  }
  if (s.pruebaHasta && s.pruebaHasta > ahora) {
    return {
      estado: 'PRUEBA',
      plan: s.plan,
      vence: s.pruebaHasta,
      diasRestantes: dias(s.pruebaHasta),
    };
  }
  const vence = s.pagadoHasta ?? s.pruebaHasta;
  return {
    estado: 'VENCIDA',
    plan: s.plan,
    vence,
    diasRestantes: vence ? 0 : null,
  };
}

/**
 * Suscripción con la que nace una liga. La prueba es una sola vez por
 * organizador (decisión del usuario): su primera liga la trae, las demás nacen
 * vencidas hasta que se paguen. Las del superadmin son de cortesía.
 */
export function suscripcionParaLigaNueva(
  quien: { esSuperadmin: boolean; yaTuvoPrueba: boolean },
  ahora: Date,
): DatosSuscripcion & { plan: Plan } {
  if (quien.esSuperadmin)
    return { plan: 'CORTESIA', pruebaHasta: null, pagadoHasta: null };
  return {
    plan: 'COMPLETO',
    pruebaHasta: quien.yaTuvoPrueba
      ? null
      : new Date(ahora.getTime() + DIAS_PRUEBA * DIA_MS),
    pagadoHasta: null,
  };
}
