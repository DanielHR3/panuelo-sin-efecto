import Link from "next/link";

/**
 * 403 en /partido/[id]: la sesión es válida pero este usuario no arbitra el
 * partido ni es dueño de su liga. Se le ofrecen sus partidos y el resultado
 * público (que sí puede ver cualquiera).
 */
export function NoAsignado({ partidoId }: { partidoId: string }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-md mx-auto">
      <div className="panel rounded-3xl p-8 w-full flex flex-col items-center text-center gap-3">
        <span className="text-5xl" aria-hidden>
          🚩
        </span>
        <h1 className="font-extrabold text-2xl tracking-tight">No estás asignado a este partido</h1>
        <p className="text-sm opacity-70">
          Solo el árbitro asignado o quien administra la liga puede abrir su marcador. Si
          crees que es un error, pide al administrador de tu liga que te asigne.
        </p>
        <div className="flex flex-col gap-3 w-full mt-3">
          <Link
            href="/mis-partidos"
            className="rounded-2xl p-4 bg-panuelo text-[#1a1600] font-black text-lg active:scale-[0.98] transition-transform"
          >
            Ir a mis partidos
          </Link>
          <Link
            href={`/resultado/${partidoId}`}
            className="rounded-2xl p-4 border border-foreground/15 bg-foreground/5 font-semibold active:scale-[0.98] transition-transform"
          >
            Ver el resultado público
          </Link>
        </div>
      </div>
    </main>
  );
}
