"use client";

import { useActionState, type ReactNode } from "react";
import { ActionState, SubmitButton } from "./ActionForm";
import { BOTON_PELIGRO } from "./estilos";

/**
 * Botón de borrado ligado a una Server Action ya "bindeada" con el id del
 * recurso, p. ej.: <DeleteButton action={eliminarLiga.bind(null, liga.id)} />
 */
export function DeleteButton({
  action,
  label = "Eliminar",
  confirmMessage,
  ariaLabel,
  className = `${BOTON_PELIGRO} px-2.5 py-1 text-xs`,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  /** Texto o ícono del botón; si es solo ícono, pasa `ariaLabel`. */
  label?: ReactNode;
  ariaLabel?: string;
  confirmMessage?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
      className="inline-flex flex-col items-end"
    >
      <SubmitButton
        className={className}
        // Un botón de solo ícono no tiene espacio para "Eliminando…".
        pendingLabel={typeof label === "string" ? "Eliminando…" : "…"}
        ariaLabel={ariaLabel}
      >
        {label}
      </SubmitButton>
      {state?.error && (
        <p role="alert" className="text-xs font-semibold text-peligro mt-1 text-right">
          {state.error}
        </p>
      )}
    </form>
  );
}
