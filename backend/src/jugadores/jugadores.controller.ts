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
import { JugadoresService } from './jugadores.service';
import { CreateJugadorDto } from './dto/create-jugador.dto';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('jugadores')
@Controller()
export class JugadoresController {
  constructor(private readonly jugadoresService: JugadoresService) {}

  @Post('equipos/:equipoId/jugadores')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Añade un jugador al roster de un equipo' })
  create(
    @Param('equipoId') equipoId: string,
    @Body() dto: CreateJugadorDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.jugadoresService.create(equipoId, dto, user);
  }

  @Public()
  @Get('equipos/:equipoId/jugadores')
  @ApiOperation({ summary: 'Lista el roster de un equipo' })
  findAllByEquipo(@Param('equipoId') equipoId: string) {
    return this.jugadoresService.findAllByEquipo(equipoId);
  }

  @Public()
  @Get('jugadores/:id')
  @ApiOperation({ summary: 'Detalle de un jugador' })
  findOne(@Param('id') id: string) {
    return this.jugadoresService.findOne(id);
  }

  @Patch('jugadores/:id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualiza un jugador' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJugadorDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.jugadoresService.update(id, dto, user);
  }

  @Delete('jugadores/:id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Elimina un jugador' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.jugadoresService.remove(id, user);
  }
}
