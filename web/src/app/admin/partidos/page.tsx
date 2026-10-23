import { authedFetch } from "@/lib/server-api";
import { arbitrosAsignables } from "@/lib/arbitros";
import type {
  Liga,
  Equipo,
  Partido,
  Usuario,
  EstadoPartido,
  Discrepancia,
  EquipoConRoster,
  Jugador,
} from "@/lib/types";
import { ESTADO_BADGE, ESTADO_BADGE_BASE, ESTADO_LABEL } from "@/lib/estado-partido";
import { Icono } from "@/components/icons/Icono";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { DeleteButton } from "../_components/DeleteButton";
import { Vacio } from "../_components/Vacio";
import {
  BOTON_PELIGRO,
  BOTON_PRIMARIO,
  BOTON_QUITAR,
  BOTON_SECUNDARIO,
  ETIQUETA,
  INPUT,
  ROTULO,
  TITULO_PAGINA,
} from "../_components/estilos";
import { descarteBloqueado } from "./discrepancias";
import {
  crearPartido,
  eliminarPartido,
  avanzarEstado,
  asignarArbitro,
  quitarArbitro,
  reabrirDiscrepancia,
  resolverDiscrepancia,
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
  // GET /ligas ya viene acotada a las ligas del usuario (SUPERADMIN: todas).
  const ligas = await authedFetch<Liga[]>("/ligas");
  const categoria = categoriaId
    ? ligas.flatMap((l) => l.categorias).find((c) => c.id === categoriaId)
    : undefined;
  const ligaId = categoria ? ligas.find((l) => l.categorias.some((c) => c.id === categoria.id))?.id : undefined;

  // Solo se consulta una categoría que esté entre las ligas visibles: una
  // ajena (p. ej. un ?categoriaId= pegado a mano) respondería 403 y tiraría
  // la página al boundary de error.
  const [equipos, partidos, arbitros] = categoria
    ? await Promise.all([
        authedFetch<Equipo[]>(`/categorias/${categoria.id}/equipos`),
        authedFetch<Partido[]>(`/categorias/${categoria.id}/partidos`),
        authedFetch<Usuario[]>("/usuarios?rol=ARBITRO"),
      ])
    : [[], [], []];

  const finalizados = partidos.filter((p) => p.estado === "FINALIZADO");
  // Finding 3 (HU-2.6 review): si una consulta de discrepancias responde
  // con error (p. ej. 403) dentro de un Promise.all sin manejar, tiraría
  // toda la página al boundary de error genérico (ni el selector de
  // categoría quedaría accesible). Cada fetch falla en aislado: un partido
  // cuya consulta de discrepancias falle se trata como "sin discrepancias
  // que mostrar" en vez de romper la página completa.
  const discrepanciasPorPartido = new Map<string, Discrepancia[]>(
    await Promise.all(
      finalizados.map(async (p) => {
        try {
          return [
            p.id,
            await authedFetch<Discrepancia[]>(`/partidos/${p.id}/discrepancias`),
          ] as const;
        } catch {
          return [p.id, [] as Discrepancia[]] as const;
        }
      }),
    ),
  );

  // Finding 4: el roster completo de cada equipo (para mostrar el jugador
  // de cada evento en las filas de discrepancia) no viene en
  // /categorias/:id/equipos — se resuelve aparte, mismo patrón N+1
  // aceptado ya en este archivo para las discrepancias. Igual que ahí,
  // cada fetch falla en aislado: un roster que no cargue solo deja a sus
  // jugadores como "sin jugador" en vez de tirar la página entera.
  const equiposConRoster: EquipoConRoster[] = await Promise.all(
    equipos.map(async (e) => {
      try {
        return await authedFetch<EquipoConRoster>(`/equipos/${e.id}`);
      } catch {
        return { ...e, jugadores: [] };
      }
    }),
  );
  const jugadoresPorId = new Map<string, Jugador>(
    equiposConRoster.flatMap((e) => e.jugadores.map((j) => [j.id, j] as const)),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className={TITULO_PAGINA}>Gestión de Partidos</h1>
        <p className="text-suave mt-2">
          Elige una categoría para programar y arbitrar sus partidos.
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

      {!categoriaId || !categoria ? (
        <EmptyState text="Selecciona una categoría arriba para ver o programar sus partidos." />
      ) : equipos.length < 2 ? (
        <EmptyState text="Esta categoría necesita al menos 2 equipos para programar un partido." />
      ) : (
        <>
          <ActionForm
            action={crearPartido.bind(null, categoriaId)}
            className="panel p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <label className={`${ETIQUETA} lg:col-span-2`}>
              Fecha y hora
              <input
                type="datetime-local"
                name="fechaHora"
                required
                className={INPUT}
              />
            </label>
            <label className={ETIQUETA}>
              Dificultad
              <select
                name="dificultad"
                defaultValue="REGULAR"
                className={INPUT}
              >
                <option value="REGULAR">Regular</option>
                <option value="MEDIO">Medio</option>
                <option value="COMPLICADO">Complicado</option>
              </select>
            </label>
            <label className={ETIQUETA}>
              Local
              <select
                name="equipoLocalId"
                required
                defaultValue=""
                className={INPUT}
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
            <label className={ETIQUETA}>
              Visitante
              <select
                name="equipoVisitanteId"
                required
                defaultValue=""
                className={INPUT}
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
            <SubmitButton className={`lg:col-span-5 ${BOTON_PRIMARIO}`}>
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
                  ligaId={ligaId ?? ""}
                  discrepancias={discrepanciasPorPartido.get(partido.id) ?? []}
                  jugadoresPorId={jugadoresPorId}
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
  ligaId,
  discrepancias,
  jugadoresPorId,
}: {
  partido: Partido;
  equipos: Equipo[];
  arbitros: Usuario[];
  ligaId: string;
  discrepancias: Discrepancia[];
  jugadoresPorId: Map<string, Jugador>;
}) {
  const local = equipos.find((e) => e.id === partido.equipoLocalId)?.nombre ?? "?";
  const visitante = equipos.find((e) => e.id === partido.equipoVisitanteId)?.nombre ?? "?";
  const siguiente = ESTADO_SIGUIENTE[partido.estado];
  const asignados = new Set((partido.asignaciones ?? []).map((a) => a.arbitroId));
  const disponibles = arbitrosAsignables(arbitros, asignados, ligaId);
  const pendientes = discrepancias.filter((d) => d.estado === "PENDIENTE");
  const resueltas = discrepancias.filter((d) => d.estado === "RESUELTA");

  return (
    <div className="panel p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={ROTULO}>
            {new Date(partido.fechaHora).toLocaleString("es-MX", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <h3 className="font-bold text-lg mt-1">
            {local}{" "}
            <span className="font-display italic font-extrabold text-2xl tabular-nums">{partido.marcadorLocal}</span>
            <span className="text-suave">{" — "}</span>
            <span className="font-display italic font-extrabold text-2xl tabular-nums">{partido.marcadorVisitante}</span>{" "}
            {visitante}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${ESTADO_BADGE_BASE} ${ESTADO_BADGE[partido.estado]}`}>
            {ESTADO_LABEL[partido.estado]}
          </span>
          {siguiente && (
            <ActionForm action={avanzarEstado.bind(null, partido.id, siguiente)}>
              <SubmitButton className={`px-2.5 py-1 text-xs ${BOTON_SECUNDARIO}`}>
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

      <div className="border-t border-texto/10 pt-4">
        <p className={`${ROTULO} mb-2`}>Árbitros</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {(partido.asignaciones ?? []).length === 0 && (
            <p className="text-sm text-suave">Sin árbitros asignados.</p>
          )}
          {(partido.asignaciones ?? []).map((asignacion) => (
            <span
              key={asignacion.arbitroId}
              className="flex items-center gap-1.5 bg-panel-alterno border border-texto/10 rounded-full pl-3 pr-1 py-1 text-sm font-semibold"
            >
              {asignacion.arbitro?.nombre ?? asignacion.arbitroId} · {asignacion.rolEnCampo}
              <DeleteButton
                action={quitarArbitro.bind(null, partido.id, asignacion.arbitroId)}
                label={<Icono nombre="cerrar" />}
                ariaLabel={`Quitar a ${asignacion.arbitro?.nombre ?? asignacion.arbitroId}`}
                className={BOTON_QUITAR}
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
              aria-label="Árbitro"
              className={`text-sm ${INPUT} p-2!`}
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
              aria-label="Rol en campo"
              className={`text-sm ${INPUT} p-2!`}
            >
              <option value="Referee">Referee</option>
              <option value="Umpire">Umpire</option>
              <option value="Line Judge">Line Judge</option>
            </select>
            <SubmitButton className={`px-4 py-2 text-sm ${BOTON_SECUNDARIO}`}>
              + Asignar
            </SubmitButton>
          </ActionForm>
        )}
      </div>

      {pendientes.length > 0 && (
        <div className="border-t border-texto/10 pt-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-panuelo-texto mb-3">
            <Icono nombre="alerta" className="text-base shrink-0" />
            {pendientes.length} discrepancia{pendientes.length === 1 ? "" : "s"} por resolver
          </p>
          <div className="flex flex-col gap-3">
            {pendientes.map((d) => (
              <DiscrepanciaRow
                key={d.id}
                partidoId={partido.id}
                discrepancia={d}
                arbitros={arbitros}
                equipos={equipos}
                jugadoresPorId={jugadoresPorId}
              />
            ))}
          </div>
        </div>
      )}

      {resueltas.length > 0 && (
        <details className="border-t border-texto/10 pt-4">
          <summary className={`cursor-pointer select-none ${ROTULO}`}>
            {resueltas.length} discrepancia{resueltas.length === 1 ? "" : "s"} resuelta
            {resueltas.length === 1 ? "" : "s"}
          </summary>
          <div className="flex flex-col gap-2 mt-3">
            {resueltas.map((d) => (
              <DiscrepanciaResueltaRow
                key={d.id}
                partidoId={partido.id}
                discrepancia={d}
                arbitros={arbitros}
                equipos={equipos}
                jugadoresPorId={jugadoresPorId}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** Descripción compacta de un evento de discrepancia (compartida por ambas filas). */
function describirEventoDiscrepancia(
  e: Discrepancia["eventoA"],
  arbitros: Usuario[],
  equipos: Equipo[],
  jugadoresPorId: Map<string, Jugador>,
): string {
  const nombreArbitro = arbitros.find((a) => a.id === e.arbitroId)?.nombre ?? e.arbitroId;
  const nombreEquipo = e.equipoId
    ? (equipos.find((eq) => eq.id === e.equipoId)?.nombre ?? e.equipoId)
    : "sin equipo";
  // Finding 4 (HU-2.6 review): un par detectado siempre comparte tipoEvento
  // y equipoId por construcción (ver detectarDiscrepancias) — jugadorId es
  // lo único que puede distinguir a los dos eventos que el admin tiene que
  // elegir entre sí. Mismo formato "#numero nombre" que MvpModal/ActionModal.
  const jugador = e.jugadorId ? jugadoresPorId.get(e.jugadorId) : undefined;
  const nombreJugador = jugador ? `#${jugador.numeroJersey} ${jugador.nombre}` : "sin jugador";
  return `${e.tipoEvento} · ${nombreEquipo} · ${nombreJugador} · ${nombreArbitro} · ${new Date(e.timestamp).toLocaleTimeString("es-MX")}`;
}

function DiscrepanciaResueltaRow({
  partidoId,
  discrepancia,
  arbitros,
  equipos,
  jugadoresPorId,
}: {
  partidoId: string;
  discrepancia: Discrepancia;
  arbitros: Usuario[];
  equipos: Equipo[];
  jugadoresPorId: Map<string, Jugador>;
}) {
  const resultado =
    discrepancia.eventoDescartadoId === null
      ? "Se mantuvieron ambos"
      : discrepancia.eventoDescartadoId === discrepancia.eventoA.id
        ? "Se descartó A"
        : "Se descartó B";
  const describir = (e: Discrepancia["eventoA"]) =>
    describirEventoDiscrepancia(e, arbitros, equipos, jugadoresPorId);

  return (
    <div className="bg-panel-alterno border border-texto/10 rounded-lg p-4 flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">
          {resultado}
          {discrepancia.resolvedAt && (
            <span className="font-normal text-suave">
              {" · "}
              {new Date(discrepancia.resolvedAt).toLocaleString("es-MX", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
        </span>
        <ActionForm action={reabrirDiscrepancia.bind(null, partidoId, discrepancia.id)}>
          <SubmitButton className={`px-2.5 py-1 text-xs ${BOTON_SECUNDARIO} bg-panel!`}>
            Reabrir
          </SubmitButton>
        </ActionForm>
      </div>
      <p className="text-suave">A: {describir(discrepancia.eventoA)}</p>
      <p className="text-suave">B: {describir(discrepancia.eventoB)}</p>
    </div>
  );
}

function DiscrepanciaRow({
  partidoId,
  discrepancia,
  arbitros,
  equipos,
  jugadoresPorId,
}: {
  partidoId: string;
  discrepancia: Discrepancia;
  arbitros: Usuario[];
  equipos: Equipo[];
  jugadoresPorId: Map<string, Jugador>;
}) {
  const describirEvento = (e: Discrepancia["eventoA"]) =>
    describirEventoDiscrepancia(e, arbitros, equipos, jugadoresPorId);

  return (
    <div className="bg-panel-alterno border border-texto/10 border-l-4 border-l-panuelo rounded-lg p-4 flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {(["A", "B"] as const).map((lado) => {
          const evento = lado === "A" ? discrepancia.eventoA : discrepancia.eventoB;
          return (
            <div key={lado} className="flex flex-col gap-1">
              <span className="font-bold flex flex-wrap items-center gap-2">
                Evento {lado}
                {evento.anulado && <AnuladoBadge />}
              </span>
              <span
                className={`text-suave ${evento.anulado ? "line-through" : ""}`}
              >
                {describirEvento(evento)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionForm action={resolverDiscrepancia.bind(null, partidoId, discrepancia.id, "DESCARTAR_A")}>
          <SubmitButton
            disabled={descarteBloqueado(discrepancia, "A")}
            title={
              descarteBloqueado(discrepancia, "A")
                ? "El otro evento ya fue anulado; descartar este dejaría la jugada sin registrar"
                : undefined
            }
            className={`px-3 py-1.5 text-xs bg-panel ${BOTON_PELIGRO}`}
          >
            Descartar A
          </SubmitButton>
        </ActionForm>
        <ActionForm action={resolverDiscrepancia.bind(null, partidoId, discrepancia.id, "DESCARTAR_B")}>
          <SubmitButton
            disabled={descarteBloqueado(discrepancia, "B")}
            title={
              descarteBloqueado(discrepancia, "B")
                ? "El otro evento ya fue anulado; descartar este dejaría la jugada sin registrar"
                : undefined
            }
            className={`px-3 py-1.5 text-xs bg-panel ${BOTON_PELIGRO}`}
          >
            Descartar B
          </SubmitButton>
        </ActionForm>
        <ActionForm action={resolverDiscrepancia.bind(null, partidoId, discrepancia.id, "MANTENER_AMBOS")}>
          <SubmitButton className={`px-3 py-1.5 text-xs ${BOTON_SECUNDARIO} bg-panel!`}>
            Mantener ambos
          </SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}

/** Marca un evento que el árbitro anuló al corregir el partido (ANULAR_EVENTO). */
function AnuladoBadge() {
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-[0.1em] bg-texto text-fondo">
      Anulado
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <Vacio icono="campo" texto={text} />;
}
