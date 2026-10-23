import Link from "next/link";
import { authedFetch } from "@/lib/server-api";
import type { Liga, Equipo } from "@/lib/types";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { DeleteButton } from "../_components/DeleteButton";
import { Vacio } from "../_components/Vacio";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, ETIQUETA, INPUT, TITULO_PAGINA } from "../_components/estilos";
import { crearEquipo, eliminarEquipo } from "./actions";

export default async function EquiposPage({
  searchParams,
}: {
  searchParams: Promise<{ categoriaId?: string }>;
}) {
  const { categoriaId } = await searchParams;
  const ligas = await authedFetch<Liga[]>("/ligas");
  const categoria = categoriaId
    ? ligas.flatMap((l) => l.categorias).find((c) => c.id === categoriaId)
    : undefined;
  // Solo categorías de las ligas visibles; una ajena respondería 403.
  const equipos = categoria
    ? await authedFetch<Equipo[]>(`/categorias/${categoria.id}/equipos`)
    : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className={TITULO_PAGINA}>Equipos y Rosters</h1>
        <p className="text-suave mt-2">
          Elige una categoría para gestionar sus equipos.
        </p>
      </header>

      <form
        method="GET"
        className="panel p-5 sm:p-6 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <label className={`flex-1 ${ETIQUETA}`}>
          Categoría
          <select
            name="categoriaId"
            defaultValue={categoriaId ?? ""}
            className={INPUT}
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
        <button className={`px-5 py-3 ${BOTON_SECUNDARIO}`}>
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
            className="panel p-5 sm:p-6 flex flex-col sm:flex-row gap-3 sm:items-end"
          >
            <label className={`flex-1 ${ETIQUETA}`}>
              Nuevo equipo en {categoria.nombre}
              <input
                name="nombre"
                required
                placeholder="Dragones"
                className={INPUT}
              />
            </label>
            <label className={ETIQUETA}>
              Color
              <input
                type="color"
                name="colorPrimario"
                defaultValue="#3b82f6"
                className="h-[52px] w-16 rounded-lg border-2 border-texto/20 bg-fondo p-1"
              />
            </label>
            <SubmitButton className={BOTON_PRIMARIO}>
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
                  className="panel p-5 flex flex-col gap-4 relative overflow-hidden"
                >
                  {/* Franja con el color del equipo, como en el marcador. */}
                  <span
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: equipo.colorPrimario ?? "#94a3b8" }}
                    aria-hidden="true"
                  />
                  <h3 className="titulo-estadio text-2xl leading-tight truncate">{equipo.nombre}</h3>
                  <div className="flex items-center justify-between mt-auto">
                    <Link
                      href={`/admin/equipos/${equipo.id}`}
                      className="text-sm font-display font-bold uppercase tracking-[0.06em] text-panuelo-texto hover:underline"
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
  return <Vacio icono="escudo" texto={text} />;
}
