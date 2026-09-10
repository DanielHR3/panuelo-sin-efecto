"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <span className="text-5xl">⚠️</span>
      <h2 className="text-xl font-black">Algo salió mal</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md">{error.message}</p>
      <button
        onClick={reset}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
      >
        Reintentar
      </button>
    </div>
  );
}
