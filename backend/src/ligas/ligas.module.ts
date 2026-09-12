import { Module } from '@nestjs/common';
import { LigasController } from './ligas.controller';
import { LigasService } from './ligas.service';

@Module({
  controllers: [LigasController],
  providers: [LigasService],
})
export class LigasModule {}
