import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Hace idempotente el intercambio: el cliente dice qué equipo ve hoy como
 * local. Si ya no coincide (un reintento tras un arranque en frío, otro
 * dispositivo), el servidor no vuelve a intercambiar.
 */
export class IntercambiarEquiposDto {
  @ApiPropertyOptional({
    example: 'Toros',
    description:
      'Nombre del equipo que el cliente muestra como local (el estado que quiere invertir). Si no coincide con el local actual, no se intercambia y se devuelve aplicado:false. Sin este campo se intercambia siempre.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  localEsperado?: string;
}
