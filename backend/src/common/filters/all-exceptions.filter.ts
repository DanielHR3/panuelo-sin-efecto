import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

const PRISMA_STATUS: Partial<Record<string, HttpStatus>> = {
  P2002: HttpStatus.CONFLICT, // unique constraint violado
  P2003: HttpStatus.BAD_REQUEST, // foreign key inexistente
  P2025: HttpStatus.NOT_FOUND, // registro no encontrado
};

/**
 * Red de seguridad global: ningún error debería llegar aquí ya que cada
 * service traduce los suyos, pero si algo se escapa (un Prisma error nuevo
 * sin atrapar, un bug), esto evita que el cliente vea un mensaje o stack
 * trace interno. Las excepciones HTTP deliberadas (NotFoundException,
 * BadRequestException, etc.) pasan tal cual — este filtro no las toca.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const status = PRISMA_STATUS[exception.code] ?? HttpStatus.BAD_REQUEST;
      this.logger.warn(
        `Prisma ${exception.code} sin manejar en el service: ${exception.message}`,
      );
      response.status(status).json({
        statusCode: status,
        message: 'No se pudo completar la operación sobre los datos',
        error: exception.code,
      });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
    });
  }
}
