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
  $executeRaw: jest.fn(),
  eventoPartido: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  partido: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
  discrepanciaEvento: { createMany: jest.fn() },
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
    mockTx.$executeRaw.mockResolvedValue(1);
    mockTx.eventoPartido.create.mockResolvedValue({ id: 'ev1' });
    mockTx.eventoPartido.findMany.mockResolvedValue([]);
    mockTx.eventoPartido.count.mockResolvedValue(0);
    mockTx.partido.update.mockResolvedValue({});
    // Lectura fresca de estado DENTRO de la transacción (finding 2): por
    // defecto EN_CURSO, salvo que un test la sobreescriba con
    // mockResolvedValueOnce para PROGRAMADO/FINALIZADO.
    mockTx.partido.findUniqueOrThrow.mockResolvedValue({
      estado: 'EN_CURSO',
    });

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
    mockTx.partido.findUniqueOrThrow.mockResolvedValueOnce({
      estado: 'PROGRAMADO',
    });
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
    mockTx.partido.findUniqueOrThrow.mockResolvedValueOnce({
      estado: 'PROGRAMADO',
    });
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
    mockTx.partido.findUniqueOrThrow.mockResolvedValueOnce({
      estado: 'FINALIZADO',
    });
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
    mockTx.eventoPartido.count.mockResolvedValueOnce(1); // ya hubo un FIN_MITAD
    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);
    const [[arg]] = mockTx.partido.update.mock.calls as unknown[][];
    const { data } = arg as { data: { estado?: string } };
    expect(data.estado).toBe('FINALIZADO');
  });

  it('el primer FIN_MITAD no finaliza el partido', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    mockTx.eventoPartido.count.mockResolvedValueOnce(0);
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

  it('al finalizar con más de un árbitro asignado, crea discrepancias si detectarDiscrepancias encuentra pares', async () => {
    const partidoDosArbitros = {
      ...partidoBase('EN_CURSO'),
      asignaciones: [{ arbitroId: 'ref-1' }, { arbitroId: 'ref-2' }],
    };
    mockPrisma.partido.findUnique.mockResolvedValueOnce(partidoDosArbitros);
    mockTx.eventoPartido.count.mockResolvedValueOnce(1); // ya hubo un FIN_MITAD
    mockTx.eventoPartido.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      },
      {
        id: 'e2',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      },
    ]);

    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);

    expect(mockTx.discrepanciaEvento.createMany).toHaveBeenCalledWith({
      data: [
        {
          partidoId: 'p1',
          eventoAId: 'e1',
          eventoBId: 'e2',
          estado: 'PENDIENTE',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('bloquea la fila del partido (FOR UPDATE) antes de leer el estado fresco dentro de la transacción', async () => {
    // PostgreSQL no serializa las transacciones de escritura como SQLite:
    // con READ COMMITTED dos transacciones concurrentes pueden leer el
    // mismo estado "EN_CURSO" y finalizar el partido dos veces. El bloqueo
    // de fila es lo que convierte la lectura fresca del finding 2 en una
    // lectura realmente serializada por partido.
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    await service.registrar(
      'p1',
      { tipoEvento: 'TD', equipoId: LOCAL_ID },
      arbitroAsignado,
    );

    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
    const sql = (mockTx.$executeRaw.mock.calls[0] as [TemplateStringsArray])[0]
      .join('?')
      .toUpperCase();
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('"PARTIDO"');
    const lockOrder = mockTx.$executeRaw.mock.invocationCallOrder[0];
    const readOrder =
      mockTx.partido.findUniqueOrThrow.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(readOrder);
  });

  it('crea las discrepancias con skipDuplicates para que el @@unique sea un no-op y no aborte la transacción', async () => {
    // En PostgreSQL cualquier error dentro de la transacción la deja en
    // estado abortado: un catch de P2002 "a mano" ya no sirve como
    // backstop, porque el resto de la transacción fallaría igual. El
    // no-op tiene que pedirse a la base (ON CONFLICT DO NOTHING).
    const partidoDosArbitros = {
      ...partidoBase('EN_CURSO'),
      asignaciones: [{ arbitroId: 'ref-1' }, { arbitroId: 'ref-2' }],
    };
    mockPrisma.partido.findUnique.mockResolvedValueOnce(partidoDosArbitros);
    mockTx.eventoPartido.count.mockResolvedValueOnce(1);
    mockTx.eventoPartido.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      },
      {
        id: 'e2',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      },
    ]);

    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);

    const [arg] = mockTx.discrepanciaEvento.createMany.mock.calls[0] as [
      { skipDuplicates?: boolean },
    ];
    expect(arg.skipDuplicates).toBe(true);
  });

  it('no crea discrepancias si solo hay un árbitro asignado', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'), // asignaciones: [{ arbitroId: 'ref-1' }] — uno solo
    );
    mockTx.eventoPartido.count.mockResolvedValueOnce(1);
    mockTx.eventoPartido.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      },
      {
        id: 'e2',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-2', // hipotético — no debería importar, solo hay 1 asignación
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      },
    ]);

    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);

    expect(mockTx.discrepanciaEvento.createMany).not.toHaveBeenCalled();
  });

  it('no crea discrepancias si detectarDiscrepancias no encuentra pares', async () => {
    const partidoDosArbitros = {
      ...partidoBase('EN_CURSO'),
      asignaciones: [{ arbitroId: 'ref-1' }, { arbitroId: 'ref-2' }],
    };
    mockPrisma.partido.findUnique.mockResolvedValueOnce(partidoDosArbitros);
    mockTx.eventoPartido.count.mockResolvedValueOnce(1);
    mockTx.eventoPartido.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      },
    ]);

    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);

    expect(mockTx.discrepanciaEvento.createMany).not.toHaveBeenCalled();
  });

  it('no crea discrepancia para una jugada que un UNDO_LAST_ACTION ya canceló (finding 1)', async () => {
    // Dos árbitros registran el mismo TD dentro de la ventana de 30s (e1,
    // e2, tal como en el test de arriba) pero luego ref-2 se da cuenta y
    // deshace SU propio evento con un UNDO. calcularMarcador ya no cuenta
    // e2 — detectarDiscrepancias tampoco debería verlo como candidato:
    // emparejar e1 con un evento ya cancelado y que el admin luego
    // "Descartar A" (e1, el TD real y vigente) dejaría el marcador corrupto
    // sin ninguna forma de deshacerlo desde el producto.
    const partidoDosArbitros = {
      ...partidoBase('EN_CURSO'),
      asignaciones: [{ arbitroId: 'ref-1' }, { arbitroId: 'ref-2' }],
    };
    mockPrisma.partido.findUnique.mockResolvedValueOnce(partidoDosArbitros);
    mockTx.eventoPartido.count.mockResolvedValueOnce(1); // ya hubo un FIN_MITAD
    mockTx.eventoPartido.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      },
      {
        id: 'e2',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      },
      {
        id: 'e3',
        tipoEvento: 'UNDO_LAST_ACTION',
        equipoId: null,
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:10.000Z'),
      },
    ]);

    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);

    expect(mockTx.discrepanciaEvento.createMany).not.toHaveBeenCalled();
  });

  it('no crea discrepancias cuando el evento no finaliza el partido (no es el segundo FIN_MITAD)', async () => {
    const partidoDosArbitros = {
      ...partidoBase('EN_CURSO'),
      asignaciones: [{ arbitroId: 'ref-1' }, { arbitroId: 'ref-2' }],
    };
    mockPrisma.partido.findUnique.mockResolvedValueOnce(partidoDosArbitros);
    await service.registrar(
      'p1',
      { tipoEvento: 'TD', equipoId: LOCAL_ID },
      arbitroAsignado,
    );
    expect(mockTx.discrepanciaEvento.createMany).not.toHaveBeenCalled();
  });

  describe('finding 2: carrera del segundo FIN_MITAD entre dos árbitros', () => {
    // Simula dos dispositivos pulsando "fin de partido" casi
    // simultáneamente: ambos ven, ANTES de que exista una transacción
    // confirmada, "1 FIN_MITAD previo, todavía no FINALIZADO". Para
    // reproducir esa foto congelada sin concurrencia real de SQLite, las
    // lecturas PREVIAS a la transacción (this.prisma.*) se dejan fijas con
    // ese snapshot para ambas llamadas — tal como las verían dos requests
    // que llegaron casi al mismo tiempo. Lo que se pone a prueba es si el
    // servicio, dentro de cada transacción, vuelve a leer el estado desde
    // `tx` (fresco) en vez de confiar en ese snapshot: si lo hace, la
    // segunda llamada ve que la primera ya confirmó FINALIZADO y no
    // duplica la detección de discrepancias.
    const partidoDosArbitros = {
      ...partidoBase('EN_CURSO'),
      asignaciones: [{ arbitroId: 'ref-1' }, { arbitroId: 'ref-2' }],
    };
    const eventosDuplicados = [
      {
        id: 'e1',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      },
      {
        id: 'e2',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      },
    ];

    it('solo la primera transacción finaliza y detecta discrepancias; la segunda ve el estado ya confirmado', async () => {
      // Snapshot "congelado" que ambas llamadas leerían fuera de la
      // transacción si el código siguiera leyendo ahí.
      mockPrisma.partido.findUnique
        .mockResolvedValueOnce(partidoDosArbitros)
        .mockResolvedValueOnce(partidoDosArbitros);
      mockPrisma.eventoPartido.count.mockResolvedValue(1); // "ya hubo un FIN_MITAD" para ambas, si el código lo leyera aquí

      // Estado real "en la base de datos": lo único que debe decidir si el
      // partido finaliza es esto, leído fresco dentro de cada transacción.
      let estadoDb = 'EN_CURSO';
      let finMitadCommitted = 1;
      mockTx.partido.findUniqueOrThrow.mockImplementation(() =>
        Promise.resolve({ estado: estadoDb }),
      );
      mockTx.eventoPartido.count.mockImplementation(() =>
        Promise.resolve(finMitadCommitted),
      );
      mockTx.partido.update.mockImplementation(
        (args: { data: { estado?: string } }) => {
          if (args.data.estado) estadoDb = args.data.estado;
          return Promise.resolve({});
        },
      );
      mockTx.eventoPartido.findMany.mockResolvedValue(eventosDuplicados);

      // Primera llamada: transacción "gana la carrera", finaliza y detecta.
      await service.registrar(
        'p1',
        { tipoEvento: 'FIN_MITAD' },
        arbitroAsignado,
      );
      expect(mockTx.discrepanciaEvento.createMany).toHaveBeenCalledTimes(1);

      // Segunda llamada: mismo snapshot pre-transacción "congelado" que la
      // primera (ambas lo habrían leído casi al mismo tiempo), pero la
      // transacción, al leer fresco, ve que el partido ya FINALIZÓ.
      finMitadCommitted = 2; // por si el fix también relee el conteo
      await expect(
        service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Lo esencial de este finding: nunca se detecta dos veces el mismo
      // par de eventos ni se crean discrepancias duplicadas.
      expect(mockTx.discrepanciaEvento.createMany).toHaveBeenCalledTimes(1);
    });
  });
});
