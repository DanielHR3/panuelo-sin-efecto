"use client";

import { useState } from "react";
import { BOTON_SECUNDARIO } from "../_components/estilos";

/** Copia un dato de pago (CLABE, referencia) para pegarlo en la app del banco. */
export function CopiarTexto({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          // Sin permiso de portapapeles: el dato sigue visible para copiarlo a mano.
        }
      }}
      aria-label={`Copiar ${etiqueta}`}
      className={`${BOTON_SECUNDARIO} px-3 py-2 min-h-11 shrink-0 text-sm`}
    >
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}
