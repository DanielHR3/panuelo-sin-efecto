import { Module } from '@nestjs/common';
import { ReglamentoController } from './reglamento.controller';
import { ReglamentoService } from './reglamento.service';

@Module({
  controllers: [ReglamentoController],
  providers: [ReglamentoService],
})
export class ReglamentoModule {}
