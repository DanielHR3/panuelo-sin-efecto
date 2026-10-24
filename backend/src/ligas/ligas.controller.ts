import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { LigasService } from './ligas.service';
import { CreateLigaDto } from './dto/create-liga.dto';
import { UpdateLigaDto } from './dto/update-liga.dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('ligas')
@Controller('ligas')
export class LigasController {
  constructor(private readonly ligasService: LigasService) {}

  @Post()
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crea una liga (SUPERADMIN o LIGA_ADMIN)' })
  create(@Body() createLigaDto: CreateLigaDto, @CurrentUser() user: AuthUser) {
    return this.ligasService.create(createLigaDto, user);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lista las ligas con sus categorías: todas para SUPERADMIN; para el resto solo las propias (nunca las RAPIDA)',
  })
  findAll(@CurrentUser() user: AuthUser) {
    return this.ligasService.findAll(user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Detalle de una liga (dueño o SUPERADMIN; 403 si es ajena)',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ligasService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Actualiza una liga: nombre, logo y/o banderas de MVP e intercepciones (HU-1.1)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLigaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ligasService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiQuery({
    name: 'confirmar',
    required: false,
    description: 'SUPERADMIN: nombre exacto de la liga',
  })
  @ApiQuery({
    name: 'borrarCuenta',
    required: false,
    description:
      'SUPERADMIN: "true" para borrar también la cuenta del organizador',
  })
  @ApiOperation({
    summary:
      'Elimina una liga. SUPERADMIN: con todo su contenido (y opcionalmente la cuenta del organizador), confirmando con el nombre. Organizador: solo si está vacía',
  })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query('confirmar') confirmar?: string,
    @Query('borrarCuenta') borrarCuenta?: string,
  ) {
    return this.ligasService.remove(id, user, {
      confirmar,
      borrarCuenta: borrarCuenta === 'true',
    });
  }
}
