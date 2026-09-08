import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
