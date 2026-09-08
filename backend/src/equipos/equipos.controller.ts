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
import { Public } from '../common/decorators/public.decorator';
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

  @Public()
  @Get('categorias/:categoriaId/equipos')
  @ApiOperation({ summary: 'Lista los equipos de una categoría' })
  findAllByCategoria(@Param('categoriaId') categoriaId: string) {
    return this.equiposService.findAllByCategoria(categoriaId);
  }

  @Public()
  @Get('equipos/:id')
  @ApiOperation({ summary: 'Detalle de un equipo con su roster' })
  findOne(@Param('id') id: string) {
    return this.equiposService.findOne(id);
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
