import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventosService } from './eventos.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const LOCAL_ID = 'equipo-local';
const VISITA_ID = 'equipo-visitante';
const PROPIETARIO_ID = 'liga-admin-dueno';

const superadmin: AuthUser = { sub: 'boss', email: 'x@y.z', rol: 'SUPERADMIN' };
const dueno: AuthUser = {
  sub: PROPIETARIO_ID,
  email: 'd@d.mx',
  rol: 'LIGA_ADMIN',
};
const arbitroAsignado: AuthUser = {
  sub: 'ref-1',
  email: 'r@r.mx',
  rol: 'ARBITRO',
};
const arbitroAjeno: AuthUser = {
  sub: 'ref-2',
  email: 'r2@r.mx',
  rol: 'ARBITRO',
};

function partidoBase(estado: string) {
  return {
    estado,
    equipoLocalId: LOCAL_ID,
    equipoVisitanteId: VISITA_ID,
    categoria: { liga: { propietarioId: PROPIETARIO_ID } },
    asignaciones: [{ arbitroId: 'ref-1' }],
  };
}

const mockTx = {
  eventoPartido: { create: jest.fn(), findMany: jest.fn() },
  partido: { update: jest.fn() },
};

const mockPrisma = {
  partido: { findUnique: jest.fn() },
  eventoPartido: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
};

describe('EventosService', () => {
  let service: EventosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx.eventoPartido.create.mockResolvedValue({ id: 'ev1' });
    mockTx.eventoPartido.findMany.mockResolvedValue([]);
    mockTx.partido.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(EventosService);
  });

  it('lanza NotFound si el partido no existe', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.registrar(
        'p1',
        { tipoEvento: 'TIMEOUT', equipoId: LOCAL_ID },
        arbitroAsignado,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza a un árbitro no asignado ni dueño', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    await expect(
      service.registrar(
        'p1',
        { tipoEvento: 'TIMEOUT', equipoId: LOCAL_ID },
        arbitroAjeno,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite al SUPERADMIN aunque no esté asignado', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    await expect(
      service.registrar(
        'p1',
        { tipoEvento: 'TIMEOUT', equipoId: LOCAL_ID },
        superadmin,
      ),
    ).resolves.toBeDefined();
  });

  it('permite al LIGA_ADMIN dueño de la liga aunque no esté asignado', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    await expect(
      service.registrar(
        'p1',
        { tipoEvento: 'TIMEOUT', equipoId: LOCAL_ID },
        dueno,
      ),
    ).resolves.toBeDefined();
  });

  it('en PROGRAMADO solo acepta INICIO_MITAD', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('PROGRAMADO'),
    );
    await expect(
      service.registrar(
        'p1',
        { tipoEvento: 'TD', equipoId: LOCAL_ID },
        arbitroAsignado,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('INICIO_MITAD en PROGRAMADO transiciona el partido a EN_CURSO', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('PROGRAMADO'),
    );
    await service.registrar(
      'p1',
      { tipoEvento: 'INICIO_MITAD' },
      arbitroAsignado,
    );
    const [[arg]] = mockTx.partido.update.mock.calls as unknown[][];
    const { data } = arg as { data: { estado?: string } };
    expect(data.estado).toBe('EN_CURSO');
  });

  it('rechaza eventos cuando el partido ya FINALIZADO', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('FINALIZADO'),
    );
    await expect(
      service.registrar(
        'p1',
        { tipoEvento: 'TIMEOUT', equipoId: LOCAL_ID },
        arbitroAsignado,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('el segundo FIN_MITAD finaliza el partido', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    mockPrisma.eventoPartido.count.mockResolvedValueOnce(1); // ya hubo un FIN_MITAD
    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);
    const [[arg]] = mockTx.partido.update.mock.calls as unknown[][];
    const { data } = arg as { data: { estado?: string } };
    expect(data.estado).toBe('FINALIZADO');
  });

  it('el primer FIN_MITAD no finaliza el partido', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    mockPrisma.eventoPartido.count.mockResolvedValueOnce(0);
    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);
    const [[arg]] = mockTx.partido.update.mock.calls as unknown[][];
    const { data } = arg as { data: { estado?: string } };
    expect(data.estado).toBeUndefined();
  });

  it('un evento que anota sin equipoId es rechazado', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    await expect(
      service.registrar('p1', { tipoEvento: 'TD' }, arbitroAsignado),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un equipoId que no pertenece al partido', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    await expect(
      service.registrar(
        'p1',
        { tipoEvento: 'TD', equipoId: 'otro-equipo' },
        arbitroAsignado,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('idempotencia: un clientEventId repetido devuelve el evento existente sin crear otro', async () => {
    mockPrisma.partido.findUnique
      .mockResolvedValueOnce(partidoBase('EN_CURSO')) // registrar()
      .mockResolvedValueOnce({
        equipoLocalId: LOCAL_ID,
        equipoVisitanteId: VISITA_ID,
      }); // getMarcador()
    mockPrisma.eventoPartido.findUnique.mockResolvedValueOnce({
      id: 'ev-existente',
    });
    mockPrisma.eventoPartido.findMany.mockResolvedValueOnce([]); // getMarcador()

    const res = await service.registrar(
      'p1',
      { tipoEvento: 'TD', equipoId: LOCAL_ID, clientEventId: 'c-1' },
      arbitroAsignado,
    );

    expect(res.duplicado).toBe(true);
    expect(res.evento).toEqual({ id: 'ev-existente' });
    expect(mockTx.eventoPartido.create).not.toHaveBeenCalled();
  });

  it('getMarcador() excluye eventos descartados de la consulta', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce({
      equipoLocalId: LOCAL_ID,
      equipoVisitanteId: VISITA_ID,
    });
    mockPrisma.eventoPartido.findMany.mockResolvedValueOnce([]);
    await service.getMarcador('p1');
    const [arg] = mockPrisma.eventoPartido.findMany.mock.calls[0] as [
      { where: { descartado?: boolean } },
    ];
    expect(arg.where.descartado).toBe(false);
  });

  it('registrar() excluye eventos descartados al recalcular el marcador', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    await service.registrar(
      'p1',
      { tipoEvento: 'TD', equipoId: LOCAL_ID },
      arbitroAsignado,
    );
    const [arg] = mockTx.eventoPartido.findMany.mock.calls[0] as [
      { where: { descartado?: boolean } },
    ];
    expect(arg.where.descartado).toBe(false);
  });
});
