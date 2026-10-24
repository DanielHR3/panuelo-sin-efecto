import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { BitacoraService } from './bitacora.service';

@ApiTags('bitacora')
@ApiBearerAuth()
@Controller('bitacora')
@Roles('SUPERADMIN')
export class BitacoraController {
  constructor(private readonly bitacora: BitacoraService) {}

  @Get()
  @ApiQuery({
    name: 'usuario',
    required: false,
    description: 'Parte del email',
  })
  @ApiQuery({
    name: 'ruta',
    required: false,
    description: 'Parte de la ruta, p. ej. ligas',
  })
  @ApiQuery({
    name: 'antes',
    required: false,
    description: 'Fecha ISO: página siguiente',
  })
  @ApiOperation({
    summary:
      'SUPERADMIN: quién hizo qué (cambios por la API), lo más reciente primero, 50 por página',
  })
  listar(
    @Query('usuario') usuario?: string,
    @Query('ruta') ruta?: string,
    @Query('antes') antes?: string,
  ) {
    return this.bitacora.listar({ usuario, ruta, antes });
  }
}
