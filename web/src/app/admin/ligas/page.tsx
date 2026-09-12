import { apiFetch } from "@/lib/api";
import type { Liga } from "@/lib/types";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { DeleteButton } from "../_components/DeleteButton";
import {
  actualizarLiga,
  crearLiga,
  crearCategoria,
  eliminarLiga,
  eliminarCategoria,
} from "./actions";

const INPUT =
  "p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500";

/** HU-1.1: las dos reglas configurables de la liga, como checkboxes. */
function ConfigLigaFields({
  registraMvp,
  registraIntercepciones,
}: {
  registraMvp: boolean;
  registraIntercepciones: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          name="registraMvp"
          defaultChecked={registraMvp}
          className="w-4 h-4 accent-blue-600"
        />
        Exigir MVP al finalizar cada partido
      </label>
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          name="registraIntercepciones"
          defaultChecked={registraIntercepciones}
          className="w-4 h-4 accent-blue-600"
        />
        Llevar registro de intercepciones
      </label>
    </div>
  );
}

export default async function LigasPage() {
  const ligas = await apiFetch<Liga[]>("/ligas");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Ligas y Categorías</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Crea ligas y organiza sus categorías (Varonil, Femenil, Mixto…).
        </p>
      </header>

      <ActionForm
        action={crearLiga}
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-1 flex flex-col gap-1.5 text-sm font-semibold">
            Nueva liga
            <input
              name="nombre"
              required
              placeholder="Liga Metropolitana de Tocho"
              className={INPUT}
            />
          </label>
          <label className="flex-1 flex flex-col gap-1.5 text-sm font-semibold">
            Logo (URL, opcional)
            <input
              name="logoUrl"
              type="url"
              placeholder="https://…/logo.png"
              className={INPUT}
            />
          </label>
        </div>
        <ConfigLigaFields registraMvp registraIntercepciones />
        <SubmitButton className="self-start bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95">
          + Crear liga
        </SubmitButton>
      </ActionForm>

      {ligas.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ligas.map((liga) => (
            <LigaCard key={liga.id} liga={liga} />
          ))}
        </div>
      )}
    </div>
  );
}

function LigaCard({ liga }: { liga: Liga }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {liga.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria; next/image exigiría whitelist de dominios
            <img
              src={liga.logoUrl}
              alt=""
              className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-zinc-800 shrink-0"
            />
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-xl truncate">{liga.nombre}</h3>
            <p className="text-xs text-slate-400 font-medium">
              {liga.registraMvp ? "MVP obligatorio" : "Sin MVP"} ·{" "}
              {liga.registraIntercepciones ? "Registra intercepciones" : "Sin intercepciones"}
            </p>
          </div>
        </div>
        <DeleteButton
          action={eliminarLiga.bind(null, liga.id)}
          confirmMessage={`¿Eliminar la liga "${liga.nombre}"? Debe no tener categorías.`}
        />
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-blue-600 dark:text-blue-400 select-none">
          Configuración de la liga
        </summary>
        <ActionForm action={actualizarLiga.bind(null, liga.id)} className="flex flex-col gap-3 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Nombre
              <input name="nombre" required defaultValue={liga.nombre} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Logo (URL)
              <input
                name="logoUrl"
                type="url"
                defaultValue={liga.logoUrl ?? ""}
                placeholder="https://…/logo.png"
                className={INPUT}
              />
            </label>
          </div>
          <ConfigLigaFields
            registraMvp={liga.registraMvp}
            registraIntercepciones={liga.registraIntercepciones}
          />
          <SubmitButton className="self-start px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-semibold">
            Guardar configuración
          </SubmitButton>
        </ActionForm>
      </details>

      {liga.categorias.length === 0 ? (
        <p className="text-sm text-slate-400">Sin categorías todavía.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {liga.categorias.map((categoria) => (
            <li
              key={categoria.id}
              className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 rounded-full pl-3 pr-1 py-1 text-sm font-medium"
            >
              {categoria.nombre}
              <DeleteButton
                action={eliminarCategoria.bind(null, categoria.id)}
                label="✕"
                confirmMessage={`¿Eliminar la categoría "${categoria.nombre}"? Debe no tener equipos ni partidos.`}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 text-xs"
              />
            </li>
          ))}
        </ul>
      )}

      <ActionForm action={crearCategoria.bind(null, liga.id)} className="flex gap-2">
        <input
          name="nombre"
          required
          placeholder="Nueva categoría (p. ej. Varonil)"
          className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <SubmitButton className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-semibold">
          + Añadir
        </SubmitButton>
      </ActionForm>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
      <span className="text-5xl mb-4 opacity-50">🏆</span>
      <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
        Todavía no hay ligas.
      </p>
      <p className="text-sm mt-1">Crea la primera con el formulario de arriba.</p>
    </div>
  );
}
