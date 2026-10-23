"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CADA_MS = 15_000;

/**
 * La API corre en un plan gratuito que se duerme tras 15 min sin tráfico y
 * tarda cerca de un minuto en despertar. En vez de mostrar un error, la
 * landing avisa y vuelve a pedir los datos sola cada 15 s.
 */
export function Despertando() {
  const router = useRouter();
  const [intentos, setIntentos] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIntentos((n) => n + 1);
      router.refresh();
    }, CADA_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <section
      role="status"
      className="panel p-6 flex flex-col gap-2 max-w-md"
    >
      <p className="titulo-estadio text-2xl">Despertando el marcador…</p>
      <p className="text-sm text-suave">
        El servidor estaba dormido. Suele tardar menos de un minuto; esta página se
        actualiza sola{intentos > 0 ? ` (intento ${intentos + 1})` : ""}.
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="self-start mt-1 px-4 py-2 rounded-lg bg-panel-alterno border border-texto/15 text-sm font-display font-bold uppercase tracking-[0.06em]"
      >
        Reintentar ahora
      </button>
    </section>
  );
}
