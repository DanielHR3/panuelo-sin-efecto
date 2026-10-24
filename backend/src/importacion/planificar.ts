import {
  normalizar,
  type ErrorImportacion,
  type LibroLeido,
} from './leer-libro';

/** Lo que ya hay en la liga, para no duplicar al volver a subir el archivo. */
export interface CategoriaExistente {
  id: string;
  nombre: string;
  equipos: {
    id: string;
    nombre: string;
    jugadores: { id: string; numeroJersey: string; nombre: string }[];
  }[];
  partidos: {
    fechaHora: Date;
    equipoLocalId: string;
    equipoVisitanteId: string;
  }[];
}

export interface EquipoPlan {
  /** null = equipo nuevo. */
  id: string | null;
  nombre: string;
  color: string | null;
  jugadoresNuevos: { nombre: string; numero: string }[];
  jugadoresActualizados: { id: string; nombre: string }[];
}

export interface CategoriaPlan {
  /** null = categoría nueva. */
  id: string | null;
  nombre: string;
  equipos: EquipoPlan[];
  partidosNuevos: { fechaHora: Date; local: string; visitante: string }[];
}

export interface ResumenImportacion {
  categoriasNuevas: number;
  equiposNuevos: number;
  equiposExistentes: number;
  jugadoresNuevos: number;
  jugadoresActualizados: number;
  partidosNuevos: number;
  partidosOmitidos: number;
}

export interface PlanImportacion {
  categorias: CategoriaPlan[];
  resumen: ResumenImportacion;
  errores: ErrorImportacion[];
}

/**
 * Decide qué crear, actualizar u omitir. Nada se borra. Reglas (diseño,
 * Parte 4): categorías y equipos se reutilizan por nombre sin distinguir
 * mayúsculas; un jugador con el mismo número en su equipo se actualiza; un
 * partido con misma categoría, fecha/hora, local y visitante se omite.
 */
export function planificarImportacion(
  libro: LibroLeido,
  existentes: CategoriaExistente[],
): PlanImportacion {
  const errores: ErrorImportacion[] = [...libro.errores];
  const categorias = new Map<string, CategoriaPlan>();
  const existentesPorNombre = new Map(
    existentes.map((c) => [normalizar(c.nombre), c]),
  );
  const partidosOmitidos = { n: 0 };
  let equiposExistentesUsados = 0;

  const categoria = (nombre: string): CategoriaPlan => {
    const clave = normalizar(nombre);
    let plan = categorias.get(clave);
    if (!plan) {
      const previa = existentesPorNombre.get(clave);
      plan = {
        id: previa?.id ?? null,
        nombre: previa?.nombre ?? nombre,
        equipos: (previa?.equipos ?? []).map((e) => ({
          id: e.id,
          nombre: e.nombre,
          color: null,
          jugadoresNuevos: [],
          jugadoresActualizados: [],
        })),
        partidosNuevos: [],
      };
      categorias.set(clave, plan);
    }
    return plan;
  };
  const equipo = (cat: CategoriaPlan, nombre: string) =>
    cat.equipos.find((e) => normalizar(e.nombre) === normalizar(nombre));

  for (const fila of libro.equipos) {
    const cat = categoria(fila.categoria);
    const previo = equipo(cat, fila.equipo);
    if (previo) {
      if (previo.id) equiposExistentesUsados += 1;
      if (!previo.id && fila.color) previo.color = fila.color;
    } else {
      cat.equipos.push({
        id: null,
        nombre: fila.equipo,
        color: fila.color,
        jugadoresNuevos: [],
        jugadoresActualizados: [],
      });
    }
  }

  const numerosVistos = new Map<string, number>();
  for (const fila of libro.jugadores) {
    const cat = categoria(fila.categoria);
    const eq = equipo(cat, fila.equipo);
    if (!eq) {
      errores.push({
        hoja: 'Jugadores',
        fila: fila.fila,
        mensaje: `El equipo "${fila.equipo}" no existe en ${cat.nombre}`,
      });
      continue;
    }
    const clave = `${normalizar(cat.nombre)}|${normalizar(eq.nombre)}|${fila.numero}`;
    const repetido = numerosVistos.get(clave);
    if (repetido !== undefined) {
      errores.push({
        hoja: 'Jugadores',
        fila: fila.fila,
        mensaje: `El número ${fila.numero} ya está en ${eq.nombre} (fila ${repetido})`,
      });
      continue;
    }
    numerosVistos.set(clave, fila.fila);
    const previo = existentesPorNombre
      .get(normalizar(cat.nombre))
      ?.equipos.find((e) => e.id === eq.id)
      ?.jugadores.find((j) => j.numeroJersey === fila.numero);
    if (previo)
      eq.jugadoresActualizados.push({ id: previo.id, nombre: fila.nombre });
    else eq.jugadoresNuevos.push({ nombre: fila.nombre, numero: fila.numero });
  }

  for (const fila of libro.partidos) {
    const cat = categoria(fila.categoria);
    const local = equipo(cat, fila.local);
    const visitante = equipo(cat, fila.visitante);
    const falta = !local ? fila.local : !visitante ? fila.visitante : null;
    if (falta) {
      errores.push({
        hoja: 'Calendario',
        fila: fila.fila,
        mensaje: `El equipo "${falta}" no existe en ${cat.nombre}`,
      });
      continue;
    }
    if (local === visitante) {
      errores.push({
        hoja: 'Calendario',
        fila: fila.fila,
        mensaje: 'Un equipo no puede jugar contra sí mismo',
      });
      continue;
    }
    const previa = existentesPorNombre.get(normalizar(cat.nombre));
    const yaExiste =
      previa?.partidos.some(
        (p) =>
          p.fechaHora.getTime() === fila.fechaHora.getTime() &&
          p.equipoLocalId === local!.id &&
          p.equipoVisitanteId === visitante!.id,
      ) ||
      cat.partidosNuevos.some(
        (p) =>
          p.fechaHora.getTime() === fila.fechaHora.getTime() &&
          normalizar(p.local) === normalizar(local!.nombre) &&
          normalizar(p.visitante) === normalizar(visitante!.nombre),
      );
    if (yaExiste) partidosOmitidos.n += 1;
    else
      cat.partidosNuevos.push({
        fechaHora: fila.fechaHora,
        local: local!.nombre,
        visitante: visitante!.nombre,
      });
  }

  const lista = [...categorias.values()];
  const equipos = lista.flatMap((c) => c.equipos);
  return {
    categorias: lista,
    errores,
    resumen: {
      categoriasNuevas: lista.filter((c) => !c.id).length,
      equiposNuevos: equipos.filter((e) => !e.id).length,
      equiposExistentes: equiposExistentesUsados,
      jugadoresNuevos: equipos.reduce(
        (n, e) => n + e.jugadoresNuevos.length,
        0,
      ),
      jugadoresActualizados: equipos.reduce(
        (n, e) => n + e.jugadoresActualizados.length,
        0,
      ),
      partidosNuevos: lista.reduce((n, c) => n + c.partidosNuevos.length, 0),
      partidosOmitidos: partidosOmitidos.n,
    },
  };
}
