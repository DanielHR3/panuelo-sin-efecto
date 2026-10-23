import type { Metadata } from "next";
import RegistroForm from "./RegistroForm";

export const metadata: Metadata = {
  title: "Registra tu liga · Pañuelo sin efecto",
  description: "Crea tu liga de tocho y úsala gratis un mes: marcador en vivo, tabla y estadísticas.",
};

export default function RegistroPage() {
  return (
    <main className="min-h-screen flex items-start sm:items-center justify-center p-4 py-8 bg-fondo">
      <RegistroForm />
    </main>
  );
}
