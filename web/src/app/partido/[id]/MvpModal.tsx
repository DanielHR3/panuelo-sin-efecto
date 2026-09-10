"use client";

import { useEffect, useRef } from "react";
import type { EquipoConRoster, Jugador } from "@/lib/types";

/**
 * Selección de MVP del partido (HU-2.5). `obligatorio` distingue el disparo
 * automático al finalizar (sin MVP todavía: no se puede cerrar sin elegir)
 * del botón "corregir MVP" posterior (ya hay uno: se puede cerrar sin tocar
 * nada). El backend acepta re-elegir en cualquier momento — este modal es la
 * única UI, tanto para elegir como para corregir.
 */
export function MvpModal({
  equipoLocal,
  equipoVisitante,
  mvpJugadorId,
  obligatorio,
  onSelect,
  onClose,
}: {
  equipoLocal: EquipoConRoster;
  equipoVisitante: EquipoConRoster;
  mvpJugadorId: string | null;
  obligatorio: boolean;
  onSelect: (jugador: Jugador) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    if (obligatorio) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, []);

  const equipos: { equipo: EquipoConRoster; color: string }[] = [
    { equipo: equipoLocal, color: "text-team-a" },
    { equipo: equipoVisitante, color: "text-team-b" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={obligatorio ? undefined : onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Elegir MVP del partido"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-background rounded-[2rem] p-6 shadow-2xl flex flex-col gap-5 relative border border-foreground/10 outline-none max-h-[85vh]"
      >
        <div className="flex justify-between items-center border-b border-foreground/10 pb-4">
          <div className="flex flex-col">
            <h3 className="text-2xl font-black">🏆 MVP del partido</h3>
            {obligatorio && (
              <span className="text-xs font-semibold text-foreground/60">
                Elige un jugador para cerrar el partido
              </span>
            )}
          </div>
          {!obligatorio && (
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-3 bg-foreground/5 rounded-full font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto pr-1">
          {equipos.map(({ equipo, color }) => (
            <div key={equipo.id} className="flex flex-col gap-2">
              <h4 className={`text-sm font-black uppercase tracking-wide ${color}`}>
                {equipo.nombre}
              </h4>
              {equipo.jugadores.length === 0 ? (
                <p className="text-sm text-foreground/50 py-2">Sin jugadores registrados.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {equipo.jugadores.map((jugador) => {
                    const esMvpActual = jugador.id === mvpJugadorId;
                    return (
                      <button
                        key={jugador.id}
                        onClick={() => onSelect(jugador)}
                        className={`flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 active:scale-95 transition-transform ${
                          esMvpActual
                            ? "border-yellow-400 bg-yellow-400/10"
                            : "border-foreground/10 hover:bg-foreground/5"
                        }`}
                      >
                        {esMvpActual && <span className="text-lg leading-none">🏆</span>}
                        <span className="text-3xl font-black">#{jugador.numeroJersey}</span>
                        <span className="text-sm font-bold truncate w-full text-center">
                          {jugador.nombre}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
