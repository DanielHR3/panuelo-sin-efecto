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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-panel rounded-[10px] p-6 shadow-2xl flex flex-col gap-5 border border-texto/15 border-t-4 border-t-panuelo outline-none"
      >
        <div className="flex flex-col gap-1">
          <h3 className="titulo-estadio text-2xl leading-tight">{titulo}</h3>
          {detalle && <p className="text-sm font-semibold text-suave">{detalle}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="h-16 rounded-lg bg-panel-alterno border border-texto/15 font-bold text-lg active:scale-95 transition-transform"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="boton-panuelo h-16 text-xl shadow-lg active:scale-95 transition-transform"
          >
            {confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}
