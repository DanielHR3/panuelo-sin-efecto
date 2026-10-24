import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPublico } from "../_publico/EncabezadoPublico";

export const metadata: Metadata = {
  title: "Cómo funciona · Pañuelo sin efecto",
  description: "Video de 45 segundos: registra tu liga, sube tu Excel, arbitra desde el celular y comparte resultados.",
};

export default function ComoFuncionaPage() {
  return (
    <div className="flex-1 flex flex-col">
      <EncabezadoPublico />
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 flex flex-col gap-5">
        <h1 className="titulo-estadio text-4xl leading-none">Cómo funciona</h1>
        {/* Vertical 9:16, hecho para verse en el celular. Con subtítulos en español. */}
        <video
          controls
          playsInline
          preload="metadata"
          poster="/video/como-funciona.jpg"
          className="w-full aspect-[9/16] rounded-xl bg-panel"
        >
          <source src="/video/como-funciona.mp4" type="video/mp4" />
          <track kind="captions" src="/video/como-funciona.vtt" srcLang="es" label="Español" default />
          Tu navegador no puede reproducir el video.
        </video>
        <Link href="/registro" className="boton-panuelo px-5 py-3 min-h-12 text-lg text-center">
          Registra tu liga · 1 mes gratis
        </Link>
        <Link href="/" className="text-sm font-semibold text-suave underline text-center">
          Volver al inicio
        </Link>
      </main>
    </div>
  );
}
