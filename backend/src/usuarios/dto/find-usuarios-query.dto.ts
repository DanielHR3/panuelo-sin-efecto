import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ROLES, type Rol } from '../../common/roles';

export class FindUsuariosQueryDto {
  @ApiPropertyOptional({ enum: ROLES, description: 'Filtra por rol' })
  @IsOptional()
  @IsIn(ROLES, { message: `rol debe ser uno de: ${ROLES.join(', ')}` })
  rol?: Rol;
}
