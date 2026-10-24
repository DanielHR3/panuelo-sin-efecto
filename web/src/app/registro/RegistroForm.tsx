"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icono } from "@/components/icons/Icono";
import { Marca } from "../_publico/Marca";

const INPUT =
  "p-3 rounded-lg border-2 border-texto/20 bg-fondo text-texto font-normal focus:outline-none focus:border-panuelo-texto";
const ETIQUETA = "flex flex-col gap-1.5 text-sm font-semibold";

const INCLUYE = [
  "Marcador en vivo desde el celular, aunque no haya señal",
  "Página pública con tabla, resultados y líderes",
  "Tus propios árbitros y el resultado para compartir",
];

export default function RegistroForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const datos = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "No se pudo crear tu cuenta");
        setLoading(false);
        return;
      }
      // Sin router.refresh() (ver LoginForm) y sin reactivar el botón: se
      // queda deshabilitado hasta que cambia la página.
      router.push("/admin");
    } catch {
      setError("No se pudo conectar con el servidor");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="panel w-full max-w-md p-6 sm:p-8 flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link href="/" aria-label="Pañuelo sin efecto, inicio">
          <Marca tamano={44} />
        </Link>
        <h1 className="titulo-estadio text-3xl leading-none">Registra tu liga</h1>
        <p className="text-sm text-suave">
          <span className="font-bold text-panuelo-texto">1 mes gratis</span>, sin tarjeta. Después
          eliges tu plan.
        </p>
        <ul className="flex flex-col gap-1.5 text-sm">
          {INCLUYE.map((t) => (
            <li key={t} className="flex gap-2">
              <Icono nombre="finalizar" className="text-base mt-0.5 shrink-0 text-panuelo-texto" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <label className={ETIQUETA}>
        Tu nombre
        <input name="nombre" required maxLength={100} autoComplete="name" className={INPUT} />
      </label>
      <label className={ETIQUETA}>
        Email
        <input type="email" name="email" required autoComplete="email" className={INPUT} />
      </label>
      <label className={ETIQUETA}>
        Contraseña
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="mínimo 8 caracteres"
          className={INPUT}
        />
      </label>
      <label className={ETIQUETA}>
        Nombre de tu liga
        <input name="nombreLiga" required maxLength={100} placeholder="Liga del Valle" className={INPUT} />
      </label>
      <label className={ETIQUETA}>
        Primera categoría
        <input name="categoria" maxLength={60} defaultValue="Varonil" className={INPUT} />
        <span className="text-xs font-normal text-suave">Después puedes agregar más.</span>
      </label>

      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="boton-panuelo text-lg px-5 py-3 min-h-12 disabled:opacity-50 transition-transform active:scale-95"
      >
        {loading ? "Creando tu liga…" : "Crear mi liga gratis"}
      </button>

      <p className="text-sm text-suave border-t border-texto/10 pt-4">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-panuelo-texto hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
