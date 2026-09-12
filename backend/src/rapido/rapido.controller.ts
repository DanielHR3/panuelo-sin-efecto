import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CrearPartidoRapidoDto } from './dto/crear-partido-rapido.dto';
import { RapidoService } from './rapido.service';

@ApiTags('rapido')
@Controller('rapido')
export class RapidoController {
  constructor(
    private readonly rapidoService: RapidoService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  // Crea usuarios y filas sin autenticación: se limita por IP más que el
  // resto de la API para frenar abuso automatizado.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('partidos')
  @ApiOperation({
    summary:
      'Partido rápido sin cuenta (HU-2.7): dos nombres de equipo → partido listo para arbitrar + token de árbitro invitado. Si llega un Bearer válido, reutiliza ese usuario.',
  })
  async crear(@Body() dto: CrearPartidoRapidoDto, @Req() req: Request) {
    return this.rapidoService.crear(dto, await this.usuarioOpcional(req));
  }

  /**
   * La ruta es @Public (el guard no valida el token), pero si el dispositivo
   * ya tiene sesión de invitado conviene reutilizarla para que sus partidos
   * queden juntos. Un token inválido o caducado simplemente se ignora.
   */
  private async usuarioOpcional(req: Request): Promise<AuthUser | null> {
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) return null;
    try {
      return await this.jwt.verifyAsync<AuthUser>(token);
    } catch {
      return null;
    }
  }
}
