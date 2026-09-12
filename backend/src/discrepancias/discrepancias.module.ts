import { Module } from '@nestjs/common';
import { DiscrepanciasController } from './discrepancias.controller';
import { DiscrepanciasService } from './discrepancias.service';

@Module({
  controllers: [DiscrepanciasController],
  providers: [DiscrepanciasService],
})
export class DiscrepanciasModule {}
