import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

function hostWithResponse() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.spyOn(filter['logger'], 'warn').mockImplementation();
    jest.spyOn(filter['logger'], 'error').mockImplementation();
  });

  it('respeta una HttpException deliberada tal cual (status y body)', () => {
    const { host, response } = hostWithResponse();
    filter.catch(new NotFoundException('Liga x no encontrada'), host);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Liga x no encontrada' }),
    );
  });

  it('respeta un BadRequestException tal cual', () => {
    const { host, response } = hostWithResponse();
    filter.catch(new BadRequestException('dato inválido'), host);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('traduce un P2002 de Prisma sin atrapar a 409, sin exponer el mensaje interno', () => {
    const { host, response } = hostWithResponse();
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'unique constraint',
      {
        code: 'P2002',
        clientVersion: 'test',
      },
    );
    filter.catch(prismaError, host);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    const [body] = response.json.mock.calls[0] as [{ message: string }];
    expect(body.message).not.toContain('unique constraint');
  });

  it('traduce un P2003 de Prisma sin atrapar a 400', () => {
    const { host, response } = hostWithResponse();
    const prismaError = new Prisma.PrismaClientKnownRequestError('fk', {
      code: 'P2003',
      clientVersion: 'test',
    });
    filter.catch(prismaError, host);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('cualquier otro error se convierte en 500 genérico sin filtrar el mensaje original', () => {
    const { host, response } = hostWithResponse();
    filter.catch(new Error('boom interno con detalles sensibles'), host);
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const [body] = response.json.mock.calls[0] as [{ message: string }];
    expect(body.message).not.toContain('boom interno');
  });
});
