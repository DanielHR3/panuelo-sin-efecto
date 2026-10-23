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
import { EquiposService } from './equipos.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('equipos')
@Controller()
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  @Post('categorias/:categoriaId/equipos')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registra un equipo en una categoría' })
  create(
    @Param('categoriaId') categoriaId: string,
    @Body() dto: CreateEquipoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.equiposService.create(categoriaId, dto, user);
  }

  @Get('categorias/:categoriaId/equipos')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista los equipos de una categoría (dueño o SUPERADMIN)',
  })
  findAllByCategoria(
    @Param('categoriaId') categoriaId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.equiposService.findAllByCategoria(categoriaId, user);
  }

  @Get('equipos/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Detalle de un equipo con su roster (dueño o SUPERADMIN)',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.equiposService.findOne(id, user);
  }

  @Patch('equipos/:id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualiza un equipo' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEquipoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.equiposService.update(id, dto, user);
  }

  @Delete('equipos/:id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Elimina un equipo' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.equiposService.remove(id, user);
  }
}
