import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateLigaDto {
  @ApiProperty({ example: 'Liga Metropolitana de Tocho' })
  @IsNotEmpty({ message: 'El nombre de la liga es obligatorio' })
  @IsString()
  nombre: string;

  /** HU-1.1: URL pública del logo. Cadena vacía = sin logo. */
  @ApiPropertyOptional({
    example: 'https://cdn.example.com/ligas/metropolitana.png',
    description: 'URL pública del logo de la liga. Cadena vacía para quitarlo.',
  })
  @IsOptional()
  @ValidateIf((o: CreateLigaDto) => o.logoUrl !== '')
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'El logo debe ser una URL http(s) válida' },
  )
  @MaxLength(2048)
  logoUrl?: string;

  /** HU-1.1: si la liga exige elegir MVP al finalizar cada partido. */
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  registraMvp?: boolean;

  /** HU-1.1: si la liga lleva registro de intercepciones (evento INTERCEPCION). */
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  registraIntercepciones?: boolean;

  /**
   * Solo un SUPERADMIN puede fijar el propietario a otro usuario. Para el resto
   * (o si se omite) el propietario es el usuario autenticado.
   */
  @ApiPropertyOptional({
    description:
      'UUID del propietario. Solo lo respeta un SUPERADMIN; en otro caso se usa el usuario autenticado.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El propietarioId debe ser un UUID válido' })
  propietarioId?: string;
}
