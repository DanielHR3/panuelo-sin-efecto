import { formatearFecha } from "@/lib/zona";

export function fechaCorta(iso: string): string {
  return formatearFecha(iso, { weekday: "short", day: "numeric", month: "short" });
}

export function fechaHora(iso: string): string {
  return formatearFecha(iso, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
