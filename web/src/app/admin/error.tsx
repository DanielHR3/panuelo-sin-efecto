"use client";

import { Icono } from "@/components/icons/Icono";
import { BOTON_PRIMARIO } from "./_components/estilos";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center py-20 px-6 gap-4 text-center">
      <Icono nombre="alerta" className="text-5xl text-panuelo-texto" />
      <h2 className="titulo-estadio text-3xl leading-none">Algo salió mal</h2>
      <p className="text-suave max-w-md">{error.message}</p>
      <button onClick={reset} className={BOTON_PRIMARIO}>
        Reintentar
      </button>
    </div>
  );
}
