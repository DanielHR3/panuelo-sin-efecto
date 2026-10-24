"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { destinoTrasLogin } from "@/lib/destino-login";
import type { Rol } from "@/lib/session";
import { Marca } from "../_publico/Marca";

const INPUT =
  "p-3 rounded-lg border-2 border-texto/20 bg-fondo text-texto font-normal focus:outline-none focus:border-panuelo-texto";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { message?: string; usuario?: { rol?: Rol } };
      if (!res.ok) {
        setError(data.message ?? "No se pudo iniciar sesión");
        setLoading(false);
        return;
      }
      // Sin router.refresh(): refrescaba /login y cancelaba la navegación
      // cuando el panel tardaba (API dormida); el botón volvía a "Entrar" sin
      // haber entrado. El botón sigue en "Entrando…" hasta que cambia la página.
      router.push(destinoTrasLogin(next, data.usuario?.rol));
    } catch {
      setError("No se pudo conectar con el servidor");
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="panel w-full max-w-sm p-8 flex flex-col gap-5"
    >
      <div className="flex flex-col gap-3">
        <h1>
          <Marca tamano={44} />
        </h1>
        <p className="text-sm text-suave">
          Árbitros y administradores de liga entran por aquí.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Contraseña
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="boton-panuelo text-lg px-5 py-3 disabled:opacity-50 transition-transform active:scale-95"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>

      <div className="text-xs text-suave flex flex-col gap-1.5 border-t border-texto/10 pt-4">
        <p>
          <span className="font-semibold text-texto">Árbitro:</span> usa el correo y
          la contraseña que te dio el administrador de tu liga. Verás tus partidos asignados.{" "}
          <Link href="/arbitrar" className="font-semibold text-panuelo-texto hover:underline">
            ¿Sin cuenta? Arbitra un partido sin registrarte.
          </Link>
        </p>
        <p>
          <span className="font-semibold text-texto">Administrador:</span> entras al
          panel para cargar ligas, equipos, jugadores, árbitros y partidos.{" "}
          <Link href="/registro" className="font-semibold text-panuelo-texto hover:underline">
            ¿Organizas una liga? Regístrala gratis un mes.
          </Link>
        </p>
        <Link href="/" className="font-semibold hover:underline mt-1">
          ← Ver marcadores públicos
        </Link>
      </div>
    </form>
  );
}
