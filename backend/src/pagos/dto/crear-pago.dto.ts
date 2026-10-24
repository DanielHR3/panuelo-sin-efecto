import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  PERIODOS,
  PLANES_PAGADOS,
  type Periodo,
  type PlanPagado,
} from '../../suscripciones/cobro';

export class CrearPagoDto {
  @ApiProperty({ enum: PLANES_PAGADOS, example: 'COMPLETO' })
  @IsIn(PLANES_PAGADOS, { message: 'Elige el plan Arbitraje o Completo' })
  plan: PlanPagado;

  @ApiProperty({ enum: PERIODOS, example: 'MENSUAL' })
  @IsIn(PERIODOS, { message: 'Elige pago mensual o anual' })
  periodo: Periodo;
}
