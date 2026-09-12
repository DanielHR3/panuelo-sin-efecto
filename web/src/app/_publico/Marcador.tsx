import type { PartidoPublico } from "@/lib/types";
import { fechaCorta, fechaHora } from "./formato";

function Equipo({ nombre, color, alineacion }: { nombre: string; color: string | null; alineacion: "izq" | "der" }) {
  return (
    <span
      className={`flex items-center gap-2 min-w-0 ${alineacion === "der" ? "flex-row-reverse text-right" : ""}`}
    >
      <span
        aria-hidden
        className="w-2.5 h-2.5 rounded-full shrink-0 bg-foreground/30"
        style={color ? { backgroundColor: color } : undefined}
      />
      <span className="font-semibold leading-tight break-words">{nombre}</span>
    </span>
  );
}

/** Fila compacta de resultado: local, marcador, visitante. */
export function FilaMarcador({ partido }: { partido: PartidoPublico }) {
  const enJuego = partido.estado === "EN_CURSO";
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-3 border-b border-foreground/10 last:border-b-0">
      <Equipo nombre={partido.equipoLocal.nombre} color={partido.equipoLocal.colorPrimario} alineacion="izq" />
      <div className="flex flex-col items-center leading-none">
        <span className="font-black text-2xl tabular-nums tracking-tight">
          {partido.marcadorLocal}
          <span className="opacity-40 mx-1.5">–</span>
          {partido.marcadorVisitante}
        </span>
        <span className={`text-[11px] mt-1 font-semibold ${enJuego ? "text-campo-claro dark:text-green-400" : "opacity-60"}`}>
          {enJuego ? "En juego" : fechaCorta(partido.fechaHora)}
        </span>
      </div>
      <Equipo nombre={partido.equipoVisitante.nombre} color={partido.equipoVisitante.colorPrimario} alineacion="der" />
    </li>
  );
}

export function FilaProximo({ partido }: { partido: PartidoPublico }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-2.5 border-b border-foreground/10 last:border-b-0 text-sm">
      <Equipo nombre={partido.equipoLocal.nombre} color={partido.equipoLocal.colorPrimario} alineacion="izq" />
      <span className="text-xs opacity-60 whitespace-nowrap">{fechaHora(partido.fechaHora)}</span>
      <Equipo nombre={partido.equipoVisitante.nombre} color={partido.equipoVisitante.colorPrimario} alineacion="der" />
    </li>
  );
}

/**
 * El marcador grande del hero: el partido que importa ahora mismo (en juego
 * o el último resultado), escrito con tiza sobre el campo.
 */
export function MarcadorHero({
  partido,
  etiqueta,
  liga,
}: {
  partido: PartidoPublico;
  etiqueta: string;
  liga: string;
}) {
  const enJuego = partido.estado === "EN_CURSO";
  return (
    <div className="text-tiza flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm font-semibold opacity-90">
        {enJuego && <span aria-hidden className="w-2 h-2 rounded-full bg-panuelo animate-pulse" />}
        {etiqueta} · {liga}
      </p>
      {/* En teléfonos el marcador va arriba a todo lo ancho y los nombres
          debajo, uno a cada lado; desde `sm` los tres van en una fila. */}
      <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 sm:gap-8">
        <p className="font-black tabular-nums tracking-tighter text-7xl sm:text-8xl leading-none whitespace-nowrap col-span-2 sm:col-span-1 sm:order-2 text-center">
          {partido.marcadorLocal}
          <span className="opacity-50 mx-2 sm:mx-4">–</span>
          {partido.marcadorVisitante}
        </p>
        <p className="text-xl sm:text-3xl font-bold leading-tight min-w-0 [overflow-wrap:anywhere] sm:order-1">
          {partido.equipoLocal.nombre}
        </p>
        <p className="text-xl sm:text-3xl font-bold leading-tight text-right min-w-0 [overflow-wrap:anywhere] sm:order-3">
          {partido.equipoVisitante.nombre}
        </p>
      </div>
      <p className="text-sm opacity-80">{enJuego ? "Marcador en vivo" : fechaHora(partido.fechaHora)}</p>
    </div>
  );
}
