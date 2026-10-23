import Link from "next/link";
import type { LiderPublico } from "@/lib/types";

export function Lideres({ lideres }: { lideres: LiderPublico[] }) {
  if (lideres.length === 0) {
    return <p className="text-sm text-suave py-3">Los líderes aparecen en cuanto alguien anota.</p>;
  }
  return (
    <ol className="panel overflow-hidden flex flex-col">
      {lideres.map((l, i) => (
        <li
          key={l.jugadorId}
          className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 px-3 py-2.5 odd:bg-panel even:bg-panel-alterno"
        >
          <span className="text-sm text-suave tabular-nums">{i + 1}</span>
          <Link href={`/jugador/${l.jugadorId}`} className="min-w-0 group">
            <span className="block font-semibold truncate group-hover:underline">
              <span className="text-suave mr-1.5">#{l.numeroJersey}</span>
              {l.nombre}
            </span>
            <span className="block text-xs text-suave truncate">
              {l.equipo?.nombre ?? "Sin equipo"} · {l.td} TD · {l.intercepciones} INT
            </span>
          </Link>
          {/* El líder siempre es la primera fila (sobre `panel`): ahí el dorado pasa 4.5:1. */}
          <span className={`font-display italic font-extrabold text-xl tabular-nums ${i === 0 ? "text-panuelo-texto" : ""}`}>
            {l.puntos}
          </span>
        </li>
      ))}
    </ol>
  );
}
