import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RapidoController } from './rapido.controller';
import { RapidoService } from './rapido.service';

@Module({
  // AuthModule exporta JwtModule: mismo secreto y caducidad que el login.
  imports: [AuthModule],
  controllers: [RapidoController],
  providers: [RapidoService],
})
export class RapidoModule {}
