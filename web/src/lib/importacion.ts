export interface ResumenImportacion {
  categoriasNuevas: number;
  equiposNuevos: number;
  equiposExistentes: number;
  jugadoresNuevos: number;
  jugadoresActualizados: number;
  partidosNuevos: number;
  partidosOmitidos: number;
}

export interface ErrorImportacion {
  hoja: string;
  fila: number;
  mensaje: string;
}

export interface ResultadoImportacion {
  resumen: ResumenImportacion;
  errores: ErrorImportacion[];
  aplicado: boolean;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Renglones legibles de la vista previa; omite lo que viene en cero. */
export function lineasResumen(r: ResumenImportacion): string[] {
  const lineas: [number, string][] = [
    [r.categoriasNuevas, plural(r.categoriasNuevas, "categoría nueva", "categorías nuevas")],
    [r.equiposNuevos, plural(r.equiposNuevos, "equipo nuevo", "equipos nuevos")],
    [r.equiposExistentes, plural(r.equiposExistentes, "equipo que ya existía (se reutiliza)", "equipos que ya existían (se reutilizan)")],
    [r.jugadoresNuevos, plural(r.jugadoresNuevos, "jugador nuevo", "jugadores nuevos")],
    [r.jugadoresActualizados, plural(r.jugadoresActualizados, "jugador actualizado", "jugadores actualizados")],
    [r.partidosNuevos, plural(r.partidosNuevos, "partido nuevo", "partidos nuevos")],
    [r.partidosOmitidos, plural(r.partidosOmitidos, "partido repetido (se omite)", "partidos repetidos (se omiten)")],
  ];
  return lineas.filter(([n]) => n > 0).map(([, t]) => t);
}
