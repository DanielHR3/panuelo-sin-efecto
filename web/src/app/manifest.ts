import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pañuelo sin efecto",
    short_name: "Pañuelo",
    description: "App de arbitraje para flag football: marcador en vivo con Caja Negra de eventos.",
    start_url: "/",
    display: "standalone",
    background_color: "#052e16",
    theme_color: "#09090b",
    orientation: "portrait",
    // PNG primero: iOS ignora los SVG al instalar en pantalla de inicio y
    // Android exige PNG para el ícono "maskable" (recorte adaptativo).
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
