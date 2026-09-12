import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEquipoDto {
  @ApiProperty({ example: 'Dragones' })
  @IsNotEmpty({ message: 'El nombre del equipo es obligatorio' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: '#3b82f6', description: 'Color en hex' })
  @IsOptional()
  @IsHexColor({ message: 'colorPrimario debe ser un color hexadecimal' })
  colorPrimario?: string;
}
