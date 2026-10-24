import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { asegurarSuperadmin } from './common/superadmin-bootstrap';
import { asegurarLigaDemo } from './common/liga-demo';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // La API corre detrás del proxy de Render (un salto). Sin esto, `req.ip`
  // es la IP interna del proxy para todo el mundo y el límite de intentos
  // por IP (5 logins/min) bloquearía a todos a la vez sin frenar a nadie.
  app.set('trust proxy', 1);

  // Superadmin inicial sin shell: si SEED_SUPERADMIN_PASSWORD está definida
  // (p. ej. en las variables de entorno de Render), se crea al arrancar.
  const superadmin = await asegurarSuperadmin(
    app.get(PrismaService),
    process.env,
  );
  if (superadmin) {
    console.log(`Superadmin disponible: ${superadmin.email}`);
  }

  // Liga de ejemplo para la landing (idempotente). Un fallo aquí no debe
  // impedir que la API arranque.
  try {
    const demo = await asegurarLigaDemo(app.get(PrismaService), process.env);
    if (demo) console.log(`Liga demo creada: ${demo.id}`);
  } catch (err) {
    console.error('No se pudo crear la liga demo', err);
  }

  // Cabeceras de seguridad HTTP estándar (X-Content-Type-Options, HSTS,
  // X-Frame-Options, etc.). CSP se apaga: su valor por defecto bloquea los
  // scripts/estilos inline que usa la UI de Swagger en /docs.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS: en producción se restringe a los orígenes de CORS_ORIGINS (lista
  // separada por comas). Sin la variable, se permite cualquier origen (dev).
  const origins = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins && origins.length > 0 ? origins : true });

  // Swagger solo fuera de producción (o con SWAGGER=true): el mapa completo
  // de la API no tiene por qué ser público. En local sigue en /docs.
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Pañuelo sin efecto — API')
      .setDescription(
        'Contrato REST de la API de arbitraje. Todo exige JWT (botón ' +
          'Authorize) salvo /publico, /auth, /registro y /rapido.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
