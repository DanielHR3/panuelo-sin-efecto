import { Test, TestingModule } from '@nestjs/testing';
import { LigasController } from './ligas.controller';
import { LigasService } from './ligas.service';

const mockLigasService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
};

describe('LigasController', () => {
  let controller: LigasController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LigasController],
      providers: [{ provide: LigasService, useValue: mockLigasService }],
    }).compile();

    controller = module.get<LigasController>(LigasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delega create() en el servicio con el DTO recibido', () => {
    const dto = { nombre: 'Liga X', propietarioId: 'uuid-propietario' };
    controller.create(dto);
    expect(mockLigasService.create).toHaveBeenCalledWith(dto);
  });

  it('delega findOne() en el servicio con el id de la ruta', () => {
    controller.findOne('liga-123');
    expect(mockLigasService.findOne).toHaveBeenCalledWith('liga-123');
  });
});
