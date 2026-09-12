import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import {
  DIFICULTADES,
  ESTADOS_PARTIDO,
  type Dificultad,
  type EstadoPartido,
} from '../partido.constants';

export class UpdatePartidoDto {
  @ApiPropertyOptional({ example: '2026-09-21T19:30:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'fechaHora debe ser una fecha ISO 8601 válida' })
  fechaHora?: string;

  @ApiPropertyOptional({ enum: DIFICULTADES })
  @IsOptional()
  @IsIn(DIFICULTADES)
  dificultad?: Dificultad;

  @ApiPropertyOptional({
    enum: ESTADOS_PARTIDO,
    description: 'Solo avanza (PROGRAMADO → EN_CURSO → FINALIZADO)',
  })
  @IsOptional()
  @IsIn(ESTADOS_PARTIDO)
  estado?: EstadoPartido;
}
