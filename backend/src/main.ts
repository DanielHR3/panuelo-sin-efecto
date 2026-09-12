import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  const origins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim());
  app.enableCors({ origin: origins && origins.length > 0 ? origins : true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pañuelo sin efecto — API')
    .setDescription(
      'Contrato REST de la API de arbitraje. Las escrituras requieren JWT ' +
        '(botón Authorize). Las lecturas son públicas.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
