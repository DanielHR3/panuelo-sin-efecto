import { Test, TestingModule } from '@nestjs/testing';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'ref-1', email: 'r@r.mx', rol: 'ARBITRO' };
const mockService = {
  registrar: jest.fn(),
  listar: jest.fn(),
  getMarcador: jest.fn(),
};

describe('EventosController', () => {
  let controller: EventosController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventosController],
      providers: [{ provide: EventosService, useValue: mockService }],
    }).compile();
    controller = module.get(EventosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('registrar() delega con partidoId, dto y usuario', () => {
    const dto = { tipoEvento: 'TD' as const, equipoId: 'eq-1' };
    void controller.registrar('p1', dto, user);
    expect(mockService.registrar).toHaveBeenCalledWith('p1', dto, user);
  });

  it('marcador() delega con el partidoId', () => {
    void controller.marcador('p1');
    expect(mockService.getMarcador).toHaveBeenCalledWith('p1');
  });
});
