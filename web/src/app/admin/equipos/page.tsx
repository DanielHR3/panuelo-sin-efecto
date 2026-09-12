import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { Liga, Equipo } from "@/lib/types";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { DeleteButton } from "../_components/DeleteButton";
import { crearEquipo, eliminarEquipo } from "./actions";

export default async function EquiposPage({
  searchParams,
}: {
  searchParams: Promise<{ categoriaId?: string }>;
}) {
  const { categoriaId } = await searchParams;
  const ligas = await apiFetch<Liga[]>("/ligas");
  const categoria = categoriaId
    ? ligas.flatMap((l) => l.categorias).find((c) => c.id === categoriaId)
    : undefined;
  const equipos = categoriaId
    ? await apiFetch<Equipo[]>(`/categorias/${categoriaId}/equipos`)
    : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Equipos y Rosters</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Elige una categoría para gestionar sus equipos.
        </p>
      </header>

      <form
        method="GET"
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <label className="flex-1 flex flex-col gap-1.5 text-sm font-semibold">
          Categoría
          <select
            name="categoriaId"
            defaultValue={categoriaId ?? ""}
            className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona una categoría…</option>
            {ligas.map((liga) => (
              <optgroup key={liga.id} label={liga.nombre}>
                {liga.categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-zinc-800 font-semibold">
          Ver
        </button>
      </form>

      {!categoriaId ? (
        <EmptyState text="Selecciona una categoría arriba para ver o crear sus equipos." />
      ) : !categoria ? (
        <EmptyState text="Esa categoría ya no existe." />
      ) : (
        <>
          <ActionForm
            action={crearEquipo.bind(null, categoriaId)}
            className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col sm:flex-row gap-3 sm:items-end"
          >
            <label className="flex-1 flex flex-col gap-1.5 text-sm font-semibold">
              Nuevo equipo en {categoria.nombre}
              <input
                name="nombre"
                required
                placeholder="Dragones"
                className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Color
              <input
                type="color"
                name="colorPrimario"
                defaultValue="#3b82f6"
                className="h-[46px] w-16 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent"
              />
            </label>
            <SubmitButton className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95">
              + Crear equipo
            </SubmitButton>
          </ActionForm>

          {equipos.length === 0 ? (
            <EmptyState text="Esta categoría todavía no tiene equipos." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipos.map((equipo) => (
                <div
                  key={equipo.id}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: equipo.colorPrimario ?? "#94a3b8" }}
                      aria-hidden="true"
                    />
                    <h3 className="font-bold text-lg truncate">{equipo.nombre}</h3>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <Link
                      href={`/admin/equipos/${equipo.id}`}
                      className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Ver roster →
                    </Link>
                    <DeleteButton
                      action={eliminarEquipo.bind(null, equipo.id)}
                      confirmMessage={`¿Eliminar "${equipo.nombre}"? Debe no tener jugadores ni partidos.`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
      <span className="text-5xl mb-4 opacity-50">🛡️</span>
      <p className="text-lg font-medium text-slate-600 dark:text-slate-300 text-center">{text}</p>
    </div>
  );
}
