import type { FilaTabla } from "@/lib/types";

const COLUMNAS: { clave: keyof FilaTabla; titulo: string; abreviatura: string }[] = [
  { clave: "pj", titulo: "Partidos jugados", abreviatura: "PJ" },
  { clave: "pg", titulo: "Ganados", abreviatura: "G" },
  { clave: "pe", titulo: "Empatados", abreviatura: "E" },
  { clave: "pp", titulo: "Perdidos", abreviatura: "P" },
  { clave: "pf", titulo: "Puntos a favor", abreviatura: "PF" },
  { clave: "pc", titulo: "Puntos en contra", abreviatura: "PC" },
  { clave: "dif", titulo: "Diferencia", abreviatura: "DIF" },
  { clave: "pts", titulo: "Puntos", abreviatura: "PTS" },
];

/**
 * El líder (primera fila, ya con partidos) lleva sus puntos en dorado. Solo la
 * primera fila: cae en `panel`, donde el dorado del modo claro pasa 4.5:1
 * (sobre `panel-alterno` no llega).
 */
function esLider(f: FilaTabla, i: number): boolean {
  return i === 0 && f.posicion === 1 && f.pj > 0;
}

export function TablaPosiciones({ filas, compacta = false }: { filas: FilaTabla[]; compacta?: boolean }) {
  if (filas.length === 0) {
    return <p className="text-sm text-suave py-3">Esta categoría todavía no tiene equipos.</p>;
  }
  const columnas = compacta ? COLUMNAS.filter((c) => ["pj", "pg", "pp", "dif", "pts"].includes(c.clave)) : COLUMNAS;
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.12em] text-suave bg-panel border-b border-texto/10">
            <th scope="col" className="text-left font-bold py-2 pl-3 pr-2 w-6">#</th>
            <th scope="col" className="text-left font-bold py-2">Equipo</th>
            {columnas.map((c) => (
              <th key={c.clave} scope="col" className="text-right font-bold py-2 pl-2 last:pr-3">
                <abbr title={c.titulo} className="no-underline">{c.abreviatura}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr
              key={f.equipoId}
              className={`odd:bg-panel even:bg-panel-alterno ${f.posicion === 1 && f.pj > 0 ? "font-semibold" : ""}`}
            >
              <td className="py-2 pl-3 pr-2 text-suave">{f.posicion}</td>
              <td className="py-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden
                    className={`w-1 h-5 rounded-full shrink-0 ${f.posicion === 1 && f.pj > 0 ? "bg-panuelo" : "bg-transparent"}`}
                  />
                  <span className="truncate">{f.nombre}</span>
                </span>
              </td>
              {columnas.map((c) => (
                <td
                  key={c.clave}
                  className={`text-right py-2 pl-2 last:pr-3 ${c.clave === "pts" ? `font-display italic font-extrabold text-base ${esLider(f, i) ? "text-panuelo-texto" : ""}` : ""}`}
                >
                  {c.clave === "dif" && f.dif > 0 ? `+${f.dif}` : f[c.clave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
