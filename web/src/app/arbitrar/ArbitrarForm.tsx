"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const INPUT =
  "p-4 rounded-2xl border-2 border-foreground/15 bg-background text-lg font-bold focus:outline-none focus:border-panuelo";

/**
 * HU-2.7: dos nombres y a arbitrar. Sin cuenta, sin contraseña. Si el
 * teléfono ya arbitró antes, el backend agrupa el partido con los
 * anteriores del mismo dispositivo.
 */
export function ArbitrarForm() {
  const router = useRouter();
  const [local, setLocal] = useState("");
  const [visitante, setVisitante] = useState("");
  const [arbitro, setArbitro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (local.trim().toLowerCase() === visitante.trim().toLowerCase()) {
      setError("Los dos equipos necesitan nombres distintos");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/rapido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipoLocal: local, equipoVisitante: visitante, arbitro }),
      });
      const data = (await res.json()) as { partidoId?: string; message?: string };
      if (!res.ok || !data.partidoId) {
        setError(data.message ?? "No se pudo crear el partido");
        return;
      }
      router.push(`/partido/${data.partidoId}`);
      router.refresh();
    } catch {
      setError("Sin conexión con el servidor. Si acaba de despertar, intenta de nuevo en un momento.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Equipo local
        <input
          required
          maxLength={40}
          autoComplete="off"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="Toros"
          className={INPUT}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Equipo visitante
        <input
          required
          maxLength={40}
          autoComplete="off"
          value={visitante}
          onChange={(e) => setVisitante(e.target.value)}
          placeholder="Lobos"
          className={INPUT}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Tu nombre <span className="font-normal opacity-60">(opcional, sale en el resumen)</span>
        <input
          maxLength={40}
          autoComplete="name"
          value={arbitro}
          onChange={(e) => setArbitro(e.target.value)}
          placeholder="Beto"
          className={`${INPUT} text-base font-semibold`}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-2 p-4 rounded-2xl bg-panuelo text-[#1a1600] text-xl font-black shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
      >
        {enviando ? "Preparando el partido…" : "Empezar a arbitrar"}
      </button>
      <p className="text-xs opacity-60">
        Sin registro. El marcador funciona aunque se vaya la señal y se sincroniza solo al volver.
      </p>
    </form>
  );
}
