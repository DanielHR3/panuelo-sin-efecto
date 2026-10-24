"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BOTON_PELIGRO, BOTON_PRIMARIO, ETIQUETA, INPUT } from "../_components/estilos";

/** Subir (PDF, máx. 10 MB) o quitar el reglamento propio de una liga. */
export function ReglamentoForm({ ligaId, tienePropio }: { ligaId: string; tienePropio: boolean }) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const enviar = async (metodo: "PUT" | "DELETE") => {
    setMensaje(null);
    setOcupado(true);
    let body: FormData | undefined;
    if (metodo === "PUT") {
      if (!archivo) return setOcupado(false);
      body = new FormData();
      body.append("archivo", archivo);
    }
    try {
      const res = await fetch(`/api/reglamento/${ligaId}`, { method: metodo, body });
      if (!res.ok) {
        const c = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        setMensaje({
          tipo: "error",
          texto:
            res.status === 413
              ? "El PDF pesa más de 10 MB"
              : Array.isArray(c.message)
                ? c.message.join(", ")
                : (c.message ?? "No se pudo guardar"),
        });
        return;
      }
      setMensaje({ tipo: "ok", texto: metodo === "PUT" ? "Reglamento guardado" : "Volviste al reglamento IFAF" });
      setArchivo(null);
      router.refresh();
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo conectar con el servidor" });
    } finally {
      setOcupado(false);
    }
  };

  const subir = (e: FormEvent) => {
    e.preventDefault();
    void enviar("PUT");
  };

  return (
    <form onSubmit={subir} className="flex flex-col gap-3">
      <label className={ETIQUETA}>
        {tienePropio ? "Reemplazar por otro PDF" : "Subir mi reglamento (PDF, máx. 10 MB)"}
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className={`${INPUT} file:mr-3 file:rounded-md file:border-0 file:bg-panel-alterno file:px-3 file:py-2 file:font-semibold`}
        />
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="submit" disabled={!archivo || ocupado} className={`${BOTON_PRIMARIO} min-h-12 sm:flex-1`}>
          {ocupado ? "Guardando…" : "Guardar reglamento"}
        </button>
        {tienePropio && (
          <button type="button" disabled={ocupado} onClick={() => void enviar("DELETE")} className={`${BOTON_PELIGRO} px-5 py-3 min-h-12 sm:flex-1`}>
            Volver al de IFAF
          </button>
        )}
      </div>
      {mensaje && (
        <p role={mensaje.tipo === "error" ? "alert" : "status"} className={`text-sm font-semibold ${mensaje.tipo === "error" ? "text-peligro" : ""}`}>
          {mensaje.texto}
        </p>
      )}
    </form>
  );
}
