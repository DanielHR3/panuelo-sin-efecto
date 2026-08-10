"use client";

import { useState, useEffect } from "react";

// Mocks de datos traídos del Backend (para el MVP visual)
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

export default function Home() {
  const [localScore, setLocalScore] = useState(0);
  const [visitorScore, setVisitorScore] = useState(0);
  const [isDark, setIsDark] = useState(true);

  // Estado del Modal de Jugadores
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<{ team: "local" | "visitor"; points: number; actionName: string } | null>(null);

  // Último evento (para retroalimentación)
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
      // Abrir modal para asignar jugador
      setModalContext({ team, points, actionName });
      setModalOpen(true);
    } else {
      // Undo inmediato
      if (team === "local") setLocalScore((prev) => Math.max(0, prev + points));
      else setVisitorScore((prev) => Math.max(0, prev + points));
      setLastEvent("Deshizo la última acción");
    }
  };

  const confirmScore = (jugador: typeof EQUIPOS.local.roster[0]) => {
    vibrate([50, 50, 50]); // Vibración de éxito
    if (!modalContext) return;

    if (modalContext.team === "local") setLocalScore((prev) => prev + modalContext.points);
    else setVisitorScore((prev) => prev + modalContext.points);

    setLastEvent(`${modalContext.actionName} - #${jugador.jersey} ${jugador.nombre}`);
    setModalOpen(false);
    setModalContext(null);
  };

  return (
    <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full gap-4 select-none relative h-[100dvh]">
      
      {/* HEADER: Estado y Tema */}
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

      {/* HISTORIAL RÁPIDO */}
      {lastEvent && (
        <div className="text-center text-sm font-semibold text-foreground/70 animate-pulse">
          Último evento: {lastEvent}
        </div>
      )}

      {/* SCOREBOARD GIGANTE */}
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
        <button onClick={() => handleScoreIntent("local", -1, "Undo")} className="glass-panel rounded-2xl py-4 flex items-center justify-center font-bold opacity-70 animate-pop border border-foreground/10 text-sm">
          ↩️ Deshacer
        </button>
        <button onClick={() => vibrate(100)} className="glass-panel rounded-2xl py-4 flex flex-col items-center justify-center font-black animate-pop border-b-4 border-b-yellow-500 shadow-lg text-lg">
          🟨 FALTA
        </button>
        <button onClick={() => vibrate(100)} className="glass-panel rounded-2xl py-4 flex items-center justify-center font-bold opacity-70 animate-pop border border-foreground/10 text-sm">
          🔒 Bloquear
        </button>
      </div>

      {/* MODAL DEL ROSTER (Selector de Jugador) */}
      {modalOpen && modalContext && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in slide-in-from-bottom-10">
          <div className="w-full max-w-md bg-background rounded-[2rem] p-6 shadow-2xl flex flex-col gap-6 relative border border-foreground/10">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">{modalContext.actionName} (+{modalContext.points})</h3>
                <p className="text-foreground/60 font-medium">¿Qué jugador anotó?</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-3 bg-foreground/5 rounded-full font-bold">X</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[50vh] pr-2">
              {EQUIPOS[modalContext.team].roster.map((jugador) => (
                <button 
                  key={jugador.id}
                  onClick={() => confirmScore(jugador)}
                  className={`flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 hover:bg-foreground/5 active:scale-95 transition-transform ${modalContext.team === 'local' ? 'border-team-a/30' : 'border-team-b/30'}`}
                >
                  <span className={`text-4xl font-black ${modalContext.team === 'local' ? 'text-team-a' : 'text-team-b'}`}>
                    #{jugador.jersey}
                  </span>
                  <span className="text-sm font-bold truncate w-full text-center">{jugador.nombre}</span>
                </button>
              ))}
            </div>
            
            <button onClick={() => setModalOpen(false)} className="w-full py-4 font-bold text-foreground/60">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
