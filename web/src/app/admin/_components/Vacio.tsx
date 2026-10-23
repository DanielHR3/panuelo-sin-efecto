import type { ReactNode } from "react";
import { Icono, type NombreIcono } from "@/components/icons/Icono";

/** Estado vacío de una sección del panel: ícono grande, mensaje y detalle opcional. */
export function Vacio({ icono, texto, children }: { icono: NombreIcono; texto: string; children?: ReactNode }) {
  return (
    <div className="panel p-8 py-14 flex flex-col items-center justify-center text-center">
      <Icono nombre={icono} className="text-5xl mb-4 text-suave" />
      <p className="text-lg font-semibold">{texto}</p>
      {children && <p className="text-sm text-suave mt-1 max-w-xs">{children}</p>}
    </div>
  );
}
