"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { destinoTrasLogin } from "@/lib/destino-login";
import type { Rol } from "@/lib/session";

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
        return;
      }
      router.push(destinoTrasLogin(next, data.usuario?.rol));
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-8 flex flex-col gap-5"
    >
      <div>
        <h1 className="text-2xl font-black tracking-tight">Pañuelo sin efecto</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
          className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>

      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1.5 border-t border-slate-200 dark:border-zinc-800 pt-4">
        <p>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Árbitro:</span> usa el correo y
          la contraseña que te dio el administrador de tu liga. Verás tus partidos asignados.
        </p>
        <p>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Administrador:</span> entras al
          panel para cargar ligas, equipos, jugadores, árbitros y partidos.
        </p>
        <Link href="/" className="font-semibold hover:underline mt-1">
          ← Ver marcadores públicos
        </Link>
      </div>
    </form>
  );
}
