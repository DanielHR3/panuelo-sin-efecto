/**
 * Prepara el cuerpo de una petición para guardarlo en la bitácora: quita
 * contraseñas, tokens, datos bancarios y archivos, y recorta lo largo para
 * que una sincronización grande no llene la tabla.
 */
const CLAVES_SENSIBLES = /pass|token|secret|clabe|archivo|comprobante/i;
const MAX_TEXTO = 200;
const MAX_LISTA = 20;
const MAX_PROFUNDIDAD = 4;

export function depurar(valor: unknown, profundidad = 0): unknown {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor === 'string') {
    return valor.length > MAX_TEXTO ? `${valor.slice(0, MAX_TEXTO)}…` : valor;
  }
  if (typeof valor === 'number' || typeof valor === 'boolean') return valor;
  if (profundidad >= MAX_PROFUNDIDAD) return '[…]';
  if (Array.isArray(valor)) {
    const recortada = valor
      .slice(0, MAX_LISTA)
      .map((v) => depurar(v, profundidad + 1));
    if (valor.length > MAX_LISTA) {
      recortada.push(`[… ${valor.length - MAX_LISTA} más]`);
    }
    return recortada;
  }
  if (typeof valor === 'object') {
    if (Buffer.isBuffer(valor)) return '[archivo]';
    const salida: Record<string, unknown> = {};
    for (const [clave, v] of Object.entries(valor)) {
      salida[clave] = CLAVES_SENSIBLES.test(clave)
        ? '[oculto]'
        : depurar(v, profundidad + 1);
    }
    return salida;
  }
  return undefined;
}
