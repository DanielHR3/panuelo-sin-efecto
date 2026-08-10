import { Test, TestingModule } from '@nestjs/testing';
import { JugadoresService } from './jugadores.service';

describe('JugadoresService', () => {
  let service: JugadoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JugadoresService],
    }).compile();

    service = module.get<JugadoresService>(JugadoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
