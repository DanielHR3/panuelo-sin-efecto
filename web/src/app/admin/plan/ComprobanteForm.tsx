"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BOTON_SECUNDARIO, ETIQUETA, INPUT } from "../_components/estilos";

/** Sube la foto o el PDF del comprobante de transferencia (máx. 2 MB). */
export function ComprobanteForm({ pagoId, yaSubido }: { pagoId: string; yaSubido: string | null }) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"listo" | "subiendo" | "ok">("listo");
  const [error, setError] = useState<string | null>(null);

  const subir = async (e: FormEvent) => {
    e.preventDefault();
    if (!archivo) return;
    setError(null);
    setEstado("subiendo");
    const datos = new FormData();
    datos.append("archivo", archivo);
    try {
      const res = await fetch(`/api/pagos/${pagoId}/comprobante`, { method: "POST", body: datos });
      if (!res.ok) {
        const cuerpo = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        setError(
          res.status === 413
            ? "El archivo pesa más de 2 MB"
            : Array.isArray(cuerpo.message)
              ? cuerpo.message.join(", ")
              : (cuerpo.message ?? "No se pudo subir el comprobante"),
        );
        setEstado("listo");
        return;
      }
      setEstado("ok");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
      setEstado("listo");
    }
  };

  return (
    <form onSubmit={subir} className="flex flex-col gap-3">
      <label className={ETIQUETA}>
        {yaSubido ? `Comprobante enviado (${yaSubido}). ¿Quieres reemplazarlo?` : "Sube tu comprobante (foto o PDF, máx. 2 MB)"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={(e) => {
            setArchivo(e.target.files?.[0] ?? null);
            setEstado("listo");
          }}
          className={`${INPUT} file:mr-3 file:rounded-md file:border-0 file:bg-panel-alterno file:px-3 file:py-2 file:font-semibold`}
        />
      </label>
      <button type="submit" disabled={!archivo || estado === "subiendo"} className={`${BOTON_SECUNDARIO} px-5 py-3 min-h-12`}>
        {estado === "subiendo" ? "Subiendo…" : estado === "ok" ? "Comprobante enviado" : "Enviar comprobante"}
      </button>
      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {error}
        </p>
      )}
    </form>
  );
}
