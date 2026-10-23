import Link from "next/link";
import { Icono } from "@/components/icons/Icono";

/**
 * 403 en /partido/[id]: la sesión es válida pero este usuario no arbitra el
 * partido ni es dueño de su liga. Se le ofrecen sus partidos y el resultado
 * público (que sí puede ver cualquiera).
 */
export function NoAsignado({ partidoId }: { partidoId: string }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-md mx-auto">
      <div className="panel p-8 w-full flex flex-col items-center text-center gap-3 border-t-4 border-t-panuelo">
        <Icono nombre="falta" className="text-5xl text-panuelo-texto" />
        <h1 className="titulo-estadio text-3xl leading-tight">No estás asignado a este partido</h1>
        <p className="text-sm text-suave">
          Solo el árbitro asignado o quien administra la liga puede abrir su marcador. Si
          crees que es un error, pide al administrador de tu liga que te asigne.
        </p>
        <div className="flex flex-col gap-3 w-full mt-3">
          <Link
            href="/mis-partidos"
            className="boton-panuelo p-4 text-lg active:scale-[0.98] transition-transform"
          >
            Ir a mis partidos
          </Link>
          <Link
            href={`/resultado/${partidoId}`}
            className="rounded-lg p-4 border border-texto/15 bg-panel-alterno font-semibold active:scale-[0.98] transition-transform"
          >
            Ver el resultado público
          </Link>
        </div>
      </div>
    </main>
  );
}
