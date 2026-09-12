import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateLigaDto } from './create-liga.dto';

/**
 * Todos los campos opcionales: renombrar, cambiar el logo o las banderas de
 * HU-1.1 por separado. El propietario no se cambia por esta vía.
 */
export class UpdateLigaDto extends PartialType(
  OmitType(CreateLigaDto, ['propietarioId'] as const),
) {}
