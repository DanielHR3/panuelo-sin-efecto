import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { TIPOS_EVENTO, type TipoEvento } from '../evento.constants';

export class RegistrarEventoDto {
  @ApiProperty({ enum: TIPOS_EVENTO, example: 'TD' })
  @IsIn(TIPOS_EVENTO, {
    message: `tipoEvento debe ser uno de: ${TIPOS_EVENTO.join(', ')}`,
  })
  tipoEvento: TipoEvento;

  @ApiPropertyOptional({
    description:
      'UUID generado por el dispositivo del árbitro. Reenviar el mismo valor no duplica el evento (idempotencia de la cola offline).',
  })
  @IsOptional()
  @IsUUID('4')
  clientEventId?: string;

  @ApiPropertyOptional({
    description:
      'Equipo que recibe los puntos. Obligatorio en eventos que anotan.',
  })
  @IsOptional()
  @IsUUID('4')
  equipoId?: string;

  @ApiPropertyOptional({ description: 'Jugador implicado (opcional)' })
  @IsOptional()
  @IsUUID('4')
  jugadorId?: string;

  @ApiPropertyOptional({
    description:
      'Momento real del evento (ISO 8601). Útil para eventos encolados offline y sincronizados más tarde. Por defecto, la hora del servidor.',
    example: '2026-09-20T18:32:10.000Z',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
