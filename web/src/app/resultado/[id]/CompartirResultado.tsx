"use client";

import { useState, useSyncExternalStore } from "react";
import { textoCompartir } from "@/lib/compartir";
import type { ResumenPartido } from "@/lib/types";

const sinSuscripcion = () => () => {};

/**
 * HU-2.7 fase 2: "Compartir" abre la hoja nativa (WhatsApp, etc.) con el
 * texto del resultado y el enlace. Donde no hay Web Share (escritorio),
 * copia el texto al portapapeles. La URL se lee del navegador al momento
 * de compartir para que funcione igual en local, preview y producción.
 */
export function CompartirResultado({ resumen }: { resumen: ResumenPartido }) {
  // En el servidor no existe navigator: se asume "sin Web Share" y el
  // cliente corrige al hidratar sin disparar un setState en un efecto.
  const puedeCompartir = useSyncExternalStore(
    sinSuscripcion,
    () => typeof navigator.share === "function",
    () => false,
  );
  const [aviso, setAviso] = useState<string | null>(null);

  const texto = () => textoCompartir(resumen, window.location.href);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto());
      setAviso("Copiado. Pégalo en WhatsApp o donde quieras.");
    } catch {
      setAviso("No se pudo copiar. Toma una captura de pantalla y envíala.");
    }
  };

  const compartir = async () => {
    setAviso(null);
    try {
      await navigator.share({ title: "Resultado del partido", text: texto() });
    } catch (e) {
      // Cancelar la hoja de compartir no es un error.
      if (e instanceof Error && e.name === "AbortError") return;
      await copiar();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void (puedeCompartir ? compartir() : copiar())}
          className="px-5 py-3 rounded-xl bg-panuelo text-[#1a1600] font-black shadow-lg active:scale-95 transition-transform"
        >
          {puedeCompartir ? "Compartir resultado" : "Copiar resultado"}
        </button>
        {puedeCompartir && (
          <button
            type="button"
            onClick={() => void copiar()}
            className="px-4 py-3 rounded-xl bg-foreground/10 font-semibold"
          >
            Copiar texto
          </button>
        )}
      </div>
      {aviso && (
        <p role="status" className="text-sm opacity-80">
          {aviso}
        </p>
      )}
    </div>
  );
}
