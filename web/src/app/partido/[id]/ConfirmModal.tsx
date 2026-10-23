"use client";

import { useEffect, useRef } from "react";

/**
 * Confirmación de una acción del árbitro con el mismo patrón de hoja
 * inferior que MvpModal (window.confirm bloquea el hilo y no respeta el tema).
 * Tocar fuera, "Cancelar" o Escape cierran sin confirmar.
 */
export function ConfirmModal({
  titulo,
  detalle,
  confirmarTexto,
  onConfirm,
  onCancel,
}: {
  titulo: string;
  detalle?: string;
  confirmarTexto: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-background rounded-[2rem] p-6 shadow-2xl flex flex-col gap-5 border border-foreground/10 outline-none"
      >
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-black">{titulo}</h3>
          {detalle && <p className="text-sm font-semibold text-foreground/60">{detalle}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="h-16 rounded-2xl bg-foreground/5 font-bold text-lg active:scale-95 transition-transform"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="h-16 rounded-2xl bg-panuelo text-[#1a1600] font-black text-lg shadow-lg active:scale-95 transition-transform"
          >
            {confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}
