import Link from "next/link";
import type { ReactNode } from "react";
import type { PartidoPublico } from "@/lib/types";
import { fechaCorta, fechaHora } from "./formato";

function Equipo({
  nombre,
  color,
  alineacion,
}: {
  nombre: string;
  color: string | null;
  alineacion: "izq" | "der";
}) {
  return (
    <span
      className={`flex items-center gap-2 min-w-0 ${alineacion === "der" ? "flex-row-reverse text-right" : ""}`}
    >
      <span
        aria-hidden
        className="w-2.5 h-2.5 rounded-full shrink-0 bg-suave"
        style={color ? { backgroundColor: color } : undefined}
      />
      <span className="font-semibold leading-tight break-words">{nombre}</span>
    </span>
  );
}

/** Contenedor de filas de marcador: panel sólido, una fila por partido. */
export const LISTA_PARTIDOS = "panel overflow-hidden";

/** Fila compacta de resultado: local, marcador, visitante. */
export function FilaMarcador({ partido }: { partido: PartidoPublico }) {
  const enJuego = partido.estado === "EN_CURSO";
  return (
    <li className="border-b border-texto/10 last:border-b-0">
      <Link
        href={`/resultado/${partido.id}`}
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 py-3 hover:bg-panel-alterno"
      >
        <Equipo
          nombre={partido.equipoLocal.nombre}
          color={partido.equipoLocal.colorPrimario}
          alineacion="izq"
        />
        <div className="flex flex-col items-center leading-none">
          <span className="font-display italic font-extrabold text-3xl tabular-nums">
            {partido.marcadorLocal}
            <span className="text-suave mx-1.5">–</span>
            {partido.marcadorVisitante}
          </span>
          <span
            className={`text-[11px] mt-1 font-bold uppercase tracking-[0.1em] ${enJuego ? "text-panuelo-texto" : "text-suave"}`}
          >
            {enJuego ? "En juego" : fechaCorta(partido.fechaHora)}
          </span>
        </div>
        <Equipo
          nombre={partido.equipoVisitante.nombre}
          color={partido.equipoVisitante.colorPrimario}
          alineacion="der"
        />
      </Link>
    </li>
  );
}

export function FilaProximo({ partido }: { partido: PartidoPublico }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 py-2.5 border-b border-texto/10 last:border-b-0 text-sm">
      <Equipo
        nombre={partido.equipoLocal.nombre}
        color={partido.equipoLocal.colorPrimario}
        alineacion="izq"
      />
      <span className="text-xs text-suave whitespace-nowrap">
        {fechaHora(partido.fechaHora)}
      </span>
      <Equipo
        nombre={partido.equipoVisitante.nombre}
        color={partido.equipoVisitante.colorPrimario}
        alineacion="der"
      />
    </li>
  );
}

/** Zona de anotación: banda lateral del color del equipo con su nombre en vertical. */
function ZonaAnotacion({ nombre, lado }: { nombre: string; lado: "local" | "visitante" }) {
  return (
    <div
      className={`w-[30px] sm:w-11 shrink-0 flex items-center justify-center py-3 text-white ${lado === "local" ? "bg-local" : "bg-visitante"}`}
    >
      <span
        title={nombre}
        className="[writing-mode:vertical-rl] rotate-180 max-h-full overflow-hidden text-ellipsis whitespace-nowrap font-display italic font-extrabold uppercase tracking-[0.08em] text-sm sm:text-lg leading-none"
      >
        {nombre}
      </span>
    </div>
  );
}

/**
 * Marcador de transmisión: zonas de anotación a los lados, pasto a franjas
 * al centro y la placa con el marcador encima.
 */
export function TableroEstadio({
  local,
  visitante,
  marcadorLocal,
  marcadorVisitante,
  linea,
  enJuego,
}: {
  local: string;
  visitante: string;
  marcadorLocal: number;
  marcadorVisitante: number;
  linea: ReactNode;
  enJuego: boolean;
}) {
  return (
    <div className="flex items-stretch min-h-44 sm:min-h-60 rounded-[10px] overflow-hidden border border-texto/15">
      <ZonaAnotacion nombre={local} lado="local" />
      <div className="franjas-campo flex-1 min-w-0 flex items-center justify-center px-3 py-6">
        {/* En claro la placa va opaca: el dorado oscuro sobre fondo translúcido
            no llega a 4.5:1. */}
        <div className="bg-fondo dark:bg-fondo/88 rounded-lg px-4 sm:px-10 py-3 sm:py-4 flex flex-col items-center gap-1.5 max-w-full">
          <p className="font-display italic font-extrabold tabular-nums leading-none text-6xl sm:text-8xl whitespace-nowrap">
            {marcadorLocal}
            <span className="text-suave mx-2 sm:mx-4">–</span>
            {marcadorVisitante}
          </p>
          <p
            className={`text-xs sm:text-sm font-bold uppercase tracking-[0.12em] text-center ${enJuego ? "text-panuelo-texto" : "text-suave"}`}
          >
            {linea}
          </p>
        </div>
      </div>
      <ZonaAnotacion nombre={visitante} lado="visitante" />
    </div>
  );
}

/**
 * El marcador grande del hero: el partido que importa ahora mismo (en juego
 * o el último resultado), pintado sobre el campo.
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
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-suave">
        {enJuego && <span aria-hidden className="w-2 h-2 rounded-full bg-panuelo animate-pulse shrink-0" />}
        {etiqueta} · {liga}
      </p>
      <TableroEstadio
        local={partido.equipoLocal.nombre}
        visitante={partido.equipoVisitante.nombre}
        marcadorLocal={partido.marcadorLocal}
        marcadorVisitante={partido.marcadorVisitante}
        enJuego={enJuego}
        linea={enJuego ? "Marcador en vivo" : fechaHora(partido.fechaHora)}
      />
    </div>
  );
}
