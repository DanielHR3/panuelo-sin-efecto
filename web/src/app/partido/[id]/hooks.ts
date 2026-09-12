import { useCallback, useEffect, useRef, useState } from "react";

export function useHaptics() {
  return useCallback((pattern: number | number[] = 50) => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(pattern);
    }
  }, []);
}

/** Beep con Web Audio (sin archivos externos) para que funcione también sin conexión. */
export function playBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Web Audio no disponible en este dispositivo; el aviso visual/háptico sigue funcionando.
  }
}

/**
 * Cronómetro de mitad basado en timestamps reales, no en sumar +1 por cada
 * tick de setInterval — así no acumula drift si el navegador throttlea el
 * timer (pestaña en segundo plano, ahorro de batería, etc.).
 *
 * `Date.now()` solo se llama dentro del efecto/los manejadores de evento
 * (nunca durante el render, que debe ser puro): el "ahora" vigente vive en
 * `nowMs`, actualizado por el intervalo mientras corre.
 *
 * `onThreshold` se invoca una sola vez por arranque al cruzar
 * `thresholdSeconds` restantes (p. ej. el aviso de los 2 minutos); se
 * rearma con reset(). Se dispara desde el propio tick del intervalo, no
 * desde un efecto que reacciona al render, para no violar las reglas de
 * pureza de React.
 */
export function useHalfTimer(
  initialMinutes: number,
  options?: { thresholdSeconds?: number; onThreshold?: () => void },
) {
  const [totalMinutes, setTotalMinutes] = useState(initialMinutes);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const firedRef = useRef(false);
  const onThresholdRef = useRef(options?.onThreshold);
  useEffect(() => {
    onThresholdRef.current = options?.onThreshold;
  }, [options?.onThreshold]);

  const totalMs = totalMinutes * 60_000;
  const thresholdMs = (options?.thresholdSeconds ?? 0) * 1000;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      if (!firedRef.current && startedAt !== null) {
        const remaining = totalMs - (elapsedMs + (now - startedAt));
        if (remaining <= thresholdMs) {
          firedRef.current = true;
          onThresholdRef.current?.();
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, startedAt, elapsedMs, totalMs, thresholdMs]);

  const currentElapsedMs =
    running && startedAt !== null && nowMs !== null
      ? elapsedMs + (nowMs - startedAt)
      : elapsedMs;

  const start = useCallback(() => {
    if (running) return;
    const now = Date.now();
    setStartedAt(now);
    setNowMs(now);
    setRunning(true);
  }, [running]);

  const pause = useCallback(() => {
    if (!running) return;
    setElapsedMs(currentElapsedMs);
    setStartedAt(null);
    setRunning(false);
  }, [running, currentElapsedMs]);

  const reset = useCallback(() => {
    setElapsedMs(0);
    const now = running ? Date.now() : null;
    setStartedAt(now);
    setNowMs(now);
    firedRef.current = false;
  }, [running]);

  const remainingSeconds = Math.max(0, Math.ceil((totalMs - currentElapsedMs) / 1000));

  return {
    running,
    remainingSeconds,
    totalMinutes,
    setTotalMinutes,
    start,
    pause,
    reset,
    toggle: running ? pause : start,
  };
}

/**
 * Bloqueo de pantalla del árbitro (HU-2.3): evita toques accidentales en el
 * marcador cuando el teléfono va en el bolsillo o se deja sobre la mesa.
 *
 * Se dispara por inactividad (ningún `pointerdown` en toda la pantalla
 * durante `timeoutMs`) o manualmente vía `lock()`. `disabled` frena el
 * temporizador de inactividad —no el bloqueo manual— mientras hay un flujo
 * a mitad de paso (el modal de selección de jugador abierto): bloquear ahí
 * dejaría al árbitro atascado sin poder ni terminar ni cancelar la acción.
 *
 * El propio bloqueo cuenta como "sin actividad": una vez `locked`, dejamos
 * de escuchar `pointerdown` para no reiniciar un timeout que ya no importa
 * (el overlay de desbloqueo tiene su propio gesto, ver `LockOverlay`).
 */
export function useScreenLock(timeoutMs: number, options?: { disabled?: boolean }) {
  const [locked, setLocked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disabled = options?.disabled ?? false;

  const lock = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLocked(true);
  }, []);

  const unlock = useCallback(() => setLocked(false), []);

  useEffect(() => {
    if (locked || disabled) return;
    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setLocked(true), timeoutMs);
    };
    resetTimer();
    window.addEventListener("pointerdown", resetTimer);
    return () => {
      window.removeEventListener("pointerdown", resetTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [locked, disabled, timeoutMs]);

  return { locked, lock, unlock };
}
