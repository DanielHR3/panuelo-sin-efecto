import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateJugadorDto {
  @ApiProperty({ example: 'A. Pérez' })
  @IsNotEmpty({ message: 'El nombre del jugador es obligatorio' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: '12', description: 'Número de jersey (1-2 dígitos)' })
  @IsString()
  @Matches(/^\d{1,2}$/, {
    message: 'El número de jersey debe ser de 1 o 2 dígitos',
  })
  numeroJersey: string;
}
