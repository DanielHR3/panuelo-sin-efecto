"use client";

import { useEffect, useRef, useState } from "react";
import { Icono } from "@/components/icons/Icono";
import { API_URL } from "@/lib/api";
import { esperarServidor, reintentoRecienteFallido, type ControlEspera } from "./esperar-servidor";

const CADA_MS = 5_000;
const TIMEOUT_MS = 60_000;
const LIMITE_MS = 180_000;

// Cuándo se reintentó la página por última vez tras ver la API arriba. Vive
// fuera del componente porque el boundary lo desmonta y lo vuelve a montar
// si la página falla de nuevo.
let ultimoReintento: number | null = null;

const BOTON =
  "boton-panuelo min-h-12 px-5 py-3 transition-transform active:scale-95 inline-flex items-center justify-center gap-2";

/**
 * Pantalla de error de los boundaries (`error.tsx`). La API (Render free) se
 * duerme y tarda ~50 s en despertar; los Server Components que la consultan
 * en ese lapso fallan. En producción el mensaje del error va oculto, así que
 * ante cualquier error se espera a la API: si responde enseguida y la página
 * vuelve a fallar, el error era real y se muestra con "Reintentar".
 */
export function ServidorDespertando({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [fase, setFase] = useState<"esperando" | "agotado">(() =>
    reintentoRecienteFallido(Date.now(), ultimoReintento) ? "agotado" : "esperando",
  );
  const [intento, setIntento] = useState(0);
  const control = useRef<ControlEspera | null>(null);
  const retryRef = useRef(retry);

  useEffect(() => {
    retryRef.current = retry;
  }, [retry]);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    if (fase !== "esperando") return;
    const c = esperarServidor({
      url: `${API_URL}/`,
      cadaMs: CADA_MS,
      timeoutMs: TIMEOUT_MS,
      limiteMs: LIMITE_MS,
      onIntento: setIntento,
      onListo: () => {
        ultimoReintento = Date.now();
        // retry() = router.refresh() + reset() del boundary (Next 16.3).
        retryRef.current();
      },
      onAgotado: () => setFase("agotado"),
    });
    control.current = c;
    return () => {
      c.cancelar();
      control.current = null;
    };
  }, [fase]);

  if (fase === "agotado") {
    return (
      <section
        role="alert"
        className="panel w-full max-w-md mx-auto flex flex-col items-center gap-4 px-6 py-12 text-center"
      >
        <Icono nombre="alerta" className="text-5xl text-panuelo-texto" />
        <h2 className="titulo-estadio text-3xl leading-none">Algo salió mal</h2>
        <p className="text-suave">No se pudo cargar esta página. Inténtalo de nuevo en un momento.</p>
        {/* En producción el mensaje es genérico ("Minified React error…"):
            el digest sirve para buscar el error en los logs del servidor. */}
        {(error.digest || error.message) && (
          <p className="text-xs text-suave break-words">
            {error.digest ? `Código: ${error.digest}` : error.message}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            // Manual: si vuelve a fallar se espera otra vez a la API.
            ultimoReintento = null;
            retry();
          }}
          className={BOTON}
        >
          <Icono nombre="recargar" className="text-lg" />
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <section
      role="status"
      aria-live="polite"
      className="panel w-full max-w-md mx-auto flex flex-col items-center gap-4 px-6 py-12 text-center"
    >
      <Icono nombre="sin-senal" className="text-5xl text-panuelo-texto animate-pulse" />
      <h2 className="titulo-estadio text-3xl leading-none">Despertando el servidor…</h2>
      <p className="text-suave">
        El servidor estaba dormido. Suele tardar menos de un minuto; esta página se
        actualiza sola.
      </p>
      {intento > 0 && (
        <p className="text-sm text-suave font-display font-bold uppercase tracking-[0.06em]">
          Intento {intento}
        </p>
      )}
      <button
        type="button"
        onClick={() => control.current?.reintentarAhora()}
        className={BOTON}
      >
        <Icono nombre="recargar" className="text-lg" />
        Reintentar ahora
      </button>
    </section>
  );
}
