import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { RegistroDto } from './dto/registro.dto';
import { RegistroService } from './registro.service';

@ApiTags('registro')
@Controller('registro')
export class RegistroController {
  constructor(private readonly registroService: RegistroService) {}

  @Public()
  @Post()
  // Crea cuentas sin autenticación: límite por IP mucho más estricto.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Registro público de organizador: crea su cuenta, su liga con una categoría y 30 días de prueba, y devuelve la sesión (máx. 5/min por IP).',
  })
  registrar(@Body() dto: RegistroDto) {
    return this.registroService.registrar(dto);
  }
}
