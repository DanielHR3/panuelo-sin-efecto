"use client";

import { useActionState } from "react";
import { ActionState, SubmitButton } from "./ActionForm";

/**
 * Botón de borrado ligado a una Server Action ya "bindeada" con el id del
 * recurso, p. ej.: <DeleteButton action={eliminarLiga.bind(null, liga.id)} />
 */
export function DeleteButton({
  action,
  label = "Eliminar",
  confirmMessage,
  className = "text-red-500 hover:text-red-600 text-xs font-semibold",
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  label?: string;
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
      <SubmitButton className={className} pendingLabel="Eliminando…">
        {label}
      </SubmitButton>
      {state?.error && (
        <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1 text-right">
          {state.error}
        </p>
      )}
    </form>
  );
}
