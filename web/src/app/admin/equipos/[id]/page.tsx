import Link from "next/link";
import { authedFetch } from "@/lib/server-api";
import type { EquipoConRoster } from "@/lib/types";
import { ActionForm, SubmitButton } from "../../_components/ActionForm";
import { DeleteButton } from "../../_components/DeleteButton";
import { Vacio } from "../../_components/Vacio";
import { BOTON_PRIMARIO, ETIQUETA, INPUT, TITULO_PAGINA } from "../../_components/estilos";
import { crearJugador, eliminarJugador } from "../actions";

export default async function EquipoRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const equipo = await authedFetch<EquipoConRoster>(`/equipos/${id}`);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/equipos" className="text-sm font-display font-bold uppercase tracking-[0.06em] text-panuelo-texto hover:underline">
          ← Equipos
        </Link>
        <header className="flex items-center gap-3 mt-2">
          <span
            className="w-2 h-9 rounded-full shrink-0"
            style={{ backgroundColor: equipo.colorPrimario ?? "#94a3b8" }}
            aria-hidden="true"
          />
          <h1 className={TITULO_PAGINA}>{equipo.nombre}</h1>
        </header>
      </div>

      <ActionForm
        action={crearJugador.bind(null, equipo.id)}
        className="panel p-5 sm:p-6 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <label className={`flex-1 ${ETIQUETA}`}>
          Nombre del jugador
          <input
            name="nombre"
            required
            placeholder="A. Pérez"
            className={INPUT}
          />
        </label>
        <label className={ETIQUETA}>
          Jersey
          <input
            name="numeroJersey"
            required
            pattern="\d{1,2}"
            title="1 o 2 dígitos"
            placeholder="12"
            className={`w-24 ${INPUT}`}
          />
        </label>
        <SubmitButton className={BOTON_PRIMARIO}>
          + Añadir
        </SubmitButton>
      </ActionForm>

      {equipo.jugadores.length === 0 ? (
        <Vacio icono="jugador" texto="Roster vacío." />
      ) : (
        <div className="panel overflow-hidden">
          {equipo.jugadores.map((jugador) => (
            <div key={jugador.id} className="flex items-center justify-between gap-3 px-4 py-3 odd:bg-panel even:bg-panel-alterno">
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-display italic font-extrabold text-2xl tabular-nums w-12 text-center shrink-0">
                  #{jugador.numeroJersey}
                </span>
                <span className="font-semibold truncate">{jugador.nombre}</span>
              </div>
              <DeleteButton action={eliminarJugador.bind(null, jugador.id, equipo.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
