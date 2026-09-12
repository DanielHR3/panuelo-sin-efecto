import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { ROLES, type Rol } from '../../common/roles';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Ana Torres' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'ana@liga.mx' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ minLength: 8, example: 'contraseñaSegura123' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({ enum: ROLES, example: 'LIGA_ADMIN' })
  @IsIn(ROLES, { message: `El rol debe ser uno de: ${ROLES.join(', ')}` })
  rol: Rol;
}
