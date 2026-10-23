"use client";

import type { EquipoConRoster, GameEvent } from "@/lib/types";
import { eventosAnulables } from "./corregir";
import { describirEvento } from "./describe";

/**
 * Lista de eventos que se pueden anular mientras el partido está reabierto
 * para corregir. Solo los eventos ya sincronizados se pueden anular: uno
 * optimista todavía lleva su clientEventId como id (ver ejecutar/drenarCola)
 * y el servidor rechazaría un ANULAR_EVENTO que apunte a él.
 */
export function CorregirPanel({
  eventos,
  equipoLocal,
  equipoVisitante,
  disabled,
  onAnular,
}: {
  eventos: GameEvent[];
  equipoLocal: EquipoConRoster;
  equipoVisitante: EquipoConRoster;
  disabled: boolean;
  onAnular: (evento: GameEvent) => void;
}) {
  const anulables = eventosAnulables(eventos);

  return (
    <section className="panel rounded-2xl p-4 flex flex-col gap-3" aria-label="Eventos anulables">
      <h2 className="text-xs font-bold uppercase tracking-widest opacity-60">Anular un evento</h2>
      {anulables.length === 0 ? (
        <p className="text-sm text-foreground/60">No hay jugadas ni faltas que anular.</p>
      ) : (
        <ul className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
          {anulables.map((evento) => {
            const sincronizando = evento.id === evento.clientEventId;
            return (
              <li
                key={evento.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-foreground/5 pl-3"
              >
                <span className="text-sm font-semibold min-w-0 break-words py-2">
                  {describirEvento(evento, equipoLocal, equipoVisitante)}
                </span>
                {sincronizando ? (
                  <span className="shrink-0 text-xs font-semibold text-yellow-600 dark:text-yellow-400 px-3">
                    Sincronizando…
                  </span>
                ) : (
                  <button
                    onClick={() => onAnular(evento)}
                    disabled={disabled}
                    className="shrink-0 h-12 px-5 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 font-black active:scale-95 transition-transform disabled:opacity-40"
                  >
                    Anular
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
