"use client";

import { useReducer, useState } from "react";
import { useTheme } from "next-themes";
import { apiFetch } from "@/lib/api";
import type {
  EstadoPartido,
  GameEvent,
  Jugador,
  Marcador,
  PartidoConRoster,
  TipoEvento,
} from "@/lib/types";
import { ActionModal } from "./ActionModal";
import { describirEvento } from "./describe";
import { CLOSED, flowReducer, type TeamSide } from "./flow";
import { playBeep, useHalfTimer, useHaptics } from "./hooks";

interface RegistrarEventoResponse {
  evento: GameEvent;
  marcador: Marcador;
  duplicado: boolean;
}

async function postEvento(
  partidoId: string,
  payload: { tipoEvento: TipoEvento; equipoId?: string; jugadorId?: string },
): Promise<RegistrarEventoResponse> {
  const res = await fetch(`/api/proxy/partidos/${partidoId}/eventos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, clientEventId: crypto.randomUUID() }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<RegistrarEventoResponse> & {
    message?: string | string[];
  };
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
    throw new Error(message ?? "No se pudo registrar el evento");
  }
  return data as RegistrarEventoResponse;
}

const formatTime = (totalSecs: number) => {
  const m = Math.floor(totalSecs / 60).toString().padStart(2, "0");
  const s = (totalSecs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export default function ScoreboardClient({
  partido,
  eventosIniciales,
}: {
  partido: PartidoConRoster;
  eventosIniciales: GameEvent[];
}) {
  const { equipoLocal, equipoVisitante } = partido;
  const [estado, setEstado] = useState<EstadoPartido>(partido.estado);
  const [marcador, setMarcador] = useState<Marcador>({
    local: partido.marcadorLocal,
    visitante: partido.marcadorVisitante,
  });
  const [eventos, setEventos] = useState<GameEvent[]>(eventosIniciales);
  const [flow, dispatch] = useReducer(flowReducer, CLOSED);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vibrate = useHaptics();
  const { resolvedTheme, setTheme } = useTheme();
  const halfTimer = useHalfTimer(20, {
    thresholdSeconds: 120,
    onThreshold: () => {
      vibrate([200, 100, 200, 100, 200]);
      playBeep();
    },
  });

  const finalizado = estado === "FINALIZADO";
  const equipoIdDe = (team: TeamSide) => (team === "local" ? equipoLocal.id : equipoVisitante.id);
  const lastEvent = eventos.length > 0 ? eventos[eventos.length - 1] : null;

  const ejecutar = async (payload: { tipoEvento: TipoEvento; equipoId?: string; jugadorId?: string }) => {
    setPending(true);
    setError(null);
    try {
      const { evento, marcador: nuevoMarcador, duplicado } = await postEvento(partido.id, payload);
      setMarcador(nuevoMarcador);
      if (!duplicado) setEventos((prev) => [...prev, evento]);
      return evento;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el evento");
      return null;
    } finally {
      setPending(false);
    }
  };

  const refrescarEstado = async () => {
    try {
      const fresco = await apiFetch<{ estado: EstadoPartido }>(`/partidos/${partido.id}`);
      setEstado(fresco.estado);
    } catch {
      // si falla el refresco, el usuario sigue viendo el estado anterior; no es crítico
    }
  };

  const handleScoreIntent = (team: TeamSide, points: 6 | 1 | 2) => {
    if (finalizado || pending) return;
    vibrate(50);
    if (points === 6) {
      dispatch({ type: "abrir_td", team });
      return;
    }
    void ejecutar({
      tipoEvento: points === 1 ? "PAT1" : "PAT2",
      equipoId: equipoIdDe(team),
    }).then(() => vibrate([50, 50, 50]));
  };

  const handleFlagIntent = () => {
    if (finalizado || pending) return;
    vibrate(100);
    dispatch({ type: "abrir_flag" });
  };

  const handleDefplayIntent = () => {
    if (finalizado || pending) return;
    vibrate(50);
    dispatch({ type: "abrir_defplay" });
  };

  const handleUndo = () => {
    if (finalizado || pending || eventos.length === 0) return;
    vibrate([50, 50, 50]);
    void ejecutar({ tipoEvento: "UNDO_LAST_ACTION" });
  };

  const handleSelectPlayer = (jugador: Jugador) => {
    const paso = flow;
    if (paso.step !== "td_player" && paso.step !== "flag_player" && paso.step !== "defplay_player") return;
    vibrate([50, 50, 50]);
    void ejecutar({
      tipoEvento: paso.tipoEvento,
      equipoId: equipoIdDe(paso.team),
      jugadorId: jugador.id,
    });
    dispatch({ type: "cerrar" });
  };

  const handleSkipPlayer = () => {
    const paso = flow;
    if (paso.step !== "td_player" && paso.step !== "flag_player" && paso.step !== "defplay_player") return;
    vibrate([50, 50, 50]);
    void ejecutar({ tipoEvento: paso.tipoEvento, equipoId: equipoIdDe(paso.team) });
    dispatch({ type: "cerrar" });
  };

  const handleTimerToggle = async () => {
    vibrate();
    if (halfTimer.running) {
      halfTimer.pause();
      return;
    }
    if (estado === "PROGRAMADO") {
      const evento = await ejecutar({ tipoEvento: "INICIO_MITAD" });
      if (!evento) return; // el POST falló: no arrancar el cronómetro
      setEstado("EN_CURSO");
    }
    halfTimer.start();
  };

  const handleFinMitad = async () => {
    if (finalizado || pending) return;
    vibrate([100, 50, 100]);
    halfTimer.pause();
    const evento = await ejecutar({ tipoEvento: "FIN_MITAD" });
    if (evento) await refrescarEstado();
  };

  const handleResetTimer = () => {
    vibrate();
    halfTimer.pause();
    halfTimer.reset();
  };

  return (
    <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full gap-4 select-none relative h-[100dvh]">
      <header className="flex justify-between items-center glass-panel rounded-3xl p-5 mb-2">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-widest opacity-60">
            {partido.categoria?.liga.nombre} · {partido.categoria?.nombre}
          </span>
          <h1 className="font-extrabold text-2xl tracking-tight">
            {finalizado ? "FINALIZADO" : estado === "EN_CURSO" ? "EN JUEGO" : "PROGRAMADO"}
          </h1>
        </div>
        <button
          onClick={() => { vibrate(); setTheme(resolvedTheme === "dark" ? "light" : "dark"); }}
          className="p-3 rounded-full bg-foreground/5 shadow-sm animate-pop"
          aria-label="Cambiar tema"
        >
          {resolvedTheme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      {!finalizado && (
        <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest opacity-60">Cronómetro de Mitad</span>
            <span className={`text-3xl font-black tabular-nums ${halfTimer.remainingSeconds <= 120 ? "text-red-500" : ""}`}>
              {formatTime(halfTimer.remainingSeconds)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              value={halfTimer.totalMinutes}
              disabled={halfTimer.running}
              onChange={(e) => halfTimer.setTotalMinutes(Math.max(1, Number(e.target.value) || 1))}
              aria-label="Duración de la mitad en minutos"
              className="w-14 text-center p-2 rounded-xl bg-foreground/5 font-bold disabled:opacity-40"
            />
            <button
              onClick={() => void handleTimerToggle()}
              disabled={pending}
              aria-label={halfTimer.running ? "Pausar cronómetro" : "Iniciar cronómetro"}
              className="p-3 rounded-full bg-foreground/5 shadow-sm animate-pop text-xl disabled:opacity-40"
            >
              {halfTimer.running ? "⏸️" : "▶️"}
            </button>
            <button
              onClick={handleResetTimer}
              aria-label="Reiniciar cronómetro"
              className="p-3 rounded-full bg-foreground/5 shadow-sm animate-pop text-xl"
            >
              🔄
            </button>
            <button
              onClick={() => void handleFinMitad()}
              disabled={pending}
              aria-label="Marcar fin de mitad"
              className="p-3 rounded-full bg-foreground/5 shadow-sm animate-pop text-xl disabled:opacity-40"
            >
              🏁
            </button>
          </div>
        </div>
      )}

      {!finalizado && halfTimer.remainingSeconds <= 120 && halfTimer.remainingSeconds > 0 && (
        <div className="text-center text-sm font-black text-red-500 animate-pulse bg-red-500/10 rounded-xl py-2">
          ⏰ ¡PAUSA DE LOS 2 MINUTOS!
        </div>
      )}

      {finalizado && (
        <div className="text-center text-sm font-black text-blue-500 bg-blue-500/10 rounded-xl py-2">
          🏁 Partido finalizado
        </div>
      )}

      {error && (
        <div role="alert" className="text-center text-sm font-semibold text-red-500 bg-red-500/10 rounded-xl py-2">
          {error}
        </div>
      )}

      {lastEvent && (
        <div className="text-center text-sm font-semibold text-foreground/70 bg-foreground/5 rounded-xl py-2">
          📝 {describirEvento(lastEvent, equipoLocal, equipoVisitante)}
        </div>
      )}

      <div className="flex-1 flex flex-col gap-4">
        <TeamPanel
          equipo={equipoLocal}
          score={marcador.local}
          side="local"
          disabled={finalizado || pending}
          onScore={handleScoreIntent}
        />
        <TeamPanel
          equipo={equipoVisitante}
          score={marcador.visitante}
          side="visitante"
          disabled={finalizado || pending}
          onScore={handleScoreIntent}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-2 pb-6">
        <button
          onClick={handleDefplayIntent}
          disabled={finalizado || pending}
          className="glass-panel rounded-2xl py-4 flex items-center justify-center font-bold opacity-80 animate-pop border-b-4 border-b-red-500 shadow-md text-sm text-center disabled:opacity-30"
        >
          🛡️ Sack/<br />Pick/Safety
        </button>
        <button
          onClick={handleFlagIntent}
          disabled={finalizado || pending}
          className="glass-panel rounded-2xl py-4 flex flex-col items-center justify-center font-black animate-pop border-b-4 border-b-yellow-400 bg-yellow-500/10 shadow-lg text-lg text-yellow-600 dark:text-yellow-400 disabled:opacity-30"
        >
          🟨 FLAG
        </button>
        <button
          onClick={handleUndo}
          disabled={finalizado || pending || eventos.length === 0}
          className="glass-panel rounded-2xl py-4 flex items-center justify-center font-bold opacity-70 animate-pop border border-foreground/10 text-sm disabled:opacity-30"
        >
          ↩️ Undo
        </button>
      </div>

      <ActionModal
        flow={flow}
        equipoLocal={equipoLocal}
        equipoVisitante={equipoVisitante}
        dispatch={dispatch}
        onClose={() => dispatch({ type: "cerrar" })}
        onSelectPlayer={handleSelectPlayer}
        onSkipPlayer={handleSkipPlayer}
      />
    </main>
  );
}

// Tailwind escanea el código fuente buscando nombres de clase completos y
// literales: construir "bg-" + variable en tiempo de ejecución no genera CSS.
// Este mapa mantiene cada clase completa como string literal para que el
// escáner las encuentre, y en runtime solo se elige qué entrada usar.
const TEAM_STYLES: Record<
  TeamSide,
  { border: string; gradient: string; text: string; bg: string; bgSoft: string; shadow: string }
> = {
  local: {
    border: "border-t-team-a",
    gradient: "from-team-a/10",
    text: "text-team-a",
    bg: "bg-team-a",
    bgSoft: "bg-team-a/20",
    shadow: "shadow-team-a/30",
  },
  visitante: {
    border: "border-t-team-b",
    gradient: "from-team-b/10",
    text: "text-team-b",
    bg: "bg-team-b",
    bgSoft: "bg-team-b/20",
    shadow: "shadow-team-b/30",
  },
};

function TeamPanel({
  equipo,
  score,
  side,
  disabled,
  onScore,
}: {
  equipo: PartidoConRoster["equipoLocal"];
  score: number;
  side: TeamSide;
  disabled: boolean;
  onScore: (team: TeamSide, points: 6 | 1 | 2) => void;
}) {
  const c = TEAM_STYLES[side];
  return (
    <div
      className={`glass-panel rounded-[2rem] p-5 flex flex-col items-center justify-between border-t-8 ${c.border} relative overflow-hidden shadow-2xl`}
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${c.gradient} to-transparent pointer-events-none`} />
      <h2 className="text-2xl font-black tracking-widest uppercase text-center">{equipo.nombre}</h2>
      <span className={`text-[7rem] leading-[1.1] font-black tracking-tighter tabular-nums drop-shadow-2xl ${c.text}`}>
        {score}
      </span>
      <div className="grid grid-cols-3 gap-2 w-full z-10">
        <button
          onClick={() => onScore(side, 6)}
          disabled={disabled}
          className={`col-span-1 ${c.bg} text-white shadow-xl ${c.shadow} font-black rounded-2xl animate-pop text-2xl h-16 disabled:opacity-40`}
        >
          +6
        </button>
        <button
          onClick={() => onScore(side, 1)}
          disabled={disabled}
          className={`col-span-1 ${c.bgSoft} ${c.text} font-black rounded-2xl animate-pop text-xl h-16 disabled:opacity-40`}
        >
          +1
        </button>
        <button
          onClick={() => onScore(side, 2)}
          disabled={disabled}
          className={`col-span-1 ${c.bgSoft} ${c.text} font-black rounded-2xl animate-pop text-xl h-16 disabled:opacity-40`}
        >
          +2
        </button>
      </div>
    </div>
  );
}
