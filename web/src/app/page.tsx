"use client";

import { useState, useEffect } from "react";

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
  team: "local" | "visitor";
  points: number;
  actionName: string; // "Touchdown", "Punto Extra", "Conversión"
  step: "select_type" | "select_qb" | "select_receiver" | "select_runner" | "select_defender" | "select_player";
  playType?: "Pase" | "Carrera" | "Pick Six";
  qb?: Player;
};

export default function Home() {
  const [localScore, setLocalScore] = useState(0);
  const [visitorScore, setVisitorScore] = useState(0);
  const [isDark, setIsDark] = useState(true);

  // Estado del Flujo del Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [flow, setFlow] = useState<ModalFlow | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const vibrate = (pattern: number | number[] = 50) => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const handleScoreIntent = (team: "local" | "visitor", points: number, actionName: string) => {
    vibrate(50);
    if (points > 0) {
      // Si es Touchdown (+6), preguntamos el tipo de jugada. Si no, solo el jugador.
      const initialStep = points === 6 ? "select_type" : "select_player";
      setFlow({ team, points, actionName, step: initialStep });
      setModalOpen(true);
    } else {
      if (team === "local") setLocalScore((prev) => Math.max(0, prev + points));
      else setVisitorScore((prev) => Math.max(0, prev + points));
      setLastEvent("Deshizo la última acción");
    }
  };

  const finalizeScore = (description: string) => {
    vibrate([50, 50, 50]);
    if (!flow) return;

    if (flow.team === "local") setLocalScore((prev) => prev + flow.points);
    else setVisitorScore((prev) => prev + flow.points);

    setLastEvent(`${flow.actionName}: ${description}`);
    setModalOpen(false);
    setFlow(null);
  };

  const handlePlayerSelect = (jugador: Player) => {
    if (!flow) return;

    if (flow.step === "select_qb") {
      setFlow({ ...flow, step: "select_receiver", qb: jugador });
    } else if (flow.step === "select_receiver") {
      finalizeScore(`Pase de #${flow.qb?.jersey} a #${jugador.jersey}`);
    } else if (flow.step === "select_runner") {
      finalizeScore(`Carrera de #${jugador.jersey}`);
    } else if (flow.step === "select_defender") {
      finalizeScore(`Pick Six de #${jugador.jersey}`);
    } else if (flow.step === "select_player") {
      finalizeScore(`#${jugador.jersey} ${jugador.nombre}`);
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
        <button onClick={() => { vibrate(); setIsDark(!isDark); }} className="p-3 rounded-full bg-foreground/5 shadow-sm animate-pop">
          {isDark ? "☀️ Claro" : "🌙 Oscuro"}
        </button>
      </header>

      {lastEvent && (
        <div className="text-center text-sm font-semibold text-foreground/70 animate-pulse bg-foreground/5 rounded-xl py-2">
          📝 {lastEvent}
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
        <button onClick={() => { vibrate(); setLastEvent("Sack registrado"); }} className="glass-panel rounded-2xl py-4 flex items-center justify-center font-bold opacity-80 animate-pop border-b-4 border-b-red-500 shadow-md text-sm text-center">
          🛡️ Sack/<br/>Pick
        </button>
        <button onClick={() => vibrate(100)} className="glass-panel rounded-2xl py-4 flex flex-col items-center justify-center font-black animate-pop border-b-4 border-b-yellow-500 shadow-lg text-lg">
          🟨 FALTA
        </button>
        <button onClick={() => handleScoreIntent("local", -1, "Undo")} className="glass-panel rounded-2xl py-4 flex items-center justify-center font-bold opacity-70 animate-pop border border-foreground/10 text-sm">
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

            {/* PANTALLA 2: Selector de Jugador */}
            {flow.step !== "select_type" && (
              <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[45vh] pr-2">
                {EQUIPOS[flow.team].roster.map((jugador) => (
                  <button 
                    key={jugador.id}
                    onClick={() => handlePlayerSelect(jugador)}
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
