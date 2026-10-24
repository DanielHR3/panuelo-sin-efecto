import Link from "next/link";
import { authedFetch } from "@/lib/server-api";
import type { Liga } from "@/lib/types";
import { Vacio } from "../_components/Vacio";
import { TITULO_PAGINA } from "../_components/estilos";
import { ImportarForm } from "./ImportarForm";

export default async function ImportarPage() {
  // GET /ligas ya viene acotada a las ligas del usuario; las RAPIDA no se importan.
  const ligas = (await authedFetch<Liga[]>("/ligas")).filter((l) => l.tipo !== "RAPIDA");

  return (
    <div className="space-y-6">
      <header>
        <h1 className={TITULO_PAGINA}>Importar desde Excel</h1>
        <p className="text-suave mt-2">
          Sube tus equipos, jugadores y calendario de una vez. Primero verás qué se va a crear;
          nada se guarda hasta que confirmes.
        </p>
      </header>

      {ligas.length === 0 ? (
        <Vacio icono="tabla" texto="Primero crea una liga.">
          <Link href="/admin/ligas" className="font-semibold underline">
            Crear liga
          </Link>
        </Vacio>
      ) : (
        <ImportarForm ligas={ligas.map((l) => ({ id: l.id, nombre: l.nombre }))} />
      )}
    </div>
  );
}
