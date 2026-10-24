"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { accionActualizacion } from "@/lib/actualizacion";

const CADA_MS = 30 * 60 * 1000;

async function versionPublicada(): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { version?: string | null }).version ?? null;
  } catch {
    return null; // sin conexión: se revisa la próxima vez
  }
}

/** Pide al service worker su versión nueva antes de recargar. */
async function recargar() {
  try {
    await (await navigator.serviceWorker?.getRegistration())?.update();
  } catch {
    // sin service worker: recargar basta
  }
  window.location.reload();
}

/**
 * La app instalada en el inicio del celular casi nunca se cierra: se pausa y
 * al volver retoma la versión vieja. Al volver al frente (y cada 30 min) se
 * compara la versión cargada con la publicada; si cambió, se recarga sola o,
 * en el marcador del árbitro, se avisa para no cortar un partido.
 */
export function ActualizacionApp() {
  const ruta = usePathname();
  const [hayNueva, setHayNueva] = useState(false);

  useEffect(() => {
    const revisar = async () => {
      if (document.visibilityState !== "visible") return;
      const accion = accionActualizacion({
        // Fijada al compilar: es la versión del JavaScript que está corriendo.
        actual: process.env.NEXT_PUBLIC_VERSION ?? null,
        publicada: await versionPublicada(),
        ruta: window.location.pathname,
      });
      if (accion === "recargar") void recargar();
      else setHayNueva(accion === "avisar");
    };
    document.addEventListener("visibilitychange", revisar);
    const id = setInterval(revisar, CADA_MS);
    void revisar();
    return () => {
      document.removeEventListener("visibilitychange", revisar);
      clearInterval(id);
    };
  }, [ruta]);

  if (!hayNueva) return null;
  return (
    <div
      role="status"
      className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-md panel p-3 flex items-center justify-between gap-3 shadow-lg"
    >
      <span className="text-sm font-semibold">Hay una versión nueva de la app.</span>
      <button type="button" onClick={() => void recargar()} className="boton-panuelo px-4 py-2 min-h-11 shrink-0">
        Actualizar
      </button>
    </div>
  );
}
