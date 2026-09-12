import { authedFetch, getSessionUser } from "@/lib/server-api";
import type { Usuario } from "@/lib/types";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { crearArbitro } from "./actions";

export default async function ArbitrosPage() {
  const [arbitros, yo] = await Promise.all([
    authedFetch<Usuario[]>("/usuarios?rol=ARBITRO"),
    getSessionUser(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Árbitros</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Cuentas con rol de árbitro, listas para asignar a partidos.
        </p>
      </header>

      {yo?.rol === "SUPERADMIN" ? (
        <ActionForm
          action={crearArbitro}
          className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
        >
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Nombre
            <input
              name="nombre"
              required
              placeholder="Ana Torres"
              className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Email
            <input
              type="email"
              name="email"
              required
              placeholder="ana@liga.mx"
              className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Contraseña
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="mínimo 8 caracteres"
              className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <SubmitButton className="sm:col-span-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95">
            + Crear árbitro
          </SubmitButton>
        </ActionForm>
      ) : (
        <p className="text-sm text-slate-400">
          Solo un Super Administrador puede dar de alta nuevos árbitros.
        </p>
      )}

      {arbitros.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-4 opacity-50">🦓</span>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
            Todavía no hay árbitros registrados.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm divide-y divide-slate-100 dark:divide-zinc-800">
          {arbitros.map((arbitro) => (
            <div key={arbitro.id} className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                {arbitro.nombre.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{arbitro.nombre}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{arbitro.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
