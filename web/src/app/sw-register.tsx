"use client";

import { useEffect } from "react";

/**
 * Registra el service worker (public/sw.js) tras el primer render. Silencia
 * cualquier error: en navegadores sin soporte o en desarrollo con HTTP la
 * PWA simplemente no cachea nada, pero el resto de la app sigue funcionando.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // sin service worker no hay caché de app shell, pero la app sigue funcionando online
    });
  }, []);
  return null;
}
