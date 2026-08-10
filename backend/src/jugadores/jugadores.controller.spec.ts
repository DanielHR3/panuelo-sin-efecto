import { Test, TestingModule } from '@nestjs/testing';
import { JugadoresController } from './jugadores.controller';

describe('JugadoresController', () => {
  let controller: JugadoresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JugadoresController],
    }).compile();

    controller = module.get<JugadoresController>(JugadoresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
