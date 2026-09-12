import Link from "next/link";
import type { LiderPublico } from "@/lib/types";

export function Lideres({ lideres }: { lideres: LiderPublico[] }) {
  if (lideres.length === 0) {
    return <p className="text-sm opacity-60 py-3">Los líderes aparecen en cuanto alguien anota.</p>;
  }
  return (
    <ol className="flex flex-col">
      {lideres.map((l, i) => (
        <li
          key={l.jugadorId}
          className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 py-2.5 border-b border-foreground/10 last:border-b-0"
        >
          <span className="text-sm opacity-60 tabular-nums">{i + 1}</span>
          <Link href={`/jugador/${l.jugadorId}`} className="min-w-0 group">
            <span className="block font-semibold truncate group-hover:underline">
              <span className="opacity-60 mr-1.5">#{l.numeroJersey}</span>
              {l.nombre}
            </span>
            <span className="block text-xs opacity-60 truncate">
              {l.equipo?.nombre ?? "Sin equipo"} · {l.td} TD · {l.intercepciones} INT
            </span>
          </Link>
          <span className="font-black text-lg tabular-nums">{l.puntos}</span>
        </li>
      ))}
    </ol>
  );
}
