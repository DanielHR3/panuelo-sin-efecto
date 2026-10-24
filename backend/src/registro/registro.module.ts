import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RegistroController } from './registro.controller';
import { RegistroService } from './registro.service';

@Module({
  imports: [AuthModule],
  controllers: [RegistroController],
  providers: [RegistroService],
})
export class RegistroModule {}
