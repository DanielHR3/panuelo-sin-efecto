import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const ACCIONES_RESOLUCION = [
  'DESCARTAR_A',
  'DESCARTAR_B',
  'MANTENER_AMBOS',
] as const;
export type AccionResolucion = (typeof ACCIONES_RESOLUCION)[number];

export class ResolverDiscrepanciaDto {
  @ApiProperty({
    enum: ACCIONES_RESOLUCION,
    description:
      'DESCARTAR_A/B excluye ese evento del marcador y recalcula. MANTENER_AMBOS cierra la discrepancia sin tocar nada (falso positivo).',
  })
  @IsIn(ACCIONES_RESOLUCION, {
    message: `accion debe ser una de: ${ACCIONES_RESOLUCION.join(', ')}`,
  })
  accion: AccionResolucion;
}
