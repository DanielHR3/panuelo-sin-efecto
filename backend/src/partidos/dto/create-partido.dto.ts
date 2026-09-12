import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsUUID } from 'class-validator';
import { DIFICULTADES, type Dificultad } from '../partido.constants';

export class CreatePartidoDto {
  @ApiProperty({ example: '2026-09-20T18:00:00.000Z' })
  @IsDateString({}, { message: 'fechaHora debe ser una fecha ISO 8601 válida' })
  fechaHora: string;

  @ApiProperty({ enum: DIFICULTADES, example: 'REGULAR' })
  @IsIn(DIFICULTADES, {
    message: `dificultad debe ser una de: ${DIFICULTADES.join(', ')}`,
  })
  dificultad: Dificultad;

  @ApiProperty({ description: 'UUID del equipo local' })
  @IsUUID('4')
  equipoLocalId: string;

  @ApiProperty({ description: 'UUID del equipo visitante' })
  @IsUUID('4')
  equipoVisitanteId: string;
}
