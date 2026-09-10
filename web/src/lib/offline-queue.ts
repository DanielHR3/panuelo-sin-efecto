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

export interface MvpPendiente {
  partidoId: string;
  jugadorId: string;
  createdAt: number;
}

interface PanueloDB extends DBSchema {
  eventosPendientes: {
    key: string;
    value: EventoPendiente;
    indexes: { "by-partido": string };
  };
  mvpPendientes: {
    key: string;
    value: MvpPendiente;
  };
}

let dbPromise: Promise<IDBPDatabase<PanueloDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PanueloDB>> | null {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  // v2 agrega mvpPendientes (HU-2.5) sin tocar el store de eventos existente
  // — `upgrade` recibe oldVersion/newVersion para poder crear solo lo nuevo.
  dbPromise ??= openDB<PanueloDB>("panuelo-offline", 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore("eventosPendientes", { keyPath: "clientEventId" });
        store.createIndex("by-partido", "partidoId");
      }
      if (oldVersion < 2) {
        db.createObjectStore("mvpPendientes", { keyPath: "partidoId" });
      }
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

/**
 * MVP pendiente de sincronizar (HU-2.5). `put` en vez de `add`: si el árbitro
 * reabre el modal offline y cambia de jugador antes de que sincronice, la
 * segunda elección reemplaza a la primera en vez de chocar por clave duplicada.
 */
export async function encolarMvp(entry: MvpPendiente): Promise<void> {
  const db = await getDb();
  await db?.put("mvpPendientes", entry);
}

export async function leerMvpPendiente(partidoId: string): Promise<MvpPendiente | undefined> {
  const db = await getDb();
  return db?.get("mvpPendientes", partidoId);
}

export async function eliminarMvpPendiente(partidoId: string): Promise<void> {
  const db = await getDb();
  await db?.delete("mvpPendientes", partidoId);
}
