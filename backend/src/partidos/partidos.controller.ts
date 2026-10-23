import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PartidosService } from './partidos.service';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';
import { CreateAsignacionDto } from './dto/create-asignacion.dto';
import { SetMvpDto } from './dto/set-mvp.dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('partidos')
@Controller()
export class PartidosController {
  constructor(private readonly partidosService: PartidosService) {}

  @Post('categorias/:categoriaId/partidos')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Programa un partido en una categoría' })
  create(
    @Param('categoriaId') categoriaId: string,
    @Body() dto: CreatePartidoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.partidosService.create(categoriaId, dto, user);
  }

  @Get('categorias/:categoriaId/partidos')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista los partidos de una categoría (dueño o SUPERADMIN)',
  })
  findAllByCategoria(
    @Param('categoriaId') categoriaId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.partidosService.findAllByCategoria(categoriaId, user);
  }

  @Get('partidos/asignados')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Partidos donde el usuario autenticado es árbitro asignado',
  })
  findAsignados(@CurrentUser() user: AuthUser) {
    // Debe registrarse antes de "partidos/:id" para que Nest no confunda
    // "asignados" con un :id.
    return this.partidosService.findAsignados(user.sub);
  }

  @Get('partidos/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Detalle de un partido (equipos con roster, árbitros sin email). ' +
      'Solo el árbitro asignado, el dueño de la liga o un SUPERADMIN.',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.partidosService.findOne(id, user);
  }

  @Patch('partidos/:id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reprograma un partido o avanza su estado' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePartidoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.partidosService.update(id, dto, user);
  }

  @Delete('partidos/:id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Elimina un partido' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.partidosService.remove(id, user);
  }

  @Patch('partidos/:id/mvp')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Elige (o corrige) el MVP del partido, entre el roster de cualquiera de los dos equipos. ' +
      'Solo el árbitro asignado, el LIGA_ADMIN dueño o un SUPERADMIN, y solo con el partido FINALIZADO.',
  })
  setMvp(
    @Param('id') id: string,
    @Body() dto: SetMvpDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.partidosService.setMvp(id, dto, user);
  }

  @Get('partidos/:id/asignaciones')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Árbitros asignados a un partido (sin email). Solo el árbitro asignado, el dueño de la liga o un SUPERADMIN.',
  })
  listarAsignaciones(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.partidosService.listarAsignaciones(id, user);
  }

  @Post('partidos/:id/asignaciones')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Asigna un árbitro a un partido (o cambia su rol)' })
  asignarArbitro(
    @Param('id') id: string,
    @Body() dto: CreateAsignacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.partidosService.asignarArbitro(id, dto, user);
  }

  @Delete('partidos/:id/asignaciones/:arbitroId')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quita la asignación de un árbitro' })
  quitarArbitro(
    @Param('id') id: string,
    @Param('arbitroId') arbitroId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.partidosService.quitarArbitro(id, arbitroId, user);
  }
}
