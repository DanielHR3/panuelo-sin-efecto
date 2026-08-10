import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateLigaDto {
  @IsNotEmpty({ message: 'El nombre de la liga es obligatorio' })
  @IsString()
  nombre: string;

  @IsNotEmpty({ message: 'El ID del propietario es obligatorio' })
  @IsUUID('4', { message: 'El propietarioId debe ser un UUID válido' })
  propietarioId: string;
}
