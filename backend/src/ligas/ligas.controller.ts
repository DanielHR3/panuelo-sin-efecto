import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LigasService } from './ligas.service';
import { CreateLigaDto } from './dto/create-liga.dto';
import { UpdateLigaDto } from './dto/update-liga.dto';
import { Public } from '../common/decorators/public.decorator';
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

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista todas las ligas con sus categorías' })
  findAll() {
    return this.ligasService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una liga' })
  findOne(@Param('id') id: string) {
    return this.ligasService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renombra una liga' })
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
  @ApiOperation({ summary: 'Elimina una liga (debe estar sin categorías)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ligasService.remove(id, user);
  }
}
