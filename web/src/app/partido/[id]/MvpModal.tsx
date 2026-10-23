"use client";

import { useEffect, useRef } from "react";
import { Icono } from "@/components/icons/Icono";
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

  const equipos: { equipo: EquipoConRoster; banda: string }[] = [
    { equipo: equipoLocal, banda: "bg-local" },
    { equipo: equipoVisitante, banda: "bg-visitante" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
      onClick={obligatorio ? undefined : onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Elegir MVP del partido"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-panel rounded-[10px] p-6 shadow-2xl flex flex-col gap-5 relative border border-texto/15 border-t-4 border-t-panuelo outline-none max-h-[85vh]"
      >
        <div className="flex justify-between items-center gap-3 border-b border-texto/15 pb-4">
          <div className="flex flex-col">
            <h3 className="titulo-estadio text-2xl leading-tight flex items-center gap-2">
              <Icono nombre="trofeo" className="text-panuelo-texto shrink-0" />
              MVP del partido
            </h3>
            {obligatorio && (
              <span className="text-xs font-semibold text-suave">
                Elige un jugador para cerrar el partido
              </span>
            )}
          </div>
          {!obligatorio && (
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-3 rounded-lg bg-panel-alterno border border-texto/15 text-2xl shrink-0"
            >
              <Icono nombre="cerrar" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto pr-1">
          {equipos.map(({ equipo, banda }) => (
            <div key={equipo.id} className="flex flex-col gap-2">
              <h4 className={`${banda} text-white rounded-md px-3 py-1 titulo-estadio text-lg tracking-[0.06em]`}>
                {equipo.nombre}
              </h4>
              {equipo.jugadores.length === 0 ? (
                <p className="text-sm text-suave py-2">Sin jugadores registrados.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {equipo.jugadores.map((jugador) => {
                    const esMvpActual = jugador.id === mvpJugadorId;
                    return (
                      <button
                        key={jugador.id}
                        onClick={() => onSelect(jugador)}
                        className={`flex flex-col items-center justify-center gap-1 p-4 rounded-lg border-2 active:scale-95 transition-transform ${
                          esMvpActual
                            ? "border-panuelo bg-panuelo text-[#0A1A33]"
                            : "border-texto/15 bg-panel-alterno"
                        }`}
                      >
                        {esMvpActual && <Icono nombre="trofeo" className="text-lg" />}
                        <span className="font-display italic font-extrabold text-4xl leading-none">#{jugador.numeroJersey}</span>
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
