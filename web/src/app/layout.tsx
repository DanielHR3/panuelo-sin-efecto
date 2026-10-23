import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "./sw-register";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Pañuelo sin efecto",
  description: "App de Arbitraje Inteligente",
  // El manifest lo sirve app/manifest.ts (file convention de Next):
  // se enlaza solo, no hace falta declararlo aquí.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // iOS no lee el manifest para el ícono de pantalla de inicio: usa esta
    // etiqueta. Sin transparencia ni esquinas: iOS aplica su propia máscara.
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Pañuelo",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Fundamental para evitar zoom accidental al tocar botones rápido
  themeColor: "#0A1A33",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: next-themes fija la clase "dark" antes de
    // hidratar (inline script) para no forzar el modo oscuro ni parpadear.
    <html lang="es" suppressHydrationWarning>
      <body className={`${barlow.variable} ${barlowCondensed.variable} antialiased min-h-screen flex flex-col`}>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
