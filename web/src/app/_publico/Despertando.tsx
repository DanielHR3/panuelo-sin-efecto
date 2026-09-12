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
      className="rounded-2xl border border-foreground/10 p-6 flex flex-col gap-2 max-w-md"
    >
      <p className="font-bold text-lg">Despertando el marcador…</p>
      <p className="text-sm opacity-70">
        El servidor estaba dormido. Suele tardar menos de un minuto; esta página se
        actualiza sola{intentos > 0 ? ` (intento ${intentos + 1})` : ""}.
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="self-start mt-1 px-4 py-2 rounded-xl bg-foreground/10 text-sm font-semibold"
      >
        Reintentar ahora
      </button>
    </section>
  );
}
