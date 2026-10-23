import { Test, TestingModule } from '@nestjs/testing';
import { LigasController } from './ligas.controller';
import { LigasService } from './ligas.service';

const mockLigasService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
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

  it('delega create() en el servicio con el DTO y el usuario autenticado', () => {
    const dto = { nombre: 'Liga X' };
    const user = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' as const };
    void controller.create(dto, user);
    expect(mockLigasService.create).toHaveBeenCalledWith(dto, user);
  });

  it('delega findAll() con el usuario autenticado', () => {
    const user = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' as const };
    void controller.findAll(user);
    expect(mockLigasService.findAll).toHaveBeenCalledWith(user);
  });

  it('delega findOne() en el servicio con el id de la ruta y el usuario', () => {
    const user = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' as const };
    void controller.findOne('liga-123', user);
    expect(mockLigasService.findOne).toHaveBeenCalledWith('liga-123', user);
  });

  it('delega remove() en el servicio con el id y el usuario', () => {
    const user = { sub: 'u1', email: 'a@b.c', rol: 'LIGA_ADMIN' as const };
    void controller.remove('liga-123', user);
    expect(mockLigasService.remove).toHaveBeenCalledWith('liga-123', user);
  });
});
