import {
  extenderPagado,
  generarReferencia,
  montoCentavos,
  permite,
  PRECIO_MENSUAL_CENTAVOS,
} from './cobro';
import type { ResumenSuscripcion } from './suscripcion';

const AHORA = new Date('2026-10-23T18:00:00Z');
const r = (
  estado: ResumenSuscripcion['estado'],
  plan: string,
): ResumenSuscripcion => ({
  estado,
  plan,
  vence: null,
  diasRestantes: null,
});

describe('montoCentavos', () => {
  it('Arbitraje $99 y Completo $299 al mes; el año cuesta 10 meses', () => {
    expect(PRECIO_MENSUAL_CENTAVOS).toEqual({
      ARBITRAJE: 9_900,
      COMPLETO: 29_900,
    });
    expect(montoCentavos('ARBITRAJE', 'MENSUAL')).toBe(9_900);
    expect(montoCentavos('COMPLETO', 'ANUAL')).toBe(299_000);
  });
});

describe('extenderPagado', () => {
  it('sin pago vigente, cuenta desde hoy', () => {
    expect(extenderPagado(null, AHORA, 'MENSUAL')).toEqual(
      new Date('2026-11-23T18:00:00Z'),
    );
    expect(
      extenderPagado(new Date('2026-01-01T00:00:00Z'), AHORA, 'ANUAL'),
    ).toEqual(new Date('2027-10-23T18:00:00Z'));
  });

  it('con pago vigente, se suma al final del periodo actual', () => {
    expect(
      extenderPagado(new Date('2026-11-10T00:00:00Z'), AHORA, 'MENSUAL'),
    ).toEqual(new Date('2026-12-10T00:00:00Z'));
  });

  it('un 31 de mes no salta dos meses (31 ene + 1 mes = 28 feb)', () => {
    expect(
      extenderPagado(null, new Date('2027-01-31T12:00:00Z'), 'MENSUAL'),
    ).toEqual(new Date('2027-02-28T12:00:00Z'));
  });
});

describe('generarReferencia', () => {
  it('es PSE- y 6 caracteres fáciles de dictar (sin 0/O/1/I/L)', () => {
    for (let i = 0; i < 200; i++)
      expect(generarReferencia()).toMatch(/^PSE-[2-9A-HJKMNP-Z]{6}$/);
  });
});

describe('permite', () => {
  it('prueba, cortesía y Completo pagado permiten todo', () => {
    for (const s of [
      r('PRUEBA', 'COMPLETO'),
      r('CORTESIA', 'CORTESIA'),
      r('ACTIVA', 'COMPLETO'),
    ]) {
      expect(permite(s, 'CAPTURAR')).toBe(true);
      expect(permite(s, 'IMPORTAR')).toBe(true);
      expect(permite(s, 'PUBLICO')).toBe(true);
    }
  });

  it('Arbitraje pagado captura pero no importa ni sale en la página pública', () => {
    const s = r('ACTIVA', 'ARBITRAJE');
    expect(permite(s, 'CAPTURAR')).toBe(true);
    expect(permite(s, 'IMPORTAR')).toBe(false);
    expect(permite(s, 'PUBLICO')).toBe(false);
  });

  it('vencida no captura, no importa y no es pública', () => {
    const s = r('VENCIDA', 'COMPLETO');
    expect(permite(s, 'CAPTURAR')).toBe(false);
    expect(permite(s, 'IMPORTAR')).toBe(false);
    expect(permite(s, 'PUBLICO')).toBe(false);
  });

  it('sin suscripción (partidos rápidos) no hay límites', () => {
    expect(permite(null, 'CAPTURAR')).toBe(true);
  });
});
