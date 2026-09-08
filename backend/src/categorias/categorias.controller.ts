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
import { Public } from '../common/decorators/public.decorator';
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

  @Public()
  @Get('ligas/:ligaId/categorias')
  @ApiOperation({ summary: 'Lista las categorías de una liga' })
  findAllByLiga(@Param('ligaId') ligaId: string) {
    return this.categoriasService.findAllByLiga(ligaId);
  }

  @Public()
  @Get('categorias/:id')
  @ApiOperation({ summary: 'Detalle de una categoría con sus equipos' })
  findOne(@Param('id') id: string) {
    return this.categoriasService.findOne(id);
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
