"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";

// Mocks de datos
const EQUIPOS = {
  local: {
    nombre: "DRAGONES",
    logo: "🐉",
    color: "team-a",
    roster: [
      { id: 1, jersey: "12", nombre: "A. Pérez" },
      { id: 2, jersey: "88", nombre: "R. Gómez" },
      { id: 3, jersey: "04", nombre: "L. Martínez" },
      { id: 4, jersey: "10", nombre: "D. Hernández" },
    ],
  },
  visitor: {
    nombre: "TITANES",
    logo: "⚔️",
    color: "team-b",
    roster: [
      { id: 5, jersey: "01", nombre: "T. Brady" },
      { id: 6, jersey: "07", nombre: "M. Vick" },
      { id: 7, jersey: "81", nombre: "T. Owens" },
      { id: 8, jersey: "22", nombre: "E. Smith" },
    ],
  },
};

type Player = typeof EQUIPOS.local.roster[0];

type ModalFlow = {
  team?: "local" | "visitor";
  points?: number;
  actionName: string;
  step: "select_type" | "select_qb" | "select_receiver" | "select_runner" | "select_defender" | "select_player" | "select_flag_type" | "select_flag_team" | "select_flag_player" | "select_defplay_type" | "select_defplay_team" | "select_defplay_player";
  playType?: string;
  qb?: Player;
};

// Registro Inmutable de eventos (Caja Negra) — el marcador se deriva de aquí,
// nunca se muta directamente. Persistido en localStorage como resiliencia
// mientras no existe integración con el backend (Offline-First).
type GameEvent = {
  id: number;
  team?: "local" | "visitor";
  points: number;
  description: string;
  timestamp: number;
};

const STORAGE_KEY = "panuelo-sin-efecto:eventos-partido";

export default function Home() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // Estado del Flujo del Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [flow, setFlow] = useState<ModalFlow | null>(null);

  // Cronómetro de mitad + aviso de los 2 minutos (HU-2.4, pedido espontáneamente
  // por ambos árbitros en la validación). Sin backend todavía, la duración se
  // configura localmente en vez de por liga.
  const [halfMinutes, setHalfMinutes] = useState(20);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [warned, setWarned] = useState(false);
  const totalSeconds = halfMinutes * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  const vibrate = (pattern: number | number[] = 50) => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  // Beep generado con Web Audio (sin archivos externos) para que la alarma
  // del cronómetro funcione también sin conexión.
  const playBeep = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Web Audio no disponible en este dispositivo; el aviso visual/háptico sigue funcionando.
    }
  };

  // Restaurar bitácora guardada (sobrevive a un refresh o cierre accidental del navegador)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // Hidratación desde localStorage en el montaje: patrón intencional para
      // Offline-First. Se reemplaza por un hook dedicado en el refactor (PR 4).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setEvents(JSON.parse(saved));
    } catch {
      // localStorage no disponible o datos corruptos: se arranca con bitácora en blanco
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persistir cada evento nuevo
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events, hydrated]);

  // Avanza el cronómetro un segundo a la vez mientras esté corriendo
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => Math.min(prev + 1, totalSeconds));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, totalSeconds]);

  // Aviso único (visual + háptico + sonoro) al llegar exactamente a los 2 minutos restantes
  useEffect(() => {
    if (remainingSeconds === 120 && !warned) {
      // Disparo único del aviso de los 2 minutos (efecto derivado del cronómetro).
      // El refactor (PR 4) lo mueve a un useRef para no re-renderizar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWarned(true);
      vibrate([200, 100, 200, 100, 200]);
      playBeep();
    }
    if (remainingSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      vibrate([300, 100, 300]);
    }
  }, [remainingSeconds, warned, timerRunning]);

  const localScore = useMemo(
    () => events.filter((e) => e.team === "local").reduce((sum, e) => sum + e.points, 0),
    [events]
  );
  const visitorScore = useMemo(
    () => events.filter((e) => e.team === "visitor").reduce((sum, e) => sum + e.points, 0),
    [events]
  );
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  const toggleTimer = () => {
    vibrate();
    setTimerRunning((prev) => !prev);
  };

  const resetTimer = () => {
    vibrate();
    setTimerRunning(false);
    setElapsedSeconds(0);
    setWarned(false);
  };

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60).toString().padStart(2, "0");
    const s = (totalSecs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const pushEvent = (team: "local" | "visitor" | undefined, points: number, description: string) => {
    setEvents((prev) => [...prev, { id: Date.now(), team, points, description, timestamp: Date.now() }]);
  };

  const handleScoreIntent = (team: "local" | "visitor", points: number, actionName: string) => {
    vibrate(50);
    const initialStep = points === 6 ? "select_type" : "select_player";
    setFlow({ team, points, actionName, step: initialStep });
    setModalOpen(true);
  };

  const handleFlagIntent = () => {
    vibrate(100);
    setFlow({ actionName: "FLAG", step: "select_flag_type" });
    setModalOpen(true);
  };

  const handleSackIntent = () => {
    vibrate(50);
    setFlow({ actionName: "Jugada Defensiva", step: "select_defplay_type" });
    setModalOpen(true);
  };

  const handleUndo = () => {
    vibrate([50, 50, 50]);
    setEvents((prev) => prev.slice(0, -1));
  };

  const finalizeAction = (description: string) => {
    vibrate([50, 50, 50]);
    if (!flow) return;

    pushEvent(flow.team, flow.points ?? 0, `${flow.actionName}: ${description}`);
    setModalOpen(false);
    setFlow(null);
  };

  // El payload es heterogéneo según el paso del flujo: un Jugador (selector de
  // roster), un string (tipo de jugada) o un equipo. Se tipa con una unión
  // discriminada en el refactor del modal (PR 4).
  const handleSelect = (data: Player | string) => {
    if (!flow) return;
    const player = data as Player;
    const text = data as string;
    const choice = data as "local" | "visitor";

    // Flujo de Anotaciones
    if (flow.step === "select_qb") {
      setFlow({ ...flow, step: "select_receiver", qb: player });
    } else if (flow.step === "select_receiver") {
      finalizeAction(`Pase de #${flow.qb?.jersey} a #${player.jersey}`);
    } else if (flow.step === "select_runner") {
      finalizeAction(`Carrera de #${player.jersey}`);
    } else if (flow.step === "select_defender") {
      finalizeAction(`Pick Six de #${player.jersey}`);
    } else if (flow.step === "select_player") {
      finalizeAction(`#${player.jersey} ${player.nombre}`);
    }

    // Flujo de Flags
    else if (flow.step === "select_flag_type") {
      setFlow({ ...flow, step: "select_flag_team", playType: text });
    } else if (flow.step === "select_flag_team") {
      setFlow({ ...flow, step: "select_flag_player", team: choice });
    } else if (flow.step === "select_flag_player") {
      finalizeAction(`${flow.playType} - ${flow.team === 'local' ? EQUIPOS.local.nombre : EQUIPOS.visitor.nombre} #${player.jersey}`);
    }

    // Flujo de Jugadas Defensivas (Sack / Intercepción)
    else if (flow.step === "select_defplay_type") {
      setFlow({ ...flow, step: "select_defplay_team", playType: text });
    } else if (flow.step === "select_defplay_team") {
      setFlow({ ...flow, step: "select_defplay_player", team: choice });
    } else if (flow.step === "select_defplay_player") {
      finalizeAction(`${flow.playType} de #${player.jersey} (${flow.team === 'local' ? EQUIPOS.local.nombre : EQUIPOS.visitor.nombre})`);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full gap-4 select-none relative h-[100dvh]">
      <header className="flex justify-between items-center glass-panel rounded-3xl p-5 mb-2">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-widest opacity-60">Semana 4 • Varonil</span>
          <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            EN JUEGO
          </h1>
        </div>
        <button
          onClick={() => { vibrate(); setTheme(resolvedTheme === "dark" ? "light" : "dark"); }}
          className="p-3 rounded-full bg-foreground/5 shadow-sm animate-pop"
          aria-label="Cambiar tema"
        >
          {/* hydrated evita un mismatch de hidratación: resolvedTheme es undefined hasta montar */}
          {hydrated ? (resolvedTheme === "dark" ? "☀️ Claro" : "🌙 Oscuro") : "🌗"}
        </button>
      </header>

      {/* CRONÓMETRO DE MITAD (HU-2.4) */}
      <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-widest opacity-60">Cronómetro de Mitad</span>
          <span className={`text-3xl font-black tabular-nums ${remainingSeconds <= 120 ? "text-red-500" : ""}`}>
            {formatTime(remainingSeconds)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={60}
            value={halfMinutes}
            disabled={timerRunning}
            onChange={(e) => setHalfMinutes(Math.max(1, Number(e.target.value) || 1))}
            aria-label="Duración de la mitad en minutos"
            className="w-14 text-center p-2 rounded-xl bg-foreground/5 font-bold disabled:opacity-40"
          />
          <button onClick={toggleTimer} aria-label={timerRunning ? "Pausar cronómetro" : "Iniciar cronómetro"} className="p-3 rounded-full bg-foreground/5 shadow-sm animate-pop text-xl">
            {timerRunning ? "⏸️" : "▶️"}
          </button>
          <button onClick={resetTimer} aria-label="Reiniciar cronómetro" className="p-3 rounded-full bg-foreground/5 shadow-sm animate-pop text-xl">
            🔄
          </button>
        </div>
      </div>

      {remainingSeconds <= 120 && remainingSeconds > 0 && (
        <div className="text-center text-sm font-black text-red-500 animate-pulse bg-red-500/10 rounded-xl py-2">
          ⏰ ¡PAUSA DE LOS 2 MINUTOS!
        </div>
      )}

      {lastEvent && (
        <div className="text-center text-sm font-semibold text-foreground/70 animate-pulse bg-foreground/5 rounded-xl py-2">
          📝 {lastEvent.description}
        </div>
      )}

      {/* SCOREBOARD */}
      <div className="flex-1 flex flex-col gap-4">
        {/* EQUIPO LOCAL */}
        <div className="glass-panel rounded-[2rem] p-5 flex flex-col items-center justify-between border-t-8 border-t-team-a relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-team-a/10 to-transparent pointer-events-none"></div>
          <div className="flex items-center gap-3 w-full justify-center">
            <span className="text-4xl">{EQUIPOS.local.logo}</span>
            <h2 className="text-2xl font-black tracking-widest uppercase">{EQUIPOS.local.nombre}</h2>
          </div>
          <span className="text-[7rem] leading-[1.1] font-black tracking-tighter tabular-nums drop-shadow-2xl text-team-a">
            {localScore}
          </span>
          <div className="grid grid-cols-3 gap-2 w-full z-10">
            <button onClick={() => handleScoreIntent("local", 6, "Touchdown")} className="col-span-1 bg-team-a text-white shadow-xl shadow-team-a/30 font-black rounded-2xl animate-pop text-2xl h-16">+6</button>
            <button onClick={() => handleScoreIntent("local", 1, "Punto Extra")} className="col-span-1 bg-team-a/20 text-team-a font-black rounded-2xl animate-pop text-xl h-16">+1</button>
            <button onClick={() => handleScoreIntent("local", 2, "Conversión")} className="col-span-1 bg-team-a/20 text-team-a font-black rounded-2xl animate-pop text-xl h-16">+2</button>
          </div>
        </div>

        {/* EQUIPO VISITANTE */}
        <div className="glass-panel rounded-[2rem] p-5 flex flex-col items-center justify-between border-t-8 border-t-team-b relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-team-b/10 to-transparent pointer-events-none"></div>
          <div className="flex items-center gap-3 w-full justify-center">
            <span className="text-4xl">{EQUIPOS.visitor.logo}</span>
            <h2 className="text-2xl font-black tracking-widest uppercase">{EQUIPOS.visitor.nombre}</h2>
          </div>
          <span className="text-[7rem] leading-[1.1] font-black tracking-tighter tabular-nums drop-shadow-2xl text-team-b">
            {visitorScore}
          </span>
          <div className="grid grid-cols-3 gap-2 w-full z-10">
            <button onClick={() => handleScoreIntent("visitor", 6, "Touchdown")} className="col-span-1 bg-team-b text-white shadow-xl shadow-team-b/30 font-black rounded-2xl animate-pop text-2xl h-16">+6</button>
            <button onClick={() => handleScoreIntent("visitor", 1, "Punto Extra")} className="col-span-1 bg-team-b/20 text-team-b font-black rounded-2xl animate-pop text-xl h-16">+1</button>
            <button onClick={() => handleScoreIntent("visitor", 2, "Conversión")} className="col-span-1 bg-team-b/20 text-team-b font-black rounded-2xl animate-pop text-xl h-16">+2</button>
          </div>
        </div>
      </div>

      {/* ACCIONES INFERIORES */}
      <div className="grid grid-cols-3 gap-3 mt-2 pb-6">
        <button onClick={handleSackIntent} className="glass-panel rounded-2xl py-4 flex items-center justify-center font-bold opacity-80 animate-pop border-b-4 border-b-red-500 shadow-md text-sm text-center">
          🛡️ Sack/<br/>Pick
        </button>
        <button onClick={handleFlagIntent} className="glass-panel rounded-2xl py-4 flex flex-col items-center justify-center font-black animate-pop border-b-4 border-b-yellow-400 bg-yellow-500/10 shadow-lg text-lg text-yellow-600 dark:text-yellow-400">
          🟨 FLAG
        </button>
        <button onClick={handleUndo} disabled={events.length === 0} className="glass-panel rounded-2xl py-4 flex items-center justify-center font-bold opacity-70 animate-pop border border-foreground/10 text-sm disabled:opacity-30">
          ↩️ Undo
        </button>
      </div>

      {/* MODAL MULTIPASO */}
      {modalOpen && flow && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in slide-in-from-bottom-10">
          <div className="w-full max-w-md bg-background rounded-[2rem] p-6 shadow-2xl flex flex-col gap-6 relative border border-foreground/10">
            
            <div className="flex justify-between items-center border-b border-foreground/10 pb-4">
              <div>
                <h3 className="text-2xl font-black">{flow.actionName} {flow.playType && `(${flow.playType})`}</h3>
                <p className="text-foreground/60 font-medium">
                  {flow.step === "select_type" && "¿Cómo fue la anotación?"}
                  {flow.step === "select_qb" && "Selecciona al QB (Pase)"}
                  {flow.step === "select_receiver" && "Selecciona al RECEPTOR"}
                  {flow.step === "select_runner" && "Selecciona al CORREDOR"}
                  {flow.step === "select_defender" && "Selecciona al DEFENSIVO"}
                  {flow.step === "select_player" && "¿Quién anotó?"}
                  {flow.step === "select_flag_type" && "¿Qué tipo de castigo?"}
                  {flow.step === "select_flag_team" && "¿Qué equipo cometió la falta?"}
                  {flow.step === "select_flag_player" && "¿Qué jugador fue?"}
                  {flow.step === "select_defplay_type" && "¿Sack o Intercepción?"}
                  {flow.step === "select_defplay_team" && "¿Qué equipo hizo la jugada?"}
                  {flow.step === "select_defplay_player" && "¿Qué jugador la hizo?"}
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-3 bg-foreground/5 rounded-full font-bold">X</button>
            </div>
            
            {/* PANTALLA 1: Tipo de Touchdown */}
            {flow.step === "select_type" && (
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => setFlow({ ...flow, step: "select_qb", playType: "Pase" })} className="p-5 rounded-2xl border-2 border-foreground/10 font-black text-xl hover:bg-foreground/5 animate-pop">
                  🏈 PASE
                </button>
                <button onClick={() => setFlow({ ...flow, step: "select_runner", playType: "Carrera" })} className="p-5 rounded-2xl border-2 border-foreground/10 font-black text-xl hover:bg-foreground/5 animate-pop">
                  🏃 CARRERA
                </button>
                <button onClick={() => setFlow({ ...flow, step: "select_defender", playType: "Pick Six" })} className="p-5 rounded-2xl border-2 border-red-500/30 text-red-500 font-black text-xl hover:bg-red-500/10 animate-pop">
                  🛡️ PICK SIX (INT)
                </button>
              </div>
            )}

            {/* PANTALLA TIPO DE FLAG */}
            {flow.step === "select_flag_type" && (
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleSelect("Foul Personal")} className="p-5 rounded-2xl border-2 border-yellow-500/30 font-black text-xl hover:bg-yellow-500/10 animate-pop text-yellow-600 dark:text-yellow-400">
                  ⚠️ Foul Personal
                </button>
                <button onClick={() => handleSelect("Conducta Antideportiva")} className="p-5 rounded-2xl border-2 border-orange-500/30 font-black text-xl hover:bg-orange-500/10 animate-pop text-orange-600 dark:text-orange-400">
                  🤬 Conducta Antideportiva
                </button>
              </div>
            )}

            {/* PANTALLA TIPO DE JUGADA DEFENSIVA */}
            {flow.step === "select_defplay_type" && (
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleSelect("Sack")} className="p-5 rounded-2xl border-2 border-red-500/30 font-black text-xl hover:bg-red-500/10 animate-pop text-red-600 dark:text-red-400">
                  🛡️ SACK
                </button>
                <button onClick={() => handleSelect("Intercepción")} className="p-5 rounded-2xl border-2 border-red-500/30 font-black text-xl hover:bg-red-500/10 animate-pop text-red-600 dark:text-red-400">
                  🎯 INTERCEPCIÓN
                </button>
              </div>
            )}

            {/* PANTALLA EQUIPO FLAG / JUGADA DEFENSIVA */}
            {(flow.step === "select_flag_team" || flow.step === "select_defplay_team") && (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleSelect("local")} className="p-6 rounded-2xl border-4 border-team-a/30 font-black text-xl animate-pop text-team-a flex flex-col items-center gap-2">
                  <span className="text-4xl">{EQUIPOS.local.logo}</span>
                  {EQUIPOS.local.nombre}
                </button>
                <button onClick={() => handleSelect("visitor")} className="p-6 rounded-2xl border-4 border-team-b/30 font-black text-xl animate-pop text-team-b flex flex-col items-center gap-2">
                  <span className="text-4xl">{EQUIPOS.visitor.logo}</span>
                  {EQUIPOS.visitor.nombre}
                </button>
              </div>
            )}

            {/* PANTALLA SELECTOR DE JUGADORES */}
            {["select_qb", "select_receiver", "select_runner", "select_defender", "select_player", "select_flag_player", "select_defplay_player"].includes(flow.step) && (
              <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[45vh] pr-2">
                {EQUIPOS[flow.team!].roster.map((jugador) => (
                  <button 
                    key={jugador.id}
                    onClick={() => handleSelect(jugador)}
                    className={`flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 hover:bg-foreground/5 active:scale-95 transition-transform ${flow.team === 'local' ? 'border-team-a/30' : 'border-team-b/30'}`}
                  >
                    <span className={`text-4xl font-black ${flow.team === 'local' ? 'text-team-a' : 'text-team-b'}`}>
                      #{jugador.jersey}
                    </span>
                    <span className="text-sm font-bold truncate w-full text-center">{jugador.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
