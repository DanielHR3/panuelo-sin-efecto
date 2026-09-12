import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

type Cola = typeof import("./offline-queue");

// El módulo cachea la promesa de apertura de la base en una variable de
// módulo, así que cada test arranca con un IndexedDB vacío y un módulo
// fresco para que no se filtre estado entre casos.
async function colaLimpia(): Promise<Cola> {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  return import("./offline-queue");
}

describe("cola offline de eventos (IndexedDB)", () => {
  let cola: Cola;

  beforeEach(async () => {
    cola = await colaLimpia();
  });

  it("empieza vacía", async () => {
    expect(await cola.listarPendientes("p1")).toEqual([]);
    expect(await cola.contarPendientes("p1")).toBe(0);
  });

  it("devuelve los eventos de un partido en orden de creación, no de inserción", async () => {
    // Se insertan fuera de orden a propósito: UNDO_LAST_ACTION depende de
    // que el reenvío respete el orden real en que ocurrieron.
    await cola.encolarEvento({ clientEventId: "b", partidoId: "p1", tipoEvento: "PAT1", createdAt: 200 });
    await cola.encolarEvento({ clientEventId: "a", partidoId: "p1", tipoEvento: "TD", createdAt: 100 });
    await cola.encolarEvento({ clientEventId: "c", partidoId: "p1", tipoEvento: "UNDO_LAST_ACTION", createdAt: 300 });

    const pendientes = await cola.listarPendientes("p1");
    expect(pendientes.map((e) => e.clientEventId)).toEqual(["a", "b", "c"]);
    expect(await cola.contarPendientes("p1")).toBe(3);
  });

  it("separa los eventos por partido", async () => {
    await cola.encolarEvento({ clientEventId: "x", partidoId: "p1", tipoEvento: "TD", createdAt: 1 });
    await cola.encolarEvento({ clientEventId: "y", partidoId: "p2", tipoEvento: "TD", createdAt: 2 });

    expect((await cola.listarPendientes("p1")).map((e) => e.clientEventId)).toEqual(["x"]);
    expect((await cola.listarPendientes("p2")).map((e) => e.clientEventId)).toEqual(["y"]);
  });

  it("rechaza un clientEventId duplicado (idempotencia local)", async () => {
    await cola.encolarEvento({ clientEventId: "dup", partidoId: "p1", tipoEvento: "TD", createdAt: 1 });
    await expect(
      cola.encolarEvento({ clientEventId: "dup", partidoId: "p1", tipoEvento: "TD", createdAt: 2 }),
    ).rejects.toBeDefined();
    expect(await cola.contarPendientes("p1")).toBe(1);
  });

  it("eliminarPendiente quita solo ese evento", async () => {
    await cola.encolarEvento({ clientEventId: "a", partidoId: "p1", tipoEvento: "TD", createdAt: 1 });
    await cola.encolarEvento({ clientEventId: "b", partidoId: "p1", tipoEvento: "TD", createdAt: 2 });
    await cola.eliminarPendiente("a");
    expect((await cola.listarPendientes("p1")).map((e) => e.clientEventId)).toEqual(["b"]);
  });

  it("eliminar un id inexistente no falla", async () => {
    await expect(cola.eliminarPendiente("nada")).resolves.toBeUndefined();
  });
});

describe("MVP pendiente (HU-2.5)", () => {
  let cola: Cola;

  beforeEach(async () => {
    cola = await colaLimpia();
  });

  it("no hay MVP pendiente por defecto", async () => {
    expect(await cola.leerMvpPendiente("p1")).toBeUndefined();
  });

  it("la segunda elección reemplaza a la primera en vez de fallar", async () => {
    await cola.encolarMvp({ partidoId: "p1", jugadorId: "j1", createdAt: 1 });
    await cola.encolarMvp({ partidoId: "p1", jugadorId: "j2", createdAt: 2 });
    expect((await cola.leerMvpPendiente("p1"))?.jugadorId).toBe("j2");
  });

  it("eliminarMvpPendiente lo quita", async () => {
    await cola.encolarMvp({ partidoId: "p1", jugadorId: "j1", createdAt: 1 });
    await cola.eliminarMvpPendiente("p1");
    expect(await cola.leerMvpPendiente("p1")).toBeUndefined();
  });
});
