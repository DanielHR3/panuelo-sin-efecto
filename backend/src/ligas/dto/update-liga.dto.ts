import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateLigaDto {
  @ApiProperty({ example: 'Liga Metropolitana de Tocho (renombrada)' })
  @IsNotEmpty({ message: 'El nombre de la liga es obligatorio' })
  @IsString()
  nombre: string;
}
