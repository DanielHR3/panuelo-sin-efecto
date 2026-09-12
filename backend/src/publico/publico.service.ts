import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { puntosDe } from '../eventos/evento.constants';
import {
  calcularEstadisticasJugador,
  calcularLideres,
  calcularTablaPosiciones,
  eventosVigentesPorPartido,
  type EventoPublico,
} from './estadisticas';

const equipoPublico = {
  id: true,
  nombre: true,
  colorPrimario: true,
} as const;

const partidoPublico = {
  id: true,
  fechaHora: true,
  estado: true,
  marcadorLocal: true,
  marcadorVisitante: true,
  equipoLocalId: true,
  equipoVisitanteId: true,
  mvpJugadorId: true,
  equipoLocal: { select: equipoPublico },
  equipoVisitante: { select: equipoPublico },
} as const;

const eventoSelect = {
  id: true,
  partidoId: true,
  tipoEvento: true,
  jugadorId: true,
  equipoId: true,
} as const;

const ORDEN_EVENTOS = [
  { partidoId: 'asc' as const },
  { timestamp: 'asc' as const },
  { id: 'asc' as const },
];

interface Limites {
  recientes: number;
  proximos: number;
  lideres: number;
}

const LIMITES_RESUMEN: Limites = { recientes: 5, proximos: 3, lideres: 5 };
const LIMITES_CATEGORIA: Limites = { recientes: 30, proximos: 10, lideres: 15 };

/**
 * Vista pública (sin autenticación) para la landing y el perfil de jugador
 * (HU-3.4 / HU-3.1). Solo lecturas; nunca expone árbitros, correos ni
 * eventos descartados.
 */
@Injectable()
export class PublicoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todas las ligas con la tabla, marcadores y líderes de cada categoría. */
  async resumen() {
    const ligas = await this.prisma.liga.findMany({
      // Las ligas RAPIDA son el contenedor personal de un árbitro invitado
      // (HU-2.7): sus partidos se comparten por enlace, no en la portada.
      where: { tipo: 'LIGA' },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        logoUrl: true,
        categorias: {
          orderBy: { nombre: 'asc' },
          select: {
            id: true,
            nombre: true,
            equipos: { select: equipoPublico, orderBy: { nombre: 'asc' } },
            partidos: {
              select: partidoPublico,
              orderBy: { fechaHora: 'desc' },
            },
          },
        },
      },
    });

    const categoriaIds = ligas.flatMap((l) => l.categorias.map((c) => c.id));
    const eventos = await this.eventosDeCategorias(categoriaIds);
    const partidoACategoria = new Map<string, string>();
    for (const liga of ligas) {
      for (const cat of liga.categorias) {
        for (const p of cat.partidos) partidoACategoria.set(p.id, cat.id);
      }
    }
    const eventosPorCategoria = new Map<string, EventoPublico[]>();
    for (const ev of eventos) {
      const catId = partidoACategoria.get(ev.partidoId);
      if (!catId) continue;
      const lista = eventosPorCategoria.get(catId);
      if (lista) lista.push(ev);
      else eventosPorCategoria.set(catId, [ev]);
    }

    const categoriasArmadas = await Promise.all(
      ligas.flatMap((liga) =>
        liga.categorias.map(async (cat) => ({
          ligaId: liga.id,
          categoria: await this.armarCategoria(
            cat,
            eventosPorCategoria.get(cat.id) ?? [],
            LIMITES_RESUMEN,
          ),
        })),
      ),
    );

    return {
      ligas: ligas.map((liga) => ({
        id: liga.id,
        nombre: liga.nombre,
        logoUrl: liga.logoUrl,
        categorias: categoriasArmadas
          .filter((c) => c.ligaId === liga.id)
          .map((c) => c.categoria),
      })),
    };
  }

  /** Una categoría completa: tabla, todos los resultados y más líderes. */
  async categoria(id: string) {
    const cat = await this.prisma.categoria.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        liga: { select: { id: true, nombre: true, logoUrl: true } },
        equipos: { select: equipoPublico, orderBy: { nombre: 'asc' } },
        partidos: { select: partidoPublico, orderBy: { fechaHora: 'desc' } },
      },
    });
    if (!cat) throw new NotFoundException(`Categoría ${id} no encontrada`);
    const eventos = await this.eventosDeCategorias([id]);
    const armada = await this.armarCategoria(cat, eventos, LIMITES_CATEGORIA);
    return { ...armada, liga: cat.liga };
  }

  /** Perfil público de un jugador con sus estadísticas (HU-3.1). */
  async jugador(id: string) {
    const jugador = await this.prisma.jugador.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        numeroJersey: true,
        equipo: {
          select: {
            ...equipoPublico,
            categoria: {
              select: {
                id: true,
                nombre: true,
                liga: { select: { id: true, nombre: true, logoUrl: true } },
              },
            },
          },
        },
      },
    });
    if (!jugador) throw new NotFoundException(`Jugador ${id} no encontrado`);

    const [eventos, mvps] = await Promise.all([
      this.eventosDeCategorias([jugador.equipo.categoria.id]),
      this.prisma.partido.count({ where: { mvpJugadorId: id } }),
    ]);
    const vigentes = eventosVigentesPorPartido(eventos);
    const estadisticas = calcularEstadisticasJugador(vigentes, id, mvps);

    // Línea por partido: puntos y TD del jugador en cada uno donde participó.
    const porPartido = new Map<string, { puntos: number; td: number }>();
    for (const ev of vigentes) {
      if (ev.jugadorId !== id) continue;
      const linea = porPartido.get(ev.partidoId) ?? { puntos: 0, td: 0 };
      linea.puntos += puntosDe(ev.tipoEvento);
      if (ev.tipoEvento === 'TD' || ev.tipoEvento === 'PICK_SIX') linea.td += 1;
      porPartido.set(ev.partidoId, linea);
    }
    const partidos =
      porPartido.size === 0
        ? []
        : await this.prisma.partido.findMany({
            where: { id: { in: [...porPartido.keys()] } },
            select: partidoPublico,
            orderBy: { fechaHora: 'desc' },
            take: 20,
          });

    const { categoria, ...equipo } = jugador.equipo;
    return {
      id: jugador.id,
      nombre: jugador.nombre,
      numeroJersey: jugador.numeroJersey,
      equipo,
      categoria: { id: categoria.id, nombre: categoria.nombre },
      liga: categoria.liga,
      estadisticas,
      partidos: partidos.map((p) => ({
        ...p,
        esMvp: p.mvpJugadorId === id,
        puntos: porPartido.get(p.id)?.puntos ?? 0,
        td: porPartido.get(p.id)?.td ?? 0,
      })),
    };
  }

  private eventosDeCategorias(categoriaIds: string[]) {
    if (categoriaIds.length === 0) return Promise.resolve([]);
    return this.prisma.eventoPartido.findMany({
      where: {
        descartado: false,
        partido: { categoriaId: { in: categoriaIds } },
      },
      orderBy: ORDEN_EVENTOS,
      select: eventoSelect,
    });
  }

  private async armarCategoria(
    cat: {
      id: string;
      nombre: string;
      equipos: { id: string; nombre: string; colorPrimario: string | null }[];
      partidos: {
        id: string;
        fechaHora: Date;
        estado: string;
        marcadorLocal: number;
        marcadorVisitante: number;
        equipoLocalId: string;
        equipoVisitanteId: string;
        equipoLocal: {
          id: string;
          nombre: string;
          colorPrimario: string | null;
        };
        equipoVisitante: {
          id: string;
          nombre: string;
          colorPrimario: string | null;
        };
      }[];
    },
    eventos: EventoPublico[],
    limites: Limites,
  ) {
    const tabla = calcularTablaPosiciones(cat.partidos, cat.equipos);
    // `partidos` viene ordenado por fecha descendente.
    const recientes = cat.partidos
      .filter((p) => p.estado !== 'PROGRAMADO')
      .slice(0, limites.recientes);
    const proximos = cat.partidos
      .filter((p) => p.estado === 'PROGRAMADO')
      .sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())
      .slice(0, limites.proximos);

    const lideresBase = calcularLideres(eventos, limites.lideres);
    const jugadores =
      lideresBase.length === 0
        ? []
        : await this.prisma.jugador.findMany({
            where: { id: { in: lideresBase.map((l) => l.jugadorId) } },
            select: {
              id: true,
              nombre: true,
              numeroJersey: true,
              equipo: { select: equipoPublico },
            },
          });
    const jugadoresPorId = new Map(jugadores.map((j) => [j.id, j]));
    const lideres = lideresBase.map((l) => {
      const j = jugadoresPorId.get(l.jugadorId);
      return {
        ...l,
        nombre: j?.nombre ?? 'Jugador',
        numeroJersey: j?.numeroJersey ?? '',
        equipo: j?.equipo ?? null,
      };
    });

    return {
      id: cat.id,
      nombre: cat.nombre,
      tabla,
      recientes: recientes.map(sinIdsInternos),
      proximos: proximos.map(sinIdsInternos),
      lideres,
    };
  }
}

function sinIdsInternos<
  T extends { equipoLocalId: string; equipoVisitanteId: string },
>(p: T): Omit<T, 'equipoLocalId' | 'equipoVisitanteId'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { equipoLocalId, equipoVisitanteId, ...resto } = p;
  return resto;
}
