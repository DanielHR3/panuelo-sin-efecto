import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventosService } from './eventos.service';
import { RegistrarEventoDto } from './dto/registrar-evento.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('eventos')
@Controller('partidos/:partidoId')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Post('eventos')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Registra un evento del partido (append-only). Idempotente vía clientEventId. ' +
      'Solo el árbitro asignado, el LIGA_ADMIN dueño o un SUPERADMIN.',
  })
  registrar(
    @Param('partidoId') partidoId: string,
    @Body() dto: RegistrarEventoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.eventosService.registrar(partidoId, dto, user);
  }

  @Get('eventos')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Bitácora completa de eventos de un partido. ' +
      'Solo el árbitro asignado, el dueño de la liga o un SUPERADMIN.',
  })
  listar(@Param('partidoId') partidoId: string, @CurrentUser() user: AuthUser) {
    return this.eventosService.listar(partidoId, user);
  }

  @Get('marcador')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Marcador derivado de la bitácora de eventos. ' +
      'Solo el árbitro asignado, el dueño de la liga o un SUPERADMIN.',
  })
  marcador(
    @Param('partidoId') partidoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.eventosService.leerMarcador(partidoId, user);
  }
}
