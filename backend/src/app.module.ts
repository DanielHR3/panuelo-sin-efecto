import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
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
import { DiscrepanciasModule } from './discrepancias/discrepancias.module';
import { PublicoModule } from './publico/publico.module';
import { RapidoModule } from './rapido/rapido.module';

@Module({
  imports: [
    // Límite general por IP: 100 peticiones/min. Endpoints puntuales (como
    // el login) se aprietan más con @Throttle en su propio controlador.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    CommonModule,
    AuthModule,
    LigasModule,
    UsuariosModule,
    CategoriasModule,
    EquiposModule,
    JugadoresModule,
    PartidosModule,
    EventosModule,
    DiscrepanciasModule,
    PublicoModule,
    RapidoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Orden: throttling primero (barato, corta abuso antes de gastar más),
    // luego autenticación (puebla request.user), luego autorización por rol.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
