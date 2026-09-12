import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHalfTimer, useHaptics, useScreenLock } from "./hooks";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-20T18:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useHalfTimer (cronómetro de mitad, HU-2.4)", () => {
  it("arranca detenido con el tiempo completo", () => {
    const { result } = renderHook(() => useHalfTimer(20));
    expect(result.current.running).toBe(false);
    expect(result.current.remainingSeconds).toBe(20 * 60);
  });

  it("descuenta según el reloj real, no por conteo de ticks", () => {
    const { result } = renderHook(() => useHalfTimer(20));
    act(() => result.current.start());
    // Aunque el intervalo corre cada 250 ms, el restante se calcula con
    // Date.now(): saltar 90 s de golpe debe reflejar 90 s menos.
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(result.current.remainingSeconds).toBe(20 * 60 - 90);
  });

  it("pause congela el restante y start reanuda desde ahí", () => {
    const { result } = renderHook(() => useHalfTimer(10));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    act(() => result.current.pause());
    const congelado = result.current.remainingSeconds;
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.remainingSeconds).toBe(congelado);

    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingSeconds).toBe(congelado - 10);
  });

  it("nunca baja de 0", () => {
    const { result } = renderHook(() => useHalfTimer(1));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(result.current.remainingSeconds).toBe(0);
  });

  it("dispara onThreshold una sola vez al cruzar el umbral y se rearma con reset", () => {
    const onThreshold = vi.fn();
    const { result } = renderHook(() =>
      useHalfTimer(3, { thresholdSeconds: 120, onThreshold }),
    );
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(onThreshold).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(onThreshold).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(onThreshold).toHaveBeenCalledTimes(1);

    act(() => result.current.reset());
    expect(result.current.remainingSeconds).toBe(3 * 60);
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(onThreshold).toHaveBeenCalledTimes(2);
  });

  it("toggle alterna entre start y pause", () => {
    const { result } = renderHook(() => useHalfTimer(5));
    act(() => result.current.toggle());
    expect(result.current.running).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.running).toBe(false);
  });
});

describe("useScreenLock (bloqueo de pantalla, HU-2.3)", () => {
  it("se bloquea solo tras el tiempo de inactividad", () => {
    const { result } = renderHook(() => useScreenLock(60_000));
    expect(result.current.locked).toBe(false);
    act(() => {
      vi.advanceTimersByTime(59_999);
    });
    expect(result.current.locked).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.locked).toBe(true);
  });

  it("un toque en pantalla reinicia el temporizador", () => {
    const { result } = renderHook(() => useScreenLock(60_000));
    act(() => {
      vi.advanceTimersByTime(50_000);
    });
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    act(() => {
      vi.advanceTimersByTime(50_000);
    });
    expect(result.current.locked).toBe(false);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.locked).toBe(true);
  });

  it("lock() bloquea al instante y unlock() vuelve a armar el temporizador", () => {
    const { result } = renderHook(() => useScreenLock(60_000));
    act(() => result.current.lock());
    expect(result.current.locked).toBe(true);
    act(() => result.current.unlock());
    expect(result.current.locked).toBe(false);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.locked).toBe(true);
  });

  it("disabled frena el bloqueo por inactividad pero no el manual", () => {
    const { result, rerender } = renderHook(
      ({ disabled }) => useScreenLock(60_000, { disabled }),
      { initialProps: { disabled: true } },
    );
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current.locked).toBe(false);
    act(() => result.current.lock());
    expect(result.current.locked).toBe(true);

    // Al cerrar el modal (disabled=false) tras desbloquear, vuelve a contar.
    act(() => result.current.unlock());
    rerender({ disabled: false });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.locked).toBe(true);
  });
});

describe("useHaptics", () => {
  it("vibra con el patrón dado cuando el dispositivo lo soporta", () => {
    const vibrate = vi.fn();
    Object.defineProperty(window.navigator, "vibrate", { value: vibrate, configurable: true });
    const { result } = renderHook(() => useHaptics());
    result.current([30, 50]);
    expect(vibrate).toHaveBeenCalledWith([30, 50]);
    result.current();
    expect(vibrate).toHaveBeenLastCalledWith(50);
  });

  it("no falla si navigator.vibrate no existe", () => {
    Object.defineProperty(window.navigator, "vibrate", { value: undefined, configurable: true });
    const { result } = renderHook(() => useHaptics());
    expect(() => result.current()).not.toThrow();
  });
});
