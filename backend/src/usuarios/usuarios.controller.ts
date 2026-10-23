import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { FindUsuariosQueryDto } from './dto/find-usuarios-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Alta de usuario (solo SUPERADMIN)' })
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Get()
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiOperation({
    summary:
      'Lista usuarios. SUPERADMIN: todos (filtrables por rol), con email. ' +
      'LIGA_ADMIN: solo árbitros con cuenta (sin invitados) y sin email, para asignarlos.',
  })
  findAll(@CurrentUser() user: AuthUser, @Query() query: FindUsuariosQueryDto) {
    return this.usuariosService.findAll(user, query.rol);
  }

  @Get('me')
  @ApiOperation({ summary: 'Datos del usuario autenticado' })
  me(@CurrentUser() user: AuthUser) {
    return this.usuariosService.findById(user.sub);
  }
}
