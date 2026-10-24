/** Centavos de MXN → "$2,990" (o "$99.50" si hay centavos). */
export function pesos(centavos: number): string {
  const cerrado = centavos % 100 === 0;
  return `$${(centavos / 100).toLocaleString("es-MX", {
    minimumFractionDigits: cerrado ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
