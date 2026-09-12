import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "./sw-register";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pañuelo sin efecto",
  description: "App de Arbitraje Inteligente",
  // El manifest lo sirve app/manifest.ts (file convention de Next):
  // se enlaza solo, no hace falta declararlo aquí.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Fundamental para evitar zoom accidental al tocar botones rápido
  themeColor: "#09090b",
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
      <body className={`${outfit.variable} antialiased min-h-screen flex flex-col`}>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
