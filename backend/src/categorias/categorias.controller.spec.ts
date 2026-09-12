import { Test, TestingModule } from '@nestjs/testing';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' };
const mockService = {
  create: jest.fn(),
  findAllByLiga: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CategoriasController', () => {
  let controller: CategoriasController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriasController],
      providers: [{ provide: CategoriasService, useValue: mockService }],
    }).compile();
    controller = module.get(CategoriasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() delega con ligaId, dto y usuario', () => {
    const dto = { nombre: 'Varonil' };
    void controller.create('liga-1', dto, user);
    expect(mockService.create).toHaveBeenCalledWith('liga-1', dto, user);
  });

  it('findAllByLiga() delega con el ligaId', () => {
    void controller.findAllByLiga('liga-1');
    expect(mockService.findAllByLiga).toHaveBeenCalledWith('liga-1');
  });
});
