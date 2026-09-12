"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export type ActionState = { error?: string } | undefined;

/**
 * Envuelve un <form> ligado a una Server Action, muestra el error que
 * devuelva (en vez de dejar que Next lo escale a error.tsx) y limpia el
 * formulario tras un envío exitoso.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400 mt-2">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Botón de submit que se deshabilita y cambia de texto mientras la acción corre. */
export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
