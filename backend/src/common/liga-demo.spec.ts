import { construirLigaDemo, asegurarLigaDemo } from './liga-demo';
import { calcularMarcador } from '../eventos/marcador';

const AHORA = new Date('2026-10-23T18:00:00Z');

describe('construirLigaDemo (datos ficticios)', () => {
  const demo = construirLigaDemo(AHORA);

  it('trae Varonil y Femenil con 4 equipos de 8 jugadores cada uno', () => {
    expect(demo.categorias.map((c) => c.nombre)).toEqual([
      'Varonil',
      'Femenil',
    ]);
    for (const cat of demo.categorias) {
      expect(cat.equipos).toHaveLength(4);
      for (const eq of cat.equipos) expect(eq.jugadores).toHaveLength(8);
    }
  });

  it('cada categoría tiene una jornada jugada (con eventos y MVP) y una programada', () => {
    for (const cat of demo.categorias) {
      const jugados = cat.partidos.filter((p) => p.estado === 'FINALIZADO');
      const programados = cat.partidos.filter((p) => p.estado === 'PROGRAMADO');
      expect(jugados).toHaveLength(2);
      expect(programados).toHaveLength(2);
      for (const p of jugados) {
        expect(p.eventos.length).toBeGreaterThan(0);
        expect(p.mvp).not.toBeNull();
        expect(p.fechaHora.getTime()).toBeLessThan(AHORA.getTime());
      }
      for (const p of programados) {
        expect(p.eventos).toEqual([]);
        expect(p.fechaHora.getTime()).toBeGreaterThan(AHORA.getTime());
      }
    }
  });

  it('el marcador guardado coincide con el que dan los eventos (Caja Negra)', () => {
    for (const cat of demo.categorias) {
      for (const p of cat.partidos) {
        const eventos = p.eventos.map((e, i) => ({
          id: String(i),
          tipoEvento: e.tipoEvento,
          equipoId: e.lado,
        }));
        expect(calcularMarcador(eventos, 'local', 'visitante')).toEqual({
          local: p.marcadorLocal,
          visitante: p.marcadorVisitante,
        });
      }
    }
  });

  it('cada partido jugado abre y cierra dos mitades', () => {
    for (const cat of demo.categorias) {
      for (const p of cat.partidos.filter((x) => x.estado === 'FINALIZADO')) {
        const control = p.eventos
          .map((e) => e.tipoEvento)
          .filter((t) => t === 'INICIO_MITAD' || t === 'FIN_MITAD');
        expect(control).toEqual([
          'INICIO_MITAD',
          'FIN_MITAD',
          'INICIO_MITAD',
          'FIN_MITAD',
        ]);
      }
    }
  });
});

describe('asegurarLigaDemo (arranque de la API)', () => {
  const prisma = {
    liga: { findFirst: jest.fn(), create: jest.fn() },
    usuario: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('con SEED_DEMO=false no toca la base', async () => {
    expect(
      await asegurarLigaDemo(prisma as never, { SEED_DEMO: 'false' }),
    ).toBeNull();
    expect(prisma.liga.findFirst).not.toHaveBeenCalled();
  });

  it('si ya existe una liga demo no crea otra (idempotente)', async () => {
    prisma.liga.findFirst.mockResolvedValueOnce({ id: 'demo' });
    expect(await asegurarLigaDemo(prisma as never, {})).toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('sin superadmin no puede elegir dueño y no crea nada', async () => {
    prisma.liga.findFirst.mockResolvedValueOnce(null);
    prisma.usuario.findFirst.mockResolvedValueOnce(null);
    expect(await asegurarLigaDemo(prisma as never, {})).toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
