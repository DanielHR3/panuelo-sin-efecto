import { Test, TestingModule } from '@nestjs/testing';
import { PartidosController } from './partidos.controller';
import { PartidosService } from './partidos.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' };
const mockService = {
  create: jest.fn(),
  findAllByCategoria: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  listarAsignaciones: jest.fn(),
  asignarArbitro: jest.fn(),
  quitarArbitro: jest.fn(),
  findAsignados: jest.fn(),
};

describe('PartidosController', () => {
  let controller: PartidosController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartidosController],
      providers: [{ provide: PartidosService, useValue: mockService }],
    }).compile();
    controller = module.get(PartidosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() delega con categoriaId, dto y usuario', () => {
    const dto = {
      fechaHora: '2026-09-20T18:00:00.000Z',
      dificultad: 'REGULAR' as const,
      equipoLocalId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      equipoVisitanteId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    };
    void controller.create('cat-1', dto, user);
    expect(mockService.create).toHaveBeenCalledWith('cat-1', dto, user);
  });

  it('asignarArbitro() delega con partidoId, dto y usuario', () => {
    const dto = { arbitroId: 'ref-1', rolEnCampo: 'Referee' as const };
    void controller.asignarArbitro('p1', dto, user);
    expect(mockService.asignarArbitro).toHaveBeenCalledWith('p1', dto, user);
  });

  it('findAsignados() delega con el sub del usuario autenticado', () => {
    void controller.findAsignados(user);
    expect(mockService.findAsignados).toHaveBeenCalledWith('u1');
  });
});
