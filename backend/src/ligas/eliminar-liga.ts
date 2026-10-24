import { Prisma } from '@prisma/client';

export interface ResumenEliminacion {
  liga: string;
  propietario: string;
  categorias: number;
  equipos: number;
  jugadores: number;
  partidos: number;
  eventos: number;
  arbitros: number;
  pagosConfirmados: number;
  cuentaBorrada: boolean;
  motivoCuentaNoBorrada?: string;
}

/**
 * Borra una liga con todo su contenido, de las hojas a la raíz (las FK son
 * RESTRICT). Suscripción, pagos y reglamento se van solos (CASCADE). Los
 * árbitros de la liga se borran si ya no tienen nada en otra parte. Con
 * `borrarCuenta`, también la cuenta del organizador, si no tiene otras ligas;
 * su correo queda en PruebaUsada para que no reciba otro mes gratis.
 * Corre dentro de la transacción que le pasen.
 */
export async function eliminarLigaCompleta(
  tx: Prisma.TransactionClient,
  ligaId: string,
  opciones: { borrarCuenta: boolean },
): Promise<ResumenEliminacion> {
  const liga = await tx.liga.findUniqueOrThrow({
    where: { id: ligaId },
    select: {
      nombre: true,
      propietario: { select: { id: true, email: true, rol: true } },
      suscripcion: { select: { pruebaHasta: true } },
    },
  });
  // El mes gratis es uno por organizador: si esta liga lo usó, su correo lo
  // recuerda aunque la liga (o su cuenta) desaparezca.
  if (liga.suscripcion?.pruebaHasta) {
    await tx.pruebaUsada.upsert({
      where: { email: liga.propietario.email },
      update: {},
      create: { email: liga.propietario.email },
    });
  }
  const deLaLiga = { categoria: { ligaId } };
  const partidosDeLaLiga = { partido: deLaLiga };

  const pagosConfirmados = await tx.pago.count({
    where: { ligaId, estado: 'CONFIRMADO' },
  });
  await tx.discrepanciaEvento.deleteMany({ where: partidosDeLaLiga });
  const eventos = await tx.eventoPartido.deleteMany({
    where: partidosDeLaLiga,
  });
  await tx.asignacionArbitral.deleteMany({ where: partidosDeLaLiga });
  const partidos = await tx.partido.deleteMany({ where: deLaLiga });
  const jugadores = await tx.jugador.deleteMany({
    where: { equipo: deLaLiga },
  });
  const equipos = await tx.equipo.deleteMany({ where: deLaLiga });
  const categorias = await tx.categoria.deleteMany({ where: { ligaId } });
  const arbitros = await tx.usuario.deleteMany({
    where: {
      ligaArbitroId: ligaId,
      rol: 'ARBITRO',
      asignaciones: { none: {} },
      eventosRegistrados: { none: {} },
    },
  });
  await tx.liga.delete({ where: { id: ligaId } });

  const resumen: ResumenEliminacion = {
    liga: liga.nombre,
    propietario: liga.propietario.email,
    categorias: categorias.count,
    equipos: equipos.count,
    jugadores: jugadores.count,
    partidos: partidos.count,
    eventos: eventos.count,
    arbitros: arbitros.count,
    pagosConfirmados,
    cuentaBorrada: false,
  };
  if (!opciones.borrarCuenta) return resumen;

  const dueno = liga.propietario;
  const motivo =
    dueno.rol !== 'LIGA_ADMIN'
      ? 'Solo se borran cuentas de organizador'
      : (await tx.liga.count({ where: { propietarioId: dueno.id } })) > 0
        ? 'Tiene otras ligas'
        : (await tx.eventoPartido.count({ where: { arbitroId: dueno.id } })) > 0
          ? 'Anotó partidos de otras ligas'
          : null;
  if (motivo) return { ...resumen, motivoCuentaNoBorrada: motivo };

  await tx.asignacionArbitral.deleteMany({ where: { arbitroId: dueno.id } });
  await tx.usuario.delete({ where: { id: dueno.id } });
  return { ...resumen, cuentaBorrada: true };
}
