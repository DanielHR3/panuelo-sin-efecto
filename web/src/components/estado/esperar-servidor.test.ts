import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { esperarServidor, reintentoRecienteFallido } from "./esperar-servidor";

const ok = () => new Response("Hello", { status: 200 });
const caido = () => new Response("", { status: 503 });

/** fetch que nunca responde hasta que se aborta (API dormida colgando la conexión). */
function colgado(_url: string, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () =>
      reject(new DOMException("aborted", "AbortError")),
    );
  });
}

describe("esperarServidor", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const opciones = (fetchMock: typeof fetch) => {
    const onIntento = vi.fn();
    const onListo = vi.fn();
    const onAgotado = vi.fn();
    return {
      onIntento,
      onListo,
      onAgotado,
      args: {
        url: "http://api/",
        cadaMs: 5_000,
        timeoutMs: 60_000,
        limiteMs: 180_000,
        fetch: fetchMock,
        onIntento,
        onListo,
        onAgotado,
      },
    };
  };

  it("pide GET a la URL de salud sin caché y con señal de aborto", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    const { args, onListo } = opciones(fetchMock);
    esperarServidor(args);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api/",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
    expect(onListo).toHaveBeenCalledTimes(1);
  });

  it("reintenta cada ~5 s mientras la API falla y avisa al responder OK", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(caido())
      .mockResolvedValueOnce(ok());
    const { args, onIntento, onListo, onAgotado } = opciones(fetchMock);
    esperarServidor(args);

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(onIntento.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
    expect(onListo).toHaveBeenCalledTimes(1);
    expect(onAgotado).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("aborta una petición colgada a los 60 s y vuelve a intentar", async () => {
    const fetchMock = vi.fn(colgado).mockImplementationOnce(colgado);
    const { args } = opciones(fetchMock as unknown as typeof fetch);
    esperarServidor(args);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1 + 5_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("se rinde a los ~3 minutos y no vuelve a pedir", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { args, onListo, onAgotado } = opciones(fetchMock);
    esperarServidor(args);
    await vi.advanceTimersByTimeAsync(179_000);
    expect(onAgotado).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(6_000);
    expect(onAgotado).toHaveBeenCalledTimes(1);
    expect(onListo).not.toHaveBeenCalled();
    const llamadas = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(llamadas);
  });

  it("una petición colgada no alarga la espera más allá del límite", async () => {
    const { args, onAgotado } = opciones(colgado as unknown as typeof fetch);
    esperarServidor({ ...args, timeoutMs: 600_000 });
    await vi.advanceTimersByTimeAsync(180_000);
    expect(onAgotado).toHaveBeenCalledTimes(1);
  });

  it("cancelar detiene los reintentos y aborta la petición en curso", async () => {
    const fetchMock = vi.fn(colgado);
    const { args, onAgotado, onListo } = opciones(fetchMock as unknown as typeof fetch);
    const control = esperarServidor(args);
    await vi.advanceTimersByTimeAsync(0);
    const signal = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].signal!;
    control.cancelar();
    expect(signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onAgotado).not.toHaveBeenCalled();
    expect(onListo).not.toHaveBeenCalled();
  });

  it("reintentarAhora lanza un intento inmediato sin esperar los 5 s", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(ok());
    const { args, onListo } = opciones(fetchMock);
    const control = esperarServidor(args);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    control.reintentarAhora();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onListo).toHaveBeenCalledTimes(1);
  });
});

describe("reintentoRecienteFallido", () => {
  it("es true si la página volvió a fallar poco después de reintentar con la API arriba", () => {
    expect(reintentoRecienteFallido(10_000, 2_000)).toBe(true);
  });
  it("es false si nunca se reintentó o fue hace rato", () => {
    expect(reintentoRecienteFallido(10_000, null)).toBe(false);
    expect(reintentoRecienteFallido(100_000, 2_000)).toBe(false);
  });
});
