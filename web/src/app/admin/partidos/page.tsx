import { apiFetch } from "@/lib/api";
import { authedFetch } from "@/lib/server-api";
import type { Liga, Equipo, Partido, Usuario, EstadoPartido } from "@/lib/types";
import { ESTADO_BADGE, ESTADO_LABEL } from "@/lib/estado-partido";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { DeleteButton } from "../_components/DeleteButton";
import {
  crearPartido,
  eliminarPartido,
  avanzarEstado,
  asignarArbitro,
  quitarArbitro,
} from "./actions";

const ESTADO_SIGUIENTE: Record<EstadoPartido, EstadoPartido | null> = {
  PROGRAMADO: "EN_CURSO",
  EN_CURSO: "FINALIZADO",
  FINALIZADO: null,
};

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoriaId?: string }>;
}) {
  const { categoriaId } = await searchParams;
  const ligas = await apiFetch<Liga[]>("/ligas");
  const categoria = categoriaId
    ? ligas.flatMap((l) => l.categorias).find((c) => c.id === categoriaId)
    : undefined;

  const [equipos, partidos, arbitros] = categoriaId
    ? await Promise.all([
        apiFetch<Equipo[]>(`/categorias/${categoriaId}/equipos`),
        apiFetch<Partido[]>(`/categorias/${categoriaId}/partidos`),
        authedFetch<Usuario[]>("/usuarios?rol=ARBITRO"),
      ])
    : [[], [], []];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Gestión de Partidos</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Elige una categoría para programar y arbitrar sus partidos.
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

      {!categoriaId || !categoria ? (
        <EmptyState text="Selecciona una categoría arriba para ver o programar sus partidos." />
      ) : equipos.length < 2 ? (
        <EmptyState text="Esta categoría necesita al menos 2 equipos para programar un partido." />
      ) : (
        <>
          <ActionForm
            action={crearPartido.bind(null, categoriaId)}
            className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <label className="flex flex-col gap-1.5 text-sm font-semibold lg:col-span-2">
              Fecha y hora
              <input
                type="datetime-local"
                name="fechaHora"
                required
                className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Dificultad
              <select
                name="dificultad"
                defaultValue="REGULAR"
                className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="REGULAR">Regular</option>
                <option value="MEDIO">Medio</option>
                <option value="COMPLICADO">Complicado</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Local
              <select
                name="equipoLocalId"
                required
                defaultValue=""
                className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>
                  Elige…
                </option>
                {equipos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Visitante
              <select
                name="equipoVisitanteId"
                required
                defaultValue=""
                className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>
                  Elige…
                </option>
                {equipos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton className="lg:col-span-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95">
              + Programar partido
            </SubmitButton>
          </ActionForm>

          {partidos.length === 0 ? (
            <EmptyState text="Esta categoría todavía no tiene partidos programados." />
          ) : (
            <div className="flex flex-col gap-4">
              {partidos.map((partido) => (
                <PartidoCard
                  key={partido.id}
                  partido={partido}
                  equipos={equipos}
                  arbitros={arbitros}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PartidoCard({
  partido,
  equipos,
  arbitros,
}: {
  partido: Partido;
  equipos: Equipo[];
  arbitros: Usuario[];
}) {
  const local = equipos.find((e) => e.id === partido.equipoLocalId)?.nombre ?? "?";
  const visitante = equipos.find((e) => e.id === partido.equipoVisitanteId)?.nombre ?? "?";
  const siguiente = ESTADO_SIGUIENTE[partido.estado];
  const asignados = new Set((partido.asignaciones ?? []).map((a) => a.arbitroId));
  const disponibles = arbitros.filter((a) => !asignados.has(a.id));

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
            {new Date(partido.fechaHora).toLocaleString("es-MX", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <h3 className="font-bold text-lg">
            {local} <span className="text-slate-400 font-black tabular-nums">{partido.marcadorLocal}</span>
            {" — "}
            <span className="text-slate-400 font-black tabular-nums">{partido.marcadorVisitante}</span> {visitante}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${ESTADO_BADGE[partido.estado]}`}>
            {ESTADO_LABEL[partido.estado]}
          </span>
          {siguiente && (
            <ActionForm action={avanzarEstado.bind(null, partido.id, siguiente)}>
              <SubmitButton className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800">
                → {ESTADO_LABEL[siguiente]}
              </SubmitButton>
            </ActionForm>
          )}
          <DeleteButton
            action={eliminarPartido.bind(null, partido.id)}
            confirmMessage="¿Eliminar este partido?"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Árbitros</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {(partido.asignaciones ?? []).length === 0 && (
            <p className="text-sm text-slate-400">Sin árbitros asignados.</p>
          )}
          {(partido.asignaciones ?? []).map((asignacion) => (
            <span
              key={asignacion.arbitroId}
              className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 rounded-full pl-3 pr-1 py-1 text-sm font-medium"
            >
              {asignacion.arbitro?.nombre ?? asignacion.arbitroId} · {asignacion.rolEnCampo}
              <DeleteButton
                action={quitarArbitro.bind(null, partido.id, asignacion.arbitroId)}
                label="✕"
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 text-xs"
              />
            </span>
          ))}
        </div>
        {disponibles.length > 0 && (
          <ActionForm action={asignarArbitro.bind(null, partido.id)} className="flex flex-wrap gap-2">
            <select
              name="arbitroId"
              required
              defaultValue=""
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent text-sm"
            >
              <option value="" disabled>
                Elige un árbitro…
              </option>
              {disponibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <select
              name="rolEnCampo"
              defaultValue="Referee"
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent text-sm"
            >
              <option value="Referee">Referee</option>
              <option value="Umpire">Umpire</option>
              <option value="Line Judge">Line Judge</option>
            </select>
            <SubmitButton className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-semibold">
              + Asignar
            </SubmitButton>
          </ActionForm>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
      <span className="text-5xl mb-4 opacity-50">🏈</span>
      <p className="text-lg font-medium text-slate-600 dark:text-slate-300 text-center">{text}</p>
    </div>
  );
}
