import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Límite propio y más estricto que el general (100/min): 5 intentos por
  // minuto por IP, para frenar fuerza bruta de contraseñas.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Inicia sesión y devuelve un JWT (máx. 5 intentos/min por IP)',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
