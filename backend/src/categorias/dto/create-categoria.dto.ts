import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Varonil Libre' })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @IsString()
  nombre: string;
}
