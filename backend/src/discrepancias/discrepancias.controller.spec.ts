import { Test, TestingModule } from '@nestjs/testing';
import { DiscrepanciasController } from './discrepancias.controller';
import { DiscrepanciasService } from './discrepancias.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'admin-1', email: 'a@a.mx', rol: 'LIGA_ADMIN' };
const mockService = { listar: jest.fn(), resolver: jest.fn() };

describe('DiscrepanciasController', () => {
  let controller: DiscrepanciasController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscrepanciasController],
      providers: [{ provide: DiscrepanciasService, useValue: mockService }],
    }).compile();
    controller = module.get(DiscrepanciasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listar() delega con partidoId y usuario', () => {
    void controller.listar('p1', user);
    expect(mockService.listar).toHaveBeenCalledWith('p1', user);
  });

  it('resolver() delega con partidoId, discrepanciaId, dto y usuario', () => {
    const dto = { accion: 'MANTENER_AMBOS' as const };
    void controller.resolver('p1', 'd1', dto, user);
    expect(mockService.resolver).toHaveBeenCalledWith('p1', 'd1', dto, user);
  });
});
