import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

export const ROLES_EN_CAMPO = ['Referee', 'Umpire', 'Line Judge'] as const;
export type RolEnCampo = (typeof ROLES_EN_CAMPO)[number];

export class CreateAsignacionDto {
  @ApiProperty({ description: 'UUID del usuario con rol ARBITRO' })
  @IsUUID('4')
  arbitroId: string;

  @ApiProperty({ enum: ROLES_EN_CAMPO, example: 'Referee' })
  @IsIn(ROLES_EN_CAMPO, {
    message: `rolEnCampo debe ser uno de: ${ROLES_EN_CAMPO.join(', ')}`,
  })
  rolEnCampo: RolEnCampo;
}
