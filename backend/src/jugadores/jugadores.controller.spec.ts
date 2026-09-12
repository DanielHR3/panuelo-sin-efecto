import { Test, TestingModule } from '@nestjs/testing';
import { JugadoresController } from './jugadores.controller';
import { JugadoresService } from './jugadores.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' };
const mockService = {
  create: jest.fn(),
  findAllByEquipo: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('JugadoresController', () => {
  let controller: JugadoresController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JugadoresController],
      providers: [{ provide: JugadoresService, useValue: mockService }],
    }).compile();
    controller = module.get(JugadoresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() delega con equipoId, dto y usuario', () => {
    const dto = { nombre: 'A. Pérez', numeroJersey: '12' };
    void controller.create('eq-1', dto, user);
    expect(mockService.create).toHaveBeenCalledWith('eq-1', dto, user);
  });
});
