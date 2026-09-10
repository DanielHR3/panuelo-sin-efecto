// Service worker de "app shell": cachea en tiempo de ejecución (no hay un
// manifiesto de build-time) las páginas y assets del mismo origen que el
// árbitro ya visitó, para que reabrir la app sin conexión no se quede en
// blanco. No cachea /api/** (datos dinámicos/autenticados) ni las
// peticiones internas de Next (RSC, prefetch) para no servir fragmentos
// a medias.
//
// La resiliencia real ante pérdida de conexión (poder seguir anotando)
// vive en el cliente: ver src/lib/offline-queue.ts.

const CACHE_NAME = "panuelo-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (request.headers.get("RSC") || request.headers.get("Next-Router-Prefetch")) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error("Sin conexión y sin copia en caché para esta ruta");
      }
    }),
  );
});
