/**
 * Cabeceras de seguridad que Vercel manda con cada respuesta de la web
 * (las aplica `headers()` en next.config.ts). Sin CSP por ahora: Next mete
 * scripts inline y una CSP útil necesita nonces; con 'unsafe-inline' no
 * protege de nada. `frame-ancestors` sí va, porque ahí no estorba.
 */
export const CABECERAS_SEGURIDAD: { key: string; value: string }[] = [
  // Nadie puede meter el panel ni el marcador dentro de un iframe ajeno
  // (clickjacking). Las dos cabeceras dicen lo mismo: la segunda para
  // navegadores viejos.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  // El navegador no adivina tipos MIME (evita ejecutar como script algo
  // servido como texto).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Al salir a otro sitio solo viaja el origen, no la ruta (los enlaces
  // de resultado llevan ids de partido).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La app no usa cámara, micrófono ni ubicación; que ningún script
  // incrustado pueda pedirlos.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
