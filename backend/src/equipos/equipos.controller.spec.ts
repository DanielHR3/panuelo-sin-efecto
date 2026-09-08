import { Test, TestingModule } from '@nestjs/testing';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' };
const mockService = {
  create: jest.fn(),
  findAllByCategoria: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('EquiposController', () => {
  let controller: EquiposController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EquiposController],
      providers: [{ provide: EquiposService, useValue: mockService }],
    }).compile();
    controller = module.get(EquiposController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() delega con categoriaId, dto y usuario', () => {
    const dto = { nombre: 'Dragones' };
    void controller.create('cat-1', dto, user);
    expect(mockService.create).toHaveBeenCalledWith('cat-1', dto, user);
  });
});
