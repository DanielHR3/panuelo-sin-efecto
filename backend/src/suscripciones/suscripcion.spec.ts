import {
  DIAS_PRUEBA,
  estadoSuscripcion,
  suscripcionParaLigaNueva,
} from './suscripcion';

const AHORA = new Date('2026-10-23T18:00:00Z');
const dias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000);

describe('estadoSuscripcion', () => {
  it('CORTESIA no vence', () => {
    expect(
      estadoSuscripcion(
        { plan: 'CORTESIA', pruebaHasta: null, pagadoHasta: null },
        AHORA,
      ),
    ).toEqual({
      estado: 'CORTESIA',
      plan: 'CORTESIA',
      vence: null,
      diasRestantes: null,
    });
  });

  it('PRUEBA mientras no termine la prueba, con días restantes redondeados hacia arriba', () => {
    const r = estadoSuscripcion(
      {
        plan: 'COMPLETO',
        pruebaHasta: new Date(dias(12).getTime() - 3_600_000),
        pagadoHasta: null,
      },
      AHORA,
    );
    expect(r.estado).toBe('PRUEBA');
    expect(r.diasRestantes).toBe(12);
  });

  it('ACTIVA si está pagada aunque la prueba ya terminó', () => {
    const r = estadoSuscripcion(
      { plan: 'ARBITRAJE', pruebaHasta: dias(-3), pagadoHasta: dias(20) },
      AHORA,
    );
    expect(r).toMatchObject({
      estado: 'ACTIVA',
      plan: 'ARBITRAJE',
      diasRestantes: 20,
    });
  });

  it('VENCIDA sin prueba vigente ni pago vigente', () => {
    expect(
      estadoSuscripcion(
        { plan: 'COMPLETO', pruebaHasta: dias(-1), pagadoHasta: null },
        AHORA,
      ).estado,
    ).toBe('VENCIDA');
    expect(
      estadoSuscripcion(
        { plan: 'COMPLETO', pruebaHasta: null, pagadoHasta: null },
        AHORA,
      ).estado,
    ).toBe('VENCIDA');
  });
});

describe('suscripcionParaLigaNueva', () => {
  it('la primera liga de un organizador trae 30 días de prueba del plan completo', () => {
    expect(DIAS_PRUEBA).toBe(30);
    expect(
      suscripcionParaLigaNueva(
        { esSuperadmin: false, yaTuvoPrueba: false },
        AHORA,
      ),
    ).toEqual({ plan: 'COMPLETO', pruebaHasta: dias(30), pagadoHasta: null });
  });

  it('una liga más del mismo organizador nace sin prueba (vencida)', () => {
    expect(
      suscripcionParaLigaNueva(
        { esSuperadmin: false, yaTuvoPrueba: true },
        AHORA,
      ),
    ).toEqual({ plan: 'COMPLETO', pruebaHasta: null, pagadoHasta: null });
  });

  it('las ligas que crea el superadmin son de cortesía', () => {
    expect(
      suscripcionParaLigaNueva(
        { esSuperadmin: true, yaTuvoPrueba: false },
        AHORA,
      ).plan,
    ).toBe('CORTESIA');
  });
});
