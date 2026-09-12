import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiscrepanciasService } from './discrepancias.service';
import { ResolverDiscrepanciaDto } from './dto/resolver-discrepancia.dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('discrepancias')
@ApiBearerAuth()
@Roles('SUPERADMIN', 'LIGA_ADMIN')
@Controller('partidos/:partidoId/discrepancias')
export class DiscrepanciasController {
  constructor(private readonly discrepanciasService: DiscrepanciasService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista las discrepancias detectadas entre árbitros en el partido (HU-2.6)',
  })
  listar(@Param('partidoId') partidoId: string, @CurrentUser() user: AuthUser) {
    return this.discrepanciasService.listar(partidoId, user);
  }

  @Patch(':discrepanciaId')
  @ApiOperation({
    summary:
      'Resuelve una discrepancia: descarta uno de los dos eventos o mantiene ambos. Solo LIGA_ADMIN dueño o SUPERADMIN.',
  })
  resolver(
    @Param('partidoId') partidoId: string,
    @Param('discrepanciaId') discrepanciaId: string,
    @Body() dto: ResolverDiscrepanciaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discrepanciasService.resolver(
      partidoId,
      discrepanciaId,
      dto,
      user,
    );
  }

  @Patch(':discrepanciaId/reabrir')
  @ApiOperation({
    summary:
      'Reabre una discrepancia ya resuelta: vuelve a PENDIENTE y reincorpora el evento descartado al marcador. Solo LIGA_ADMIN dueño o SUPERADMIN.',
  })
  reabrir(
    @Param('partidoId') partidoId: string,
    @Param('discrepanciaId') discrepanciaId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discrepanciasService.reabrir(partidoId, discrepanciaId, user);
  }
}
