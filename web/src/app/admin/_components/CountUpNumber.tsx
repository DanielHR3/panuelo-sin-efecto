"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cuenta desde 0 hasta `value`, como un marcador asentándose. Es el único
 * momento animado del dashboard a propósito — todo lo demás queda quieto.
 * Respeta prefers-reduced-motion (muestra el valor final de una).
 */
export function CountUpNumber({
  value,
  delayMs = 0,
  durationMs = 700,
}: {
  value: number;
  delayMs?: number;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame: number;
    const timeout = setTimeout(() => {
      if (reduced) {
        setDisplay(value);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [value, delayMs, durationMs]);

  return <>{display}</>;
}
