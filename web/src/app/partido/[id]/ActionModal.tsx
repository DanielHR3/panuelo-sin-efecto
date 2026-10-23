"use client";

import { useEffect, useRef } from "react";
import { Icono, type NombreIcono } from "@/components/icons/Icono";
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

const ICONO_TD: Record<TdTipo, NombreIcono> = { TD: "touchdown", PICK_SIX: "escudo" };
const ICONO_FLAG: Record<FlagTipo, NombreIcono> = { FALTA_PERSONAL: "falta", EXPULSION: "alerta" };
const ICONO_DEFPLAY: Record<DefplayTipo, NombreIcono> = {
  SACK: "escudo",
  INTERCEPCION: "intercambiar",
  SAFETY: "escudo",
};

export function ActionModal({
  flow,
  equipoLocal,
  equipoVisitante,
  defplayOpciones,
  dispatch,
  onClose,
  onSelectPlayer,
  onSkipPlayer,
}: {
  flow: FlowState;
  equipoLocal: EquipoConRoster;
  equipoVisitante: EquipoConRoster;
  /** HU-1.1: jugadas defensivas habilitadas por la liga (ver opcionesDefplay). */
  defplayOpciones: DefplayTipo[];
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={STEP_TITLE[flow.step]}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-panel rounded-[10px] p-6 shadow-2xl flex flex-col gap-6 relative border border-texto/15 border-t-4 border-t-panuelo outline-none"
      >
        <div className="flex justify-between items-center gap-3 border-b border-texto/15 pb-4">
          <h3 className="titulo-estadio text-2xl leading-tight">{STEP_TITLE[flow.step]}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-3 rounded-lg bg-panel-alterno border border-texto/15 text-2xl shrink-0"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        {flow.step === "td_type" && (
          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(TD_LABEL) as TdTipo[]).map((tipoEvento) => (
              <button
                key={tipoEvento}
                onClick={() => dispatch({ type: "elegir_td_tipo", tipoEvento })}
                className="p-5 rounded-lg border-2 border-texto/15 bg-panel-alterno flex items-center justify-center gap-3 font-black text-xl animate-pop"
              >
                <Icono nombre={ICONO_TD[tipoEvento]} className="text-2xl shrink-0" />
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
                className="p-5 rounded-lg border-2 border-panuelo flex items-center justify-center gap-3 font-black text-xl animate-pop text-panuelo-texto"
              >
                <Icono nombre={ICONO_FLAG[tipoEvento]} className="text-2xl shrink-0" />
                {FLAG_LABEL[tipoEvento]}
              </button>
            ))}
          </div>
        )}

        {flow.step === "defplay_type" && (
          <div className="grid grid-cols-1 gap-3">
            {defplayOpciones.map((tipoEvento) => (
              <button
                key={tipoEvento}
                onClick={() => dispatch({ type: "elegir_defplay_tipo", tipoEvento })}
                className="p-5 rounded-lg border-2 border-texto/15 border-l-[6px] border-l-visitante bg-panel-alterno flex items-center justify-center gap-3 font-black text-xl animate-pop"
              >
                <Icono nombre={ICONO_DEFPLAY[tipoEvento]} className="text-2xl shrink-0" />
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
                  className={`p-6 rounded-lg text-white titulo-estadio text-2xl break-words animate-pop flex flex-col items-center gap-2 ${
                    team === "local" ? "bg-local" : "bg-visitante"
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
        <p className="text-center text-suave py-4">
          {equipo.nombre} no tiene jugadores registrados todavía.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[40vh] pr-2">
          {equipo.jugadores.map((jugador) => (
            <button
              key={jugador.id}
              onClick={() => onSelect(jugador)}
              className="flex flex-col items-center justify-center gap-1 p-4 rounded-lg border-2 border-texto/15 bg-panel-alterno active:scale-95 transition-transform"
            >
              <span className="font-display italic font-extrabold text-5xl leading-none">#{jugador.numeroJersey}</span>
              <span className="text-sm font-bold truncate w-full text-center">{jugador.nombre}</span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={onSkip}
        className="p-3 rounded-lg border-2 border-dashed border-texto/25 text-sm font-semibold text-suave"
      >
        Continuar sin jugador específico →
      </button>
    </div>
  );
}
