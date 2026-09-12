import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearPartidoRapidoDto {
  @ApiProperty({ example: 'Toros' })
  @IsNotEmpty({ message: 'Escribe el nombre del primer equipo' })
  @IsString()
  @MaxLength(40)
  equipoLocal: string;

  @ApiProperty({ example: 'Lobos' })
  @IsNotEmpty({ message: 'Escribe el nombre del segundo equipo' })
  @IsString()
  @MaxLength(40)
  equipoVisitante: string;

  /** Cómo quiere aparecer el árbitro (opcional). */
  @ApiPropertyOptional({ example: 'Beto' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  arbitro?: string;
}
