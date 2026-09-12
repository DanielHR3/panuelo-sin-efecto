import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const mockUsuariosService = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
};

describe('UsuariosController', () => {
  let controller: UsuariosController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockUsuariosService }],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('me() consulta el usuario del token por su id (sub)', () => {
    const user: AuthUser = { sub: 'u1', email: 'a@b.c', rol: 'ARBITRO' };
    void controller.me(user);
    expect(mockUsuariosService.findById).toHaveBeenCalledWith('u1');
  });

  it('findAll() delega el filtro de rol de la query', () => {
    void controller.findAll({ rol: 'ARBITRO' });
    expect(mockUsuariosService.findAll).toHaveBeenCalledWith('ARBITRO');
  });
});
