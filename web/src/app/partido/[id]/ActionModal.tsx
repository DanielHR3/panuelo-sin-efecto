"use client";

import { useEffect, useRef } from "react";
import type { EquipoConRoster, Jugador } from "@/lib/types";
import {
  DEFPLAY_LABEL,
  FLAG_LABEL,
  STEP_TITLE,
  TD_LABEL,
  type DefplayTipo,
  type FlagTipo,
  type FlowAction,
  type FlowState,
  type TdTipo,
  type TeamSide,
} from "./flow";

export function ActionModal({
  flow,
  equipoLocal,
  equipoVisitante,
  dispatch,
  onClose,
  onSelectPlayer,
  onSkipPlayer,
}: {
  flow: FlowState;
  equipoLocal: EquipoConRoster;
  equipoVisitante: EquipoConRoster;
  dispatch: (action: FlowAction) => void;
  onClose: () => void;
  onSelectPlayer: (jugador: Jugador) => void;
  onSkipPlayer: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (flow.step === "closed") return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      lastFocusedRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe correr al abrir/cerrar el modal
  }, [flow.step !== "closed"]);

  if (flow.step === "closed") return null;

  const equipoDe = (team: TeamSide) => (team === "local" ? equipoLocal : equipoVisitante);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={STEP_TITLE[flow.step]}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-background rounded-[2rem] p-6 shadow-2xl flex flex-col gap-6 relative border border-foreground/10 outline-none"
      >
        <div className="flex justify-between items-center border-b border-foreground/10 pb-4">
          <h3 className="text-2xl font-black">{STEP_TITLE[flow.step]}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-3 bg-foreground/5 rounded-full font-bold"
          >
            ✕
          </button>
        </div>

        {flow.step === "td_type" && (
          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(TD_LABEL) as TdTipo[]).map((tipoEvento) => (
              <button
                key={tipoEvento}
                onClick={() => dispatch({ type: "elegir_td_tipo", tipoEvento })}
                className="p-5 rounded-2xl border-2 border-foreground/10 font-black text-xl hover:bg-foreground/5 animate-pop"
              >
                {TD_LABEL[tipoEvento]}
              </button>
            ))}
          </div>
        )}

        {flow.step === "flag_type" && (
          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(FLAG_LABEL) as FlagTipo[]).map((tipoEvento) => (
              <button
                key={tipoEvento}
                onClick={() => dispatch({ type: "elegir_flag_tipo", tipoEvento })}
                className="p-5 rounded-2xl border-2 border-yellow-500/30 font-black text-xl hover:bg-yellow-500/10 animate-pop text-yellow-600 dark:text-yellow-400"
              >
                {FLAG_LABEL[tipoEvento]}
              </button>
            ))}
          </div>
        )}

        {flow.step === "defplay_type" && (
          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(DEFPLAY_LABEL) as DefplayTipo[]).map((tipoEvento) => (
              <button
                key={tipoEvento}
                onClick={() => dispatch({ type: "elegir_defplay_tipo", tipoEvento })}
                className="p-5 rounded-2xl border-2 border-red-500/30 font-black text-xl hover:bg-red-500/10 animate-pop text-red-600 dark:text-red-400"
              >
                {DEFPLAY_LABEL[tipoEvento]}
              </button>
            ))}
          </div>
        )}

        {(flow.step === "flag_team" || flow.step === "defplay_team") && (
          <div className="grid grid-cols-2 gap-4">
            {(["local", "visitante"] as TeamSide[]).map((team) => {
              const equipo = equipoDe(team);
              return (
                <button
                  key={team}
                  onClick={() => dispatch({ type: "elegir_equipo", team })}
                  className={`p-6 rounded-2xl border-4 font-black text-xl animate-pop flex flex-col items-center gap-2 ${
                    team === "local"
                      ? "border-team-a/30 text-team-a"
                      : "border-team-b/30 text-team-b"
                  }`}
                >
                  {equipo.nombre}
                </button>
              );
            })}
          </div>
        )}

        {(flow.step === "td_player" || flow.step === "flag_player" || flow.step === "defplay_player") && (
          <PlayerGrid
            equipo={equipoDe(flow.team)}
            onSelect={onSelectPlayer}
            onSkip={onSkipPlayer}
          />
        )}
      </div>
    </div>
  );
}

function PlayerGrid({
  equipo,
  onSelect,
  onSkip,
}: {
  equipo: EquipoConRoster;
  onSelect: (jugador: Jugador) => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {equipo.jugadores.length === 0 ? (
        <p className="text-center text-foreground/60 py-4">
          {equipo.nombre} no tiene jugadores registrados todavía.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[40vh] pr-2">
          {equipo.jugadores.map((jugador) => (
            <button
              key={jugador.id}
              onClick={() => onSelect(jugador)}
              className="flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 border-foreground/10 hover:bg-foreground/5 active:scale-95 transition-transform"
            >
              <span className="text-4xl font-black">#{jugador.numeroJersey}</span>
              <span className="text-sm font-bold truncate w-full text-center">{jugador.nombre}</span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={onSkip}
        className="p-3 rounded-2xl border-2 border-dashed border-foreground/20 text-sm font-semibold text-foreground/60 hover:bg-foreground/5"
      >
        Continuar sin jugador específico →
      </button>
    </div>
  );
}
