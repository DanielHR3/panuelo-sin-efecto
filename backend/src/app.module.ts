import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { LigasModule } from './ligas/ligas.module';

@Module({
  imports: [PrismaModule, LigasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
