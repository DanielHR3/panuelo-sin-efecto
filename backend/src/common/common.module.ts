import { Global, Module } from '@nestjs/common';
import { OwnershipService } from './ownership.service';
import { PlanService } from '../suscripciones/plan.service';

/**
 * Utilidades transversales disponibles en toda la app sin re-importar.
 * PrismaModule ya es @Global, así que OwnershipService puede inyectar
 * PrismaService directamente.
 */
@Global()
@Module({
  providers: [OwnershipService, PlanService],
  exports: [OwnershipService, PlanService],
})
export class CommonModule {}
