import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolverPagoDto {
  @ApiProperty({ enum: ['CONFIRMAR', 'RECHAZAR'] })
  @IsIn(['CONFIRMAR', 'RECHAZAR'])
  accion: 'CONFIRMAR' | 'RECHAZAR';

  @ApiPropertyOptional({
    description: 'Obligatorio al rechazar; lo ve el organizador.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}
