import type { PrismaClient } from '@prisma/client';
import { calcularMarcador } from '../eventos/marcador';

export const NOMBRE_LIGA_DEMO = 'Liga Demo de Tocho';

type Lado = 'local' | 'visitante';

export interface EventoDemo {
  tipoEvento: string;
  lado: Lado | null;
  /** Índice en el roster del equipo de `lado`. */
  jugador: number | null;
  minuto: number;
}

export interface PartidoDemo {
  local: number;
  visitante: number;
  fechaHora: Date;
  estado: 'FINALIZADO' | 'PROGRAMADO';
  marcadorLocal: number;
  marcadorVisitante: number;
  eventos: EventoDemo[];
  mvp: { lado: Lado; jugador: number } | null;
}

export interface CategoriaDemo {
  nombre: string;
  equipos: {
    nombre: string;
    colorPrimario: string;
    jugadores: { nombre: string; numeroJersey: string }[];
  }[];
  partidos: PartidoDemo[];
}

export interface LigaDemo {
  nombre: string;
  categorias: CategoriaDemo[];
}

const NOMBRES = [
  'Ana',
  'Beto',
  'Carla',
  'Diego',
  'Elena',
  'Fer',
  'Gaby',
  'Hugo',
  'Iris',
  'Javi',
  'Karla',
  'Leo',
  'Mau',
  'Nora',
  'Omar',
  'Pau',
  'Quique',
  'Rosa',
  'Saúl',
  'Tere',
  'Uriel',
  'Vale',
  'Wendy',
  'Xime',
  'Yair',
  'Zoe',
];
const APELLIDOS = [
  'Ruiz',
  'Soto',
  'León',
  'Mora',
  'Peña',
  'Vega',
  'Cruz',
  'Ríos',
  'Luna',
  'Paz',
  'Gil',
  'Lara',
  'Rojo',
  'Sanz',
  'Toro',
  'Nava',
];
const NUMEROS = ['1', '3', '7', '10', '12', '15', '22', '88'];

const CATEGORIAS: { nombre: string; equipos: [string, string][] }[] = [
  {
    nombre: 'Varonil',
    equipos: [
      ['Halcones', '#1D4ED8'],
      ['Toros', '#B91C1C'],
      ['Coyotes', '#B45309'],
      ['Lobos', '#374151'],
    ],
  },
  {
    nombre: 'Femenil',
    equipos: [
      ['Águilas', '#6D28D9'],
      ['Panteras', '#0F766E'],
      ['Jaguares', '#A16207'],
      ['Linces', '#BE185D'],
    ],
  },
];

type Jugada = [Lado, string, number | null];

/**
 * Guiones de las jugadas de la jornada ya jugada. Se reparten entre los
 * partidos; el marcador sale de los eventos, nunca se escribe a mano.
 */
const GUIONES: { primera: Jugada[]; segunda: Jugada[] }[] = [
  {
    primera: [
      ['local', 'TD', 0],
      ['local', 'PAT1', 1],
      ['visitante', 'TD', 2],
      ['visitante', 'FALTA_PERSONAL', 5],
      ['local', 'SACK', 4],
    ],
    segunda: [
      ['visitante', 'TD', 0],
      ['visitante', 'PAT2', 2],
      ['local', 'TD', 3],
      ['local', 'PAT2', 0],
      ['local', 'INTERCEPCION', 6],
      ['local', 'TD', 0],
    ],
  },
  {
    primera: [
      ['visitante', 'TD', 1],
      ['visitante', 'PAT1', 1],
      ['local', 'TD', 2],
      ['local', 'PAT1', 2],
    ],
    segunda: [
      ['visitante', 'PICK_SIX', 6],
      ['local', 'TD', 1],
      ['local', 'SAFETY', 7],
      ['visitante', 'TD', 3],
      ['visitante', 'PAT2', 1],
    ],
  },
];

/** Sábado más cercano antes (-1) o después (+1) de `ahora`, a las `horaUtc`. */
function sabado(ahora: Date, direccion: -1 | 1, horaUtc: number): Date {
  const d = new Date(ahora);
  d.setUTCHours(horaUtc, 0, 0, 0);
  do {
    d.setUTCDate(d.getUTCDate() + direccion);
  } while (d.getUTCDay() !== 6);
  return d;
}

function eventosDe(guion: {
  primera: Jugada[];
  segunda: Jugada[];
}): EventoDemo[] {
  const eventos: EventoDemo[] = [];
  let minuto = 0;
  const control = (tipoEvento: string) =>
    eventos.push({ tipoEvento, lado: null, jugador: null, minuto: minuto++ });
  const jugadas = (lista: Jugada[]) => {
    for (const [lado, tipoEvento, jugador] of lista) {
      minuto += 3;
      eventos.push({ tipoEvento, lado, jugador, minuto });
    }
  };
  control('INICIO_MITAD');
  jugadas(guion.primera);
  minuto = 25;
  control('FIN_MITAD');
  control('INICIO_MITAD');
  jugadas(guion.segunda);
  minuto = Math.max(minuto, 50);
  control('FIN_MITAD');
  return eventos;
}

/** El que más puntos aportó al ganador (o al local si empatan). */
function mvpDe(eventos: EventoDemo[], local: number, visitante: number) {
  const lado: Lado = visitante > local ? 'visitante' : 'local';
  const puntos = new Map<number, number>();
  const valor: Record<string, number> = {
    TD: 6,
    PICK_SIX: 6,
    PAT1: 1,
    PAT2: 2,
    SAFETY: 2,
  };
  for (const e of eventos) {
    if (e.lado !== lado || e.jugador === null) continue;
    puntos.set(
      e.jugador,
      (puntos.get(e.jugador) ?? 0) + (valor[e.tipoEvento] ?? 0),
    );
  }
  const [jugador] = [...puntos.entries()].sort((a, b) => b[1] - a[1])[0] ?? [0];
  return { lado, jugador };
}

/** Datos de la liga demo, sin tocar la base (se prueba sola). */
export function construirLigaDemo(ahora: Date): LigaDemo {
  let n = 0;
  const persona = () => {
    const nombre = `${NOMBRES[n % NOMBRES.length]} ${APELLIDOS[(n * 7) % APELLIDOS.length]}`;
    n += 1;
    return nombre;
  };

  return {
    nombre: NOMBRE_LIGA_DEMO,
    categorias: CATEGORIAS.map((cat, ci) => {
      const equipos = cat.equipos.map(([nombre, colorPrimario]) => ({
        nombre,
        colorPrimario,
        jugadores: NUMEROS.map((numeroJersey) => ({
          nombre: persona(),
          numeroJersey,
        })),
      }));

      // Jornada 1 (jugada): 0 vs 1 y 2 vs 3. Jornada 2 (programada): 0 vs 2 y 1 vs 3.
      const jugados: PartidoDemo[] = [
        [0, 1],
        [2, 3],
      ].map(([local, visitante], i) => {
        const eventos = eventosDe(GUIONES[(ci + i) % GUIONES.length]);
        const m = calcularMarcador(
          eventos.map((e, k) => ({
            id: String(k),
            tipoEvento: e.tipoEvento,
            equipoId: e.lado,
          })),
          'local',
          'visitante',
        );
        return {
          local,
          visitante,
          fechaHora: sabado(ahora, -1, 16 + i * 2),
          estado: 'FINALIZADO',
          marcadorLocal: m.local,
          marcadorVisitante: m.visitante,
          eventos,
          mvp: mvpDe(eventos, m.local, m.visitante),
        };
      });
      const programados: PartidoDemo[] = [
        [0, 2],
        [1, 3],
      ].map(([local, visitante], i) => ({
        local,
        visitante,
        fechaHora: sabado(ahora, 1, 16 + i * 2),
        estado: 'PROGRAMADO',
        marcadorLocal: 0,
        marcadorVisitante: 0,
        eventos: [],
        mvp: null,
      }));

      return {
        nombre: cat.nombre,
        equipos,
        partidos: [...jugados, ...programados],
      };
    }),
  };
}

export interface EnvLigaDemo {
  SEED_DEMO?: string;
}

/**
 * Garantiza que exista la liga demo. Se ejecuta al arrancar la API: si ya
 * hay una liga con `esDemo` no hace nada, así que no se duplica en cada
 * deploy. `SEED_DEMO=false` la desactiva. El dueño es el primer SUPERADMIN
 * (sin él no hay a quién asignarla y no se crea).
 */
export async function asegurarLigaDemo(
  prisma: PrismaClient,
  env: EnvLigaDemo,
  ahora: Date = new Date(),
): Promise<{ id: string } | null> {
  if (env.SEED_DEMO === 'false') return null;
  if (
    await prisma.liga.findFirst({
      where: { esDemo: true },
      select: { id: true },
    })
  ) {
    return null;
  }
  const dueno = await prisma.usuario.findFirst({
    where: { rol: 'SUPERADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!dueno) return null;

  const demo = construirLigaDemo(ahora);

  return prisma.$transaction(
    async (tx) => {
      const liga = await tx.liga.create({
        data: { nombre: demo.nombre, esDemo: true, propietarioId: dueno.id },
        select: { id: true },
      });

      for (const cat of demo.categorias) {
        const categoria = await tx.categoria.create({
          data: { nombre: cat.nombre, ligaId: liga.id },
          select: { id: true },
        });

        const equipos: { id: string; jugadores: string[] }[] = [];
        for (const eq of cat.equipos) {
          const equipo = await tx.equipo.create({
            data: {
              nombre: eq.nombre,
              colorPrimario: eq.colorPrimario,
              categoriaId: categoria.id,
              jugadores: { createMany: { data: eq.jugadores } },
            },
            select: {
              id: true,
              jugadores: { select: { id: true, numeroJersey: true } },
            },
          });
          // El roster vuelve sin orden garantizado: se reordena como en los datos.
          const porNumero = new Map(
            equipo.jugadores.map((j) => [j.numeroJersey, j.id]),
          );
          equipos.push({
            id: equipo.id,
            jugadores: eq.jugadores.map((j) => porNumero.get(j.numeroJersey)!),
          });
        }

        for (const p of cat.partidos) {
          const local = equipos[p.local];
          const visitante = equipos[p.visitante];
          const roster = (lado: Lado) => (lado === 'local' ? local : visitante);
          const partido = await tx.partido.create({
            data: {
              categoriaId: categoria.id,
              equipoLocalId: local.id,
              equipoVisitanteId: visitante.id,
              fechaHora: p.fechaHora,
              dificultad: 'REGULAR',
              estado: p.estado,
              marcadorLocal: p.marcadorLocal,
              marcadorVisitante: p.marcadorVisitante,
              mvpJugadorId: p.mvp
                ? roster(p.mvp.lado).jugadores[p.mvp.jugador]
                : null,
              asignaciones: {
                create: { arbitroId: dueno.id, rolEnCampo: 'Referee' },
              },
            },
            select: { id: true },
          });
          if (p.eventos.length > 0) {
            await tx.eventoPartido.createMany({
              data: p.eventos.map((e) => ({
                partidoId: partido.id,
                tipoEvento: e.tipoEvento,
                equipoId: e.lado ? roster(e.lado).id : null,
                jugadorId:
                  e.lado && e.jugador !== null
                    ? roster(e.lado).jugadores[e.jugador]
                    : null,
                arbitroId: dueno.id,
                timestamp: new Date(p.fechaHora.getTime() + e.minuto * 60_000),
              })),
            });
          }
        }
      }
      return liga;
    },
    // Neon desde Render: decenas de inserts, más que el límite de 5 s por defecto.
    { timeout: 60_000 },
  );
}
