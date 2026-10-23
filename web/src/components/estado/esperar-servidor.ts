/**
 * Espera a que la API despierte (Render free tarda ~50 s tras dormirse).
 *
 * Hace un GET a la URL de salud; si falla, lo repite cada `cadaMs`. Cada
 * petición se aborta a los `timeoutMs` (Render deja la conexión colgada
 * mientras arranca) o al llegar al límite total, lo que pase antes. Al primer
 * OK llama `onListo`; pasados `limiteMs` sin respuesta, `onAgotado`.
 *
 * Sin React a propósito: se prueba con temporizadores falsos y un fetch
 * simulado.
 */
export type EsperarServidorOpciones = {
  url: string;
  cadaMs: number;
  timeoutMs: number;
  limiteMs: number;
  onIntento: (n: number) => void;
  onListo: () => void;
  onAgotado: () => void;
  fetch?: typeof fetch;
};

export type ControlEspera = {
  /** Corta el intento en curso y pide de nuevo ya (botón "Reintentar ahora"). */
  reintentarAhora: () => void;
  /** Detiene todo sin avisar (desmontaje). */
  cancelar: () => void;
};

export function esperarServidor(op: EsperarServidorOpciones): ControlEspera {
  const pedir = op.fetch ?? fetch;
  const inicio = Date.now();
  let intentos = 0;
  let terminado = false;
  let espera: ReturnType<typeof setTimeout> | undefined;
  let enCurso: AbortController | undefined;

  const restante = () => op.limiteMs - (Date.now() - inicio);

  const terminar = (aviso: () => void) => {
    if (terminado) return;
    terminado = true;
    clearTimeout(espera);
    aviso();
  };

  const intentar = async () => {
    if (terminado) return;
    clearTimeout(espera);
    enCurso?.abort();
    const controller = new AbortController();
    enCurso = controller;
    intentos += 1;
    op.onIntento(intentos);

    const corte = setTimeout(
      () => controller.abort(),
      Math.max(0, Math.min(op.timeoutMs, restante())),
    );
    let listo = false;
    try {
      const res = await pedir(op.url, { cache: "no-store", signal: controller.signal });
      listo = res.ok;
    } catch {
      // Red caída, CORS de un proxy intermedio o aborto: se reintenta.
    } finally {
      clearTimeout(corte);
    }

    // Un "Reintentar ahora" pudo reemplazar este intento mientras esperaba.
    if (terminado || enCurso !== controller) return;
    enCurso = undefined;
    if (listo) return terminar(op.onListo);
    if (restante() <= 0) return terminar(op.onAgotado);
    espera = setTimeout(() => void intentar(), Math.min(op.cadaMs, restante()));
  };

  void intentar();

  return {
    reintentarAhora: () => void intentar(),
    cancelar: () => {
      terminado = true;
      clearTimeout(espera);
      enCurso?.abort();
    },
  };
}

/** Ventana en la que un nuevo error se considera el mismo fallo, no un sueño. */
export const VENTANA_REINTENTO_MS = 15_000;

/**
 * Tras despertar la API se reintenta la página. Si vuelve a fallar enseguida,
 * el error es real (no era el servidor dormido) y hay que mostrarlo en vez de
 * esperar otra vez, o el ciclo esperar → reintentar → fallar no acabaría.
 */
export function reintentoRecienteFallido(ahora: number, ultimoReintento: number | null): boolean {
  return ultimoReintento !== null && ahora - ultimoReintento < VENTANA_REINTENTO_MS;
}

/**
 * Tope de reintentos automáticos por sesión de pestaña: si un fallo real
 * tarda más que la ventana en aparecer, el ciclo esperar → reintentar →
 * fallar se cortaría solo por tiempo y podría repetirse sin fin.
 */
export const MAX_REINTENTOS_AUTO = 3;

/** ¿El boundary debe mostrar el error en vez de esperar otra vez a la API? */
export function debeMostrarError(estado: {
  ahora: number;
  ultimoReintento: number | null;
  reintentosAuto: number;
}): boolean {
  return (
    reintentoRecienteFallido(estado.ahora, estado.ultimoReintento) ||
    estado.reintentosAuto >= MAX_REINTENTOS_AUTO
  );
}
