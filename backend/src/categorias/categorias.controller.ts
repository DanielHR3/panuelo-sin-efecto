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
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('categorias')
@Controller()
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post('ligas/:ligaId/categorias')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crea una categoría dentro de una liga' })
  create(
    @Param('ligaId') ligaId: string,
    @Body() dto: CreateCategoriaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categoriasService.create(ligaId, dto, user);
  }

  @Get('ligas/:ligaId/categorias')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista las categorías de una liga (dueño o SUPERADMIN)',
  })
  findAllByLiga(
    @Param('ligaId') ligaId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categoriasService.findAllByLiga(ligaId, user);
  }

  @Get('categorias/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Detalle de una categoría con sus equipos (dueño o SUPERADMIN)',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.categoriasService.findOne(id, user);
  }

  @Patch('categorias/:id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualiza una categoría' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoriaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categoriasService.update(id, dto, user);
  }

  @Delete('categorias/:id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Elimina una categoría' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.categoriasService.remove(id, user);
  }
}
