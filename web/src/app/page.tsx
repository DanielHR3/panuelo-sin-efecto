"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [localScore, setLocalScore] = useState(0);
  const [visitorScore, setVisitorScore] = useState(0);
  const [isDark, setIsDark] = useState(true);

  // Persistir la preferencia de tema
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Haptic Feedback API
  const vibrate = () => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50); 
    }
  };

  const handleScore = (team: "local" | "visitor", points: number) => {
    vibrate();
    if (team === "local") setLocalScore((prev) => Math.max(0, prev + points));
    else setVisitorScore((prev) => Math.max(0, prev + points));
  };

  return (
    <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full gap-6 select-none relative h-[100dvh] pt-10">
      
      {/* HEADER: Estado del Partido y Tema */}
      <header className="flex justify-between items-center glass-panel rounded-2xl p-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-widest text-team-a opacity-80">Periodo 1</span>
          <h1 className="font-bold text-xl tracking-tight">EN JUEGO 🏈</h1>
        </div>
        <button 
          onClick={() => { vibrate(); setIsDark(!isDark); }}
          className="p-3 rounded-full bg-background border border-foreground/10 shadow-sm animate-pop"
        >
          {isDark ? "☀️ Claro" : "🌙 Oscuro"}
        </button>
      </header>

      {/* SCOREBOARD (MVP: Elementos gigantes para visibilidad a la luz del sol) */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-[400px]">
        {/* EQUIPO LOCAL */}
        <div className="glass-panel rounded-[2rem] p-4 flex flex-col items-center justify-between border-t-4 border-t-team-a relative overflow-hidden shadow-lg shadow-team-a/10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-team-a/10 to-transparent pointer-events-none"></div>
          
          <h2 className="text-xl font-bold mt-2 tracking-wide uppercase opacity-70">Local</h2>
          
          <span className="text-[7rem] leading-none font-black tracking-tighter tabular-nums drop-shadow-xl text-team-a">
            {localScore}
          </span>
          
          {/* Controles de puntos */}
          <div className="grid grid-cols-2 gap-2 w-full mt-4 z-10">
            <button onClick={() => handleScore("local", 6)} className="bg-team-a text-white shadow-lg font-bold py-4 rounded-xl animate-pop text-xl">+6</button>
            <div className="grid grid-rows-2 gap-2">
              <button onClick={() => handleScore("local", 1)} className="bg-team-a/20 text-team-a font-bold rounded-lg animate-pop text-lg">+1</button>
              <button onClick={() => handleScore("local", 2)} className="bg-team-a/20 text-team-a font-bold rounded-lg animate-pop text-lg">+2</button>
            </div>
            <button onClick={() => handleScore("local", -1)} className="col-span-2 bg-foreground/5 font-bold py-3 rounded-xl animate-pop text-sm opacity-70 border border-foreground/10">Deshacer</button>
          </div>
        </div>

        {/* EQUIPO VISITANTE */}
        <div className="glass-panel rounded-[2rem] p-4 flex flex-col items-center justify-between border-t-4 border-t-team-b relative overflow-hidden shadow-lg shadow-team-b/10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-team-b/10 to-transparent pointer-events-none"></div>
          
          <h2 className="text-xl font-bold mt-2 tracking-wide uppercase opacity-70">Visita</h2>
          
          <span className="text-[7rem] leading-none font-black tracking-tighter tabular-nums drop-shadow-xl text-team-b">
            {visitorScore}
          </span>
          
          {/* Controles de puntos */}
          <div className="grid grid-cols-2 gap-2 w-full mt-4 z-10">
            <button onClick={() => handleScore("visitor", 6)} className="bg-team-b text-white shadow-lg font-bold py-4 rounded-xl animate-pop text-xl">+6</button>
            <div className="grid grid-rows-2 gap-2">
              <button onClick={() => handleScore("visitor", 1)} className="bg-team-b/20 text-team-b font-bold rounded-lg animate-pop text-lg">+1</button>
              <button onClick={() => handleScore("visitor", 2)} className="bg-team-b/20 text-team-b font-bold rounded-lg animate-pop text-lg">+2</button>
            </div>
            <button onClick={() => handleScore("visitor", -1)} className="col-span-2 bg-foreground/5 font-bold py-3 rounded-xl animate-pop text-sm opacity-70 border border-foreground/10">Deshacer</button>
          </div>
        </div>
      </div>

      {/* ACCIONES INFERIORES */}
      <div className="grid grid-cols-2 gap-4 pb-6 mt-4">
        <button onClick={vibrate} className="glass-panel rounded-2xl py-5 flex items-center justify-center gap-2 font-bold opacity-90 animate-pop border-b-4 border-b-yellow-400 text-lg">
          🟨 Pañuelo
        </button>
        <button onClick={vibrate} className="glass-panel rounded-2xl py-5 flex items-center justify-center gap-2 font-bold opacity-90 animate-pop text-lg border border-foreground/10">
          🔒 Bloquear
        </button>
      </div>
    </main>
  );
}
