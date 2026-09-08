import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLigaDto {
  @ApiProperty({ example: 'Liga Metropolitana de Tocho' })
  @IsNotEmpty({ message: 'El nombre de la liga es obligatorio' })
  @IsString()
  nombre: string;

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
