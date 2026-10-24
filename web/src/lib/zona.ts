/**
 * Zona horaria de la app. Las páginas se renderizan en el servidor de Vercel
 * (UTC): sin fijarla, todos los horarios salían 6 horas adelantados y los
 * partidos programados se guardaban 6 horas antes.
 */
export const ZONA = "America/Mexico_City";

/** La CDMX no cambia de horario desde 2022: siempre UTC-6. */
const DESFASE = "-06:00";

export function formatearFecha(iso: string, opciones: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleString("es-MX", { ...opciones, timeZone: ZONA });
}

/** Valor de `<input type="datetime-local">` ("2026-11-01T10:00") en hora de México → ISO UTC. */
export function fechaLocalAISO(valor: string): string {
  const conSegundos = /T\d{2}:\d{2}$/.test(valor) ? `${valor}:00` : valor;
  const fecha = new Date(`${conSegundos}${DESFASE}`);
  if (Number.isNaN(fecha.getTime())) throw new Error(`Fecha inválida: ${valor}`);
  return fecha.toISOString();
}
