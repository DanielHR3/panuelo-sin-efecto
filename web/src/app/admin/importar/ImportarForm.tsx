"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icono } from "@/components/icons/Icono";
import { lineasResumen, type ResultadoImportacion } from "@/lib/importacion";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, ETIQUETA, INPUT, ROTULO } from "../_components/estilos";

type Fase = "elegir" | "revisando" | "vista" | "importando" | "listo";

export function ImportarForm({ ligas }: { ligas: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [ligaId, setLigaId] = useState(ligas[0]?.id ?? "");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fase, setFase] = useState<Fase>("elegir");
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultadoRef = useRef<HTMLElement>(null);

  // En el celular el resultado queda bajo el botón: se lleva a la vista.
  useEffect(() => {
    if (resultado) resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultado]);

  const enviar = async (confirmar: boolean) => {
    if (!archivo) return;
    setError(null);
    setFase(confirmar ? "importando" : "revisando");
    const datos = new FormData();
    datos.append("archivo", archivo);
    try {
      const res = await fetch(`/api/importar/${ligaId}${confirmar ? "?confirmar=true" : ""}`, {
        method: "POST",
        body: datos,
      });
      const cuerpo = (await res.json()) as ResultadoImportacion & { message?: string | string[] };
      if (!res.ok) {
        setError(Array.isArray(cuerpo.message) ? cuerpo.message.join(", ") : (cuerpo.message ?? "No se pudo leer el archivo"));
        setFase("elegir");
        return;
      }
      setResultado(cuerpo);
      setFase(cuerpo.aplicado ? "listo" : "vista");
      if (cuerpo.aplicado) router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
      setFase("elegir");
    }
  };

  const revisar = (e: FormEvent) => {
    e.preventDefault();
    void enviar(false);
  };

  const lineas = resultado ? lineasResumen(resultado.resumen) : [];
  const sinCambios = resultado !== null && lineas.length === 0;

  return (
    <div className="space-y-6">
      <section className="panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <p className="font-semibold">1. Descarga la plantilla</p>
          <p className="text-sm text-suave">Trae las hojas Equipos, Jugadores y Calendario, con instrucciones y un ejemplo.</p>
        </div>
        <a href="/api/importar/plantilla" download className={`${BOTON_SECUNDARIO} px-5 py-3 min-h-12 inline-flex items-center justify-center gap-2 shrink-0`}>
          <Icono nombre="tabla" />
          Descargar plantilla
        </a>
      </section>

      <form onSubmit={revisar} className="panel p-4 sm:p-5 flex flex-col gap-4">
        <p className="font-semibold">2. Sube tu archivo</p>
        {ligas.length > 1 && (
          <label className={ETIQUETA}>
            Liga
            <select
              value={ligaId}
              onChange={(e) => {
                setLigaId(e.target.value);
                setResultado(null);
                setFase("elegir");
              }}
              className={INPUT}
            >
              {ligas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={ETIQUETA}>
          Archivo de Excel (.xlsx, máx. 2 MB)
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              setResultado(null);
              setFase("elegir");
            }}
            className={`${INPUT} file:mr-3 file:rounded-md file:border-0 file:bg-panel-alterno file:px-3 file:py-2 file:font-semibold`}
          />
          <span className="text-xs font-normal text-suave">¿Usas Google Sheets? Archivo → Descargar → Microsoft Excel (.xlsx).</span>
        </label>
        <button type="submit" disabled={!archivo || fase === "revisando"} className={`${BOTON_PRIMARIO} min-h-12`}>
          {fase === "revisando" ? "Revisando…" : "Revisar archivo"}
        </button>
        {error && (
          <p role="alert" className="text-sm font-semibold text-peligro">
            {error}
          </p>
        )}
      </form>

      {resultado && (
        <section ref={resultadoRef} aria-live="polite" className="panel p-4 sm:p-5 flex flex-col gap-4 scroll-mt-20">
          {fase === "listo" ? (
            <>
              <p className="titulo-estadio text-2xl leading-none">Listo, tu liga quedó cargada</p>
              <ul className="text-sm list-disc pl-5">
                {lineas.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/admin/equipos" className={`${BOTON_PRIMARIO} min-h-12 text-center`}>
                  Ver equipos
                </Link>
                <Link href="/admin/partidos" className={`${BOTON_SECUNDARIO} px-5 py-3 min-h-12 text-center`}>
                  Ver partidos
                </Link>
              </div>
            </>
          ) : resultado.errores.length > 0 ? (
            <>
              <p className="titulo-estadio text-2xl leading-none text-peligro">
                Corrige {resultado.errores.length === 1 ? "1 fila" : `${resultado.errores.length} filas`} y vuelve a subirlo
              </p>
              <p className="text-sm text-suave">No se guardó nada. Cuando el archivo no tenga errores podrás importarlo.</p>
              <ul className="flex flex-col divide-y divide-texto/10 rounded-lg border border-texto/10">
                {resultado.errores.map((e) => (
                  <li key={`${e.hoja}-${e.fila}-${e.mensaje}`} className="px-3 py-2 text-sm">
                    {e.hoja && (
                      <span className={ROTULO}>
                        {e.hoja} · fila {e.fila}
                      </span>
                    )}
                    <p>{e.mensaje}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : sinCambios ? (
            <p className="font-semibold">El archivo no trae nada nuevo: todo ya estaba cargado.</p>
          ) : (
            <>
              <p className="titulo-estadio text-2xl leading-none">Esto se va a importar</p>
              <ul className="text-sm list-disc pl-5">
                {lineas.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void enviar(true)}
                disabled={fase === "importando"}
                className={`${BOTON_PRIMARIO} min-h-12`}
              >
                {fase === "importando" ? "Importando…" : "Importar"}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
