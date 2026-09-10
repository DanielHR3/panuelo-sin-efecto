import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SetMvpDto {
  @ApiProperty({
    description:
      'UUID del jugador elegido como MVP del partido. Debe pertenecer al roster de alguno de los dos equipos.',
  })
  @IsUUID('4')
  jugadorId: string;
}
