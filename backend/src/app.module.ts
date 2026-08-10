import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { LigasModule } from './ligas/ligas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { EquiposModule } from './equipos/equipos.module';
import { JugadoresModule } from './jugadores/jugadores.module';
import { PartidosModule } from './partidos/partidos.module';
import { EventosModule } from './eventos/eventos.module';

@Module({
  imports: [PrismaModule, LigasModule, UsuariosModule, CategoriasModule, EquiposModule, JugadoresModule, PartidosModule, EventosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
