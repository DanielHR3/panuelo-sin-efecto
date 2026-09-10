import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { TipoEvento } from "./types";

export interface EventoPendiente {
  clientEventId: string;
  partidoId: string;
  tipoEvento: TipoEvento;
  equipoId?: string;
  jugadorId?: string;
  createdAt: number;
}

interface PanueloDB extends DBSchema {
  eventosPendientes: {
    key: string;
    value: EventoPendiente;
    indexes: { "by-partido": string };
  };
}

let dbPromise: Promise<IDBPDatabase<PanueloDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PanueloDB>> | null {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  dbPromise ??= openDB<PanueloDB>("panuelo-offline", 1, {
    upgrade(db) {
      const store = db.createObjectStore("eventosPendientes", { keyPath: "clientEventId" });
      store.createIndex("by-partido", "partidoId");
    },
  });
  return dbPromise;
}

/**
 * Cola de eventos sin sincronizar (IndexedDB), para cuando el árbitro se
 * queda sin conexión a mitad de un partido. El orden importa: UNDO_LAST_ACTION
 * cancela "el último evento vigente" en el backend, así que hay que
 * reenviarlos en el mismo orden en que se crearon.
 */
export async function encolarEvento(entry: EventoPendiente): Promise<void> {
  const db = await getDb();
  await db?.add("eventosPendientes", entry);
}

export async function listarPendientes(partidoId: string): Promise<EventoPendiente[]> {
  const db = await getDb();
  if (!db) return [];
  const todos = await db.getAllFromIndex("eventosPendientes", "by-partido", partidoId);
  return todos.sort((a, b) => a.createdAt - b.createdAt);
}

export async function contarPendientes(partidoId: string): Promise<number> {
  return (await listarPendientes(partidoId)).length;
}

export async function eliminarPendiente(clientEventId: string): Promise<void> {
  const db = await getDb();
  await db?.delete("eventosPendientes", clientEventId);
}
