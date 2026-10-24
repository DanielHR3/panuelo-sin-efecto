import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { leerLibro, normalizar } from './leer-libro';
import { planificarImportacion, type PlanImportacion } from './planificar';

export interface ResultadoImportacion {
  resumen: PlanImportacion['resumen'];
  errores: PlanImportacion['errores'];
  aplicado: boolean;
}

/**
 * Importa equipos, jugadores y calendario de una liga desde un .xlsx en dos
 * pasos: sin `confirmar` devuelve la vista previa; con `confirmar` y sin
 * errores lo crea todo en una sola transacción (todo o nada).
 */
@Injectable()
export class ImportacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async importar(
    ligaId: string,
    archivo: Buffer,
    confirmar: boolean,
    user: AuthUser,
  ): Promise<ResultadoImportacion> {
    await this.ownership.assertCanManageLiga(ligaId, user);

    const libro = await leerLibro(archivo);
    const existentes = await this.prisma.categoria.findMany({
      where: { ligaId },
      select: {
        id: true,
        nombre: true,
        equipos: {
          select: {
            id: true,
            nombre: true,
            jugadores: {
              select: { id: true, numeroJersey: true, nombre: true },
            },
          },
        },
        partidos: {
          select: {
            fechaHora: true,
            equipoLocalId: true,
            equipoVisitanteId: true,
          },
        },
      },
    });
    const plan = planificarImportacion(libro, existentes);
    const respuesta = { resumen: plan.resumen, errores: plan.errores };
    if (!confirmar || plan.errores.length > 0)
      return { ...respuesta, aplicado: false };

    await this.prisma.$transaction(
      async (tx) => {
        for (const cat of plan.categorias) {
          const categoriaId =
            cat.id ??
            (
              await tx.categoria.create({
                data: { nombre: cat.nombre, ligaId },
                select: { id: true },
              })
            ).id;

          const ids = new Map<string, string>();
          for (const eq of cat.equipos) {
            const equipoId =
              eq.id ??
              (
                await tx.equipo.create({
                  data: {
                    nombre: eq.nombre,
                    colorPrimario: eq.color,
                    categoriaId,
                  },
                  select: { id: true },
                })
              ).id;
            ids.set(normalizar(eq.nombre), equipoId);
            if (eq.jugadoresNuevos.length > 0) {
              await tx.jugador.createMany({
                data: eq.jugadoresNuevos.map((j) => ({
                  nombre: j.nombre,
                  numeroJersey: j.numero,
                  equipoId,
                })),
              });
            }
            for (const j of eq.jugadoresActualizados) {
              await tx.jugador.update({
                where: { id: j.id },
                data: { nombre: j.nombre },
              });
            }
          }

          if (cat.partidosNuevos.length > 0) {
            await tx.partido.createMany({
              data: cat.partidosNuevos.map((p) => ({
                categoriaId,
                fechaHora: p.fechaHora,
                equipoLocalId: ids.get(normalizar(p.local))!,
                equipoVisitanteId: ids.get(normalizar(p.visitante))!,
                estado: 'PROGRAMADO',
                dificultad: 'REGULAR',
              })),
            });
          }
        }
      },
      // Cientos de filas contra Neon desde Render: más que el límite de 5 s.
      { timeout: 60_000 },
    );
    return { ...respuesta, aplicado: true };
  }
}
