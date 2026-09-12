import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { LigasModule } from './ligas/ligas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { EquiposModule } from './equipos/equipos.module';
import { JugadoresModule } from './jugadores/jugadores.module';
import { PartidosModule } from './partidos/partidos.module';
import { EventosModule } from './eventos/eventos.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    LigasModule,
    UsuariosModule,
    CategoriasModule,
    EquiposModule,
    JugadoresModule,
    PartidosModule,
    EventosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Autenticación primero (puebla request.user), luego autorización por rol.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
