import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { EquipoConRoster } from "@/lib/types";
import { ActionForm, SubmitButton } from "../../_components/ActionForm";
import { DeleteButton } from "../../_components/DeleteButton";
import { crearJugador, eliminarJugador } from "../actions";

export default async function EquipoRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const equipo = await apiFetch<EquipoConRoster>(`/equipos/${id}`);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/equipos" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          ← Equipos
        </Link>
        <header className="flex items-center gap-3 mt-2">
          <span
            className="w-5 h-5 rounded-full shrink-0"
            style={{ backgroundColor: equipo.colorPrimario ?? "#94a3b8" }}
            aria-hidden="true"
          />
          <h1 className="text-3xl font-black tracking-tight">{equipo.nombre}</h1>
        </header>
      </div>

      <ActionForm
        action={crearJugador.bind(null, equipo.id)}
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <label className="flex-1 flex flex-col gap-1.5 text-sm font-semibold">
          Nombre del jugador
          <input
            name="nombre"
            required
            placeholder="A. Pérez"
            className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Jersey
          <input
            name="numeroJersey"
            required
            pattern="\d{1,2}"
            title="1 o 2 dígitos"
            placeholder="12"
            className="w-24 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <SubmitButton className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95">
          + Añadir
        </SubmitButton>
      </ActionForm>

      {equipo.jugadores.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-4 opacity-50">🏃</span>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Roster vacío.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm divide-y divide-slate-100 dark:divide-zinc-800">
          {equipo.jugadores.map((jugador) => (
            <div key={jugador.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <span className="text-xl font-black tabular-nums w-10 text-center text-blue-600 dark:text-blue-400">
                  #{jugador.numeroJersey}
                </span>
                <span className="font-medium">{jugador.nombre}</span>
              </div>
              <DeleteButton action={eliminarJugador.bind(null, jugador.id, equipo.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
