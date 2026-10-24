import type { Metadata } from "next";
import { EncabezadoPublico } from "../_publico/EncabezadoPublico";
import { ResumenIfaf } from "./ResumenIfaf";

export const metadata: Metadata = {
  title: "Reglamento de Flag Football · Pañuelo sin efecto",
  description: "Resumen de las reglas clave de IFAF para flag football 5 vs 5.",
};

export default function ReglamentoPage() {
  return (
    <div className="flex-1 flex flex-col">
      <EncabezadoPublico />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        <h1 className="titulo-estadio text-4xl sm:text-5xl leading-none">Reglamento</h1>
        <ResumenIfaf />
      </main>
    </div>
  );
}
