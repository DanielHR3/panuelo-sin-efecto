import { planificarImportacion, type CategoriaExistente } from './planificar';
import type { LibroLeido } from './leer-libro';

const F = new Date('2026-11-07T16:00:00Z');
const vacio: LibroLeido = {
  equipos: [],
  jugadores: [],
  partidos: [],
  errores: [],
};

describe('planificarImportacion', () => {
  it('crea categorías, equipos, jugadores y partidos nuevos', () => {
    const plan = planificarImportacion(
      {
        ...vacio,
        equipos: [
          { fila: 2, categoria: 'Varonil', equipo: 'Toros', color: '#B91C1C' },
          { fila: 3, categoria: 'Varonil', equipo: 'Lobos', color: null },
        ],
        jugadores: [
          {
            fila: 2,
            categoria: 'Varonil',
            equipo: 'Toros',
            nombre: 'Ana',
            numero: '7',
          },
        ],
        partidos: [
          {
            fila: 2,
            categoria: 'Varonil',
            fechaHora: F,
            local: 'Toros',
            visitante: 'Lobos',
          },
        ],
      },
      [],
    );
    expect(plan.errores).toEqual([]);
    expect(plan.resumen).toEqual({
      categoriasNuevas: 1,
      equiposNuevos: 2,
      equiposExistentes: 0,
      jugadoresNuevos: 1,
      jugadoresActualizados: 0,
      partidosNuevos: 1,
      partidosOmitidos: 0,
    });
    expect(plan.categorias).toEqual([
      expect.objectContaining({ nombre: 'Varonil', id: null }),
    ]);
  });

  it('reutiliza lo que ya existe (sin distinguir mayúsculas) y no duplica al volver a subir', () => {
    const existentes: CategoriaExistente[] = [
      {
        id: 'c1',
        nombre: 'Varonil',
        equipos: [
          {
            id: 'e1',
            nombre: 'Toros',
            jugadores: [{ id: 'j1', numeroJersey: '7', nombre: 'Ana R.' }],
          },
          { id: 'e2', nombre: 'Lobos', jugadores: [] },
        ],
        partidos: [
          { fechaHora: F, equipoLocalId: 'e1', equipoVisitanteId: 'e2' },
        ],
      },
    ];
    const plan = planificarImportacion(
      {
        ...vacio,
        equipos: [
          { fila: 2, categoria: 'varonil', equipo: 'TOROS', color: null },
        ],
        jugadores: [
          {
            fila: 2,
            categoria: 'Varonil',
            equipo: 'toros',
            nombre: 'Ana Ruiz',
            numero: '7',
          },
          {
            fila: 3,
            categoria: 'Varonil',
            equipo: 'Lobos',
            nombre: 'Leo',
            numero: '10',
          },
        ],
        partidos: [
          {
            fila: 2,
            categoria: 'Varonil',
            fechaHora: F,
            local: 'Toros',
            visitante: 'Lobos',
          },
        ],
      },
      existentes,
    );
    expect(plan.errores).toEqual([]);
    expect(plan.resumen).toMatchObject({
      categoriasNuevas: 0,
      equiposNuevos: 0,
      equiposExistentes: 1,
      jugadoresNuevos: 1,
      jugadoresActualizados: 1,
      partidosNuevos: 0,
      partidosOmitidos: 1,
    });
  });

  it('señala con hoja y fila los equipos que no existen, partidos contra sí mismos y números repetidos', () => {
    const plan = planificarImportacion(
      {
        ...vacio,
        equipos: [
          { fila: 2, categoria: 'Varonil', equipo: 'Toros', color: null },
        ],
        jugadores: [
          {
            fila: 2,
            categoria: 'Varonil',
            equipo: 'Toros',
            nombre: 'Ana',
            numero: '7',
          },
          {
            fila: 3,
            categoria: 'Varonil',
            equipo: 'Toros',
            nombre: 'Beto',
            numero: '7',
          },
          {
            fila: 4,
            categoria: 'Varonil',
            equipo: 'Coyotes',
            nombre: 'Caro',
            numero: '9',
          },
        ],
        partidos: [
          {
            fila: 2,
            categoria: 'Varonil',
            fechaHora: F,
            local: 'Toros',
            visitante: 'toros',
          },
          {
            fila: 3,
            categoria: 'Femenil',
            fechaHora: F,
            local: 'Toros',
            visitante: 'Lobos',
          },
        ],
      },
      [],
    );
    expect(plan.errores).toEqual([
      {
        hoja: 'Jugadores',
        fila: 3,
        mensaje: 'El número 7 ya está en Toros (fila 2)',
      },
      {
        hoja: 'Jugadores',
        fila: 4,
        mensaje: 'El equipo "Coyotes" no existe en Varonil',
      },
      {
        hoja: 'Calendario',
        fila: 2,
        mensaje: 'Un equipo no puede jugar contra sí mismo',
      },
      {
        hoja: 'Calendario',
        fila: 3,
        mensaje: 'El equipo "Toros" no existe en Femenil',
      },
    ]);
  });

  it('conserva los errores de lectura del libro', () => {
    const plan = planificarImportacion(
      {
        ...vacio,
        errores: [{ hoja: 'Jugadores', fila: 5, mensaje: 'Falta el nombre' }],
      },
      [],
    );
    expect(plan.errores).toEqual([
      { hoja: 'Jugadores', fila: 5, mensaje: 'Falta el nombre' },
    ]);
  });
});
