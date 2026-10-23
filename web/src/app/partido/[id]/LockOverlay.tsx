"use client";

import { useCallback, useRef, useState } from "react";
import { TableroEstadio } from "@/app/_publico/Marcador";
import { Icono } from "@/components/icons/Icono";
import type { PartidoConRoster } from "@/lib/types";

const HOLD_MS = 800;

/**
 * Overlay de bloqueo (HU-2.3). Cubre toda la pantalla con `pointer-events`
 * propios: los botones reales del marcador quedan debajo, inalcanzables,
 * sin tener que deshabilitarlos uno por uno. Repite marcador y cronómetro
 * en modo solo-lectura para que el árbitro siga viendo el estado del
 * partido a simple vista mientras está bloqueada.
 */
export function LockOverlay({
  equipoLocal,
  equipoVisitante,
  scoreLocal,
  scoreVisitante,
  tiempoRestante,
  onUnlock,
  vibrate,
}: {
  equipoLocal: PartidoConRoster["equipoLocal"];
  equipoVisitante: PartidoConRoster["equipoVisitante"];
  scoreLocal: number;
  scoreVisitante: number;
  tiempoRestante: string;
  onUnlock: () => void;
  vibrate: (pattern?: number | number[]) => void;
}) {
  const [holding, setHolding] = useState(false);
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHold = useCallback(() => {
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    holdTimeout.current = null;
    setHolding(false);
  }, []);

  const startHold = useCallback(() => {
    setHolding(true);
    holdTimeout.current = setTimeout(() => {
      vibrate([50, 50, 50]);
      onUnlock();
    }, HOLD_MS);
  }, [onUnlock, vibrate]);

  return (
    <div
      role="dialog"
      aria-label="Pantalla bloqueada"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-fondo p-6 gap-6"
    >
      <span className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-suave">
        <Icono nombre="candado" className="text-base" />
        Pantalla bloqueada
      </span>

      <div className="w-full max-w-md">
        <TableroEstadio
          local={equipoLocal.nombre}
          visitante={equipoVisitante.nombre}
          marcadorLocal={scoreLocal}
          marcadorVisitante={scoreVisitante}
          enJuego
          linea={<span className="font-display italic font-extrabold text-3xl tabular-nums tracking-normal">{tiempoRestante}</span>}
        />
      </div>

      <button
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        aria-label="Mantén presionado para desbloquear"
        className={`relative mb-8 w-full max-w-xs rounded-[10px] border-2 py-6 px-4 flex items-center justify-center gap-2 font-black text-lg shadow-xl select-none transition-transform ${
          holding ? "scale-95 bg-panuelo border-panuelo text-[#0A1A33]" : "bg-panel border-texto/20"
        }`}
      >
        <Icono nombre={holding ? "candado-abierto" : "candado"} className="text-2xl shrink-0" />
        {holding ? "Desbloqueando…" : "Mantén presionado para desbloquear"}
      </button>
    </div>
  );
}
