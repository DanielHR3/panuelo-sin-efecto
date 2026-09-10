"use client";

import { useCallback, useRef, useState } from "react";
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background/95 backdrop-blur-sm p-6 gap-6"
    >
      <div className="flex flex-col items-center gap-1 mt-8">
        <span className="text-xs font-bold uppercase tracking-widest opacity-60">🔒 Pantalla bloqueada</span>
        <span className="text-4xl font-black tabular-nums">{tiempoRestante}</span>
      </div>

      <div className="flex items-center justify-center gap-8 w-full max-w-md">
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold uppercase tracking-wide opacity-60 text-center">
            {equipoLocal.nombre}
          </span>
          <span className="text-5xl font-black tabular-nums">{scoreLocal}</span>
        </div>
        <span className="text-2xl font-black opacity-30">-</span>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold uppercase tracking-wide opacity-60 text-center">
            {equipoVisitante.nombre}
          </span>
          <span className="text-5xl font-black tabular-nums">{scoreVisitante}</span>
        </div>
      </div>

      <button
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        aria-label="Mantén presionado para desbloquear"
        className={`relative mb-8 w-full max-w-xs rounded-full py-6 flex items-center justify-center font-black text-lg shadow-xl select-none transition-transform ${
          holding ? "scale-95 bg-foreground/20" : "bg-foreground/10"
        }`}
      >
        {holding ? "🔓 Desbloqueando…" : "🔒 Mantén presionado para desbloquear"}
      </button>
    </div>
  );
}
