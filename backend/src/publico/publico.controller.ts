import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PublicoService } from './publico.service';

/**
 * Lecturas públicas para la landing (HU-3.4) y el perfil de jugador
 * (HU-3.1). Todo sin autenticación; solo datos ya visibles en un marcador.
 */
@ApiTags('publico')
@Controller('publico')
export class PublicoController {
  constructor(private readonly publicoService: PublicoService) {}

  @Public()
  @Get('resumen')
  @ApiOperation({
    summary:
      'Todas las ligas con tabla de posiciones, marcadores recientes, próximos partidos y líderes por categoría (HU-3.4)',
  })
  resumen() {
    return this.publicoService.resumen();
  }

  @Public()
  @Get('categorias/:id')
  @ApiOperation({
    summary: 'Una categoría completa: tabla, todos los resultados y líderes',
  })
  categoria(@Param('id') id: string) {
    return this.publicoService.categoria(id);
  }

  @Public()
  @Get('jugadores/:id')
  @ApiOperation({
    summary:
      'Perfil público de un jugador con estadísticas derivadas de la Caja Negra (HU-3.1)',
  })
  jugador(@Param('id') id: string) {
    return this.publicoService.jugador(id);
  }

  @Public()
  @Get('partidos/:id')
  @ApiOperation({
    summary:
      'Resumen público de un partido para compartir: marcador, anotadores, MVP y árbitros (HU-2.7)',
  })
  partido(@Param('id') id: string) {
    return this.publicoService.partido(id);
  }
}
