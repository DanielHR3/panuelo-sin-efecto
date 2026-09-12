import Link from "next/link";
import { EncabezadoPublico } from "../_publico/EncabezadoPublico";
import { ArbitrarForm } from "./ArbitrarForm";

export default function ArbitrarPage() {
  return (
    <div className="flex-1 flex flex-col">
      <EncabezadoPublico />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        <header className="flex flex-col gap-2 max-w-md">
          <h1 className="font-black text-3xl sm:text-4xl tracking-tight leading-tight">
            Arbitra un partido ahora
          </h1>
          <p className="opacity-70">
            Escribe los dos equipos y listo. Sin cuenta ni contraseña: el marcador queda en este
            teléfono y, si vuelves a entrar desde aquí, encontrarás tus partidos anteriores.
          </p>
        </header>
        <ArbitrarForm />
        <p className="text-sm opacity-70 max-w-md">
          ¿Tu liga ya está registrada?{" "}
          <Link href="/login" className="font-semibold hover:underline">
            Entra con tus credenciales
          </Link>{" "}
          para ver los partidos que te asignaron.
        </p>
      </main>
    </div>
  );
}
