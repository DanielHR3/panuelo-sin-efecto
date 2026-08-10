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
  team?: "local" | "visitor";
  points?: number;
  actionName: string;
  step: "select_type" | "select_qb" | "select_receiver" | "select_runner" | "select_defender" | "select_player" | "select_flag_type" | "select_flag_team" | "select_flag_player";
  playType?: string;
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
      const initialStep = points === 6 ? "select_type" : "select_player";
      setFlow({ team, points, actionName, step: initialStep });
      setModalOpen(true);
    } else {
      if (team === "local") setLocalScore((prev) => Math.max(0, prev + points));
      else setVisitorScore((prev) => Math.max(0, prev + points));
      setLastEvent("Deshizo la última acción");
    }
  };

  const handleFlagIntent = () => {
    vibrate(100);
    setFlow({ actionName: "FLAG", step: "select_flag_type" });
    setModalOpen(true);
  };

  const finalizeAction = (description: string) => {
    vibrate([50, 50, 50]);
    if (!flow) return;

    if (flow.points && flow.team) {
      if (flow.team === "local") setLocalScore((prev) => prev + flow.points!);
      else setVisitorScore((prev) => prev + flow.points!);
    }

    setLastEvent(`${flow.actionName}: ${description}`);
    setModalOpen(false);
    setFlow(null);
  };

  const handleSelect = (data: any) => {
    if (!flow) return;

    // Flujo de Anotaciones
    if (flow.step === "select_qb") {
      setFlow({ ...flow, step: "select_receiver", qb: data });
    } else if (flow.step === "select_receiver") {
      finalizeAction(`Pase de #${flow.qb?.jersey} a #${data.jersey}`);
    } else if (flow.step === "select_runner") {
      finalizeAction(`Carrera de #${data.jersey}`);
    } else if (flow.step === "select_defender") {
      finalizeAction(`Pick Six de #${data.jersey}`);
    } else if (flow.step === "select_player") {
      finalizeAction(`#${data.jersey} ${data.nombre}`);
    } 
    
    // Flujo de Flags
    else if (flow.step === "select_flag_type") {
      setFlow({ ...flow, step: "select_flag_team", playType: data });
    } else if (flow.step === "select_flag_team") {
      setFlow({ ...flow, step: "select_flag_player", team: data });
    } else if (flow.step === "select_flag_player") {
      finalizeAction(`${flow.playType} - ${flow.team === 'local' ? EQUIPOS.local.nombre : EQUIPOS.visitor.nombre} #${data.jersey}`);
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
        <button onClick={() => { vibrate(); setLastEvent("Sack / Intercepción"); }} className="glass-panel rounded-2xl py-4 flex items-center justify-center font-bold opacity-80 animate-pop border-b-4 border-b-red-500 shadow-md text-sm text-center">
          🛡️ Sack/<br/>Pick
        </button>
        <button onClick={handleFlagIntent} className="glass-panel rounded-2xl py-4 flex flex-col items-center justify-center font-black animate-pop border-b-4 border-b-yellow-400 bg-yellow-500/10 shadow-lg text-lg text-yellow-600 dark:text-yellow-400">
          🟨 FLAG
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
                  {flow.step === "select_flag_type" && "¿Qué tipo de castigo?"}
                  {flow.step === "select_flag_team" && "¿Qué equipo cometió la falta?"}
                  {flow.step === "select_flag_player" && "¿Qué jugador fue?"}
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
                <button onClick={() => handleSelect("Holding / Uso Ilegal")} className="p-5 rounded-2xl border-2 border-foreground/10 font-black text-xl hover:bg-foreground/5 animate-pop">
                  👕 Holding / Uso Ilegal
                </button>
                <button onClick={() => handleSelect("Offside / Falso Arranque")} className="p-5 rounded-2xl border-2 border-foreground/10 font-black text-xl hover:bg-foreground/5 animate-pop">
                  🛑 Offside / Falso Arranque
                </button>
              </div>
            )}

            {/* PANTALLA EQUIPO FLAG */}
            {flow.step === "select_flag_team" && (
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
            {["select_qb", "select_receiver", "select_runner", "select_defender", "select_player", "select_flag_player"].includes(flow.step) && (
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
