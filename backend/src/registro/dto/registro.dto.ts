import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistroDto {
  @ApiProperty({ example: 'Laura Méndez' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu nombre' })
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'laura@liga.mx' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ minLength: 8, example: 'contraseñaSegura123' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(200)
  password: string;

  @ApiProperty({ example: 'Liga del Valle' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe el nombre de tu liga' })
  @MaxLength(100)
  nombreLiga: string;

  @ApiPropertyOptional({
    example: 'Varonil',
    description: 'Primera categoría (por defecto Varonil)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  categoria?: string;
}
