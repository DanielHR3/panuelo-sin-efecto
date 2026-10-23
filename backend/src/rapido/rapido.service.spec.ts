import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RapidoService } from './rapido.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTx = {
  usuario: { create: jest.fn() },
  liga: { findFirst: jest.fn(), create: jest.fn() },
  categoria: { findFirst: jest.fn(), create: jest.fn() },
  equipo: { create: jest.fn(), update: jest.fn() },
  partido: { create: jest.fn(), findUnique: jest.fn() },
  $executeRaw: jest.fn(),
  asignacionArbitral: { create: jest.fn() },
};
const mockPrisma = {
  usuario: { findUnique: jest.fn() },
  partido: { findUnique: jest.fn() },
  eventoPartido: { updateMany: jest.fn(), create: jest.fn() },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
};
const mockJwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };

describe('RapidoService (HU-2.7, partido rápido sin cuenta)', () => {
  let service: RapidoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx.usuario.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'inv-1', ...data }),
    );
    mockTx.liga.findFirst.mockResolvedValue(null);
    mockTx.liga.create.mockResolvedValue({ id: 'liga-1' });
    mockTx.categoria.findFirst.mockResolvedValue(null);
    mockTx.categoria.create.mockResolvedValue({ id: 'cat-1' });
    let n = 0;
    mockTx.equipo.create.mockImplementation(() =>
      Promise.resolve({ id: `eq-${++n}` }),
    );
    mockTx.partido.create.mockResolvedValue({ id: 'p-1' });
    mockTx.asignacionArbitral.create.mockResolvedValue({});
    mockJwt.signAsync.mockResolvedValue('token-invitado');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RapidoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();
    service = module.get(RapidoService);
  });

  it('rechaza dos equipos con el mismo nombre', async () => {
    await expect(
      service.crear({ equipoLocal: 'Toros', equipoVisitante: ' toros ' }, null),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sin usuario crea un árbitro invitado, su liga RAPIDA, equipos, partido y asignación, y devuelve token', async () => {
    const r = await service.crear(
      { equipoLocal: 'Toros', equipoVisitante: 'Lobos', arbitro: 'Beto' },
      null,
    );

    const [{ data: usuario }] = mockTx.usuario.create.mock.calls[0] as [
      {
        data: {
          rol: string;
          esInvitado: boolean;
          nombre: string;
          email: string;
          passwordHash: string;
        };
      },
    ];
    expect(usuario.rol).toBe('ARBITRO');
    expect(usuario.esInvitado).toBe(true);
    expect(usuario.nombre).toBe('Beto');
    expect(usuario.email).toMatch(/@invitado\.panuelo$/);
    expect(usuario.passwordHash).toContain(':');

    const [{ data: liga }] = mockTx.liga.create.mock.calls[0] as [
      { data: { tipo: string; propietarioId: string; registraMvp: boolean } },
    ];
    expect(liga.tipo).toBe('RAPIDA');
    expect(liga.propietarioId).toBe('inv-1');
    // Sin roster no hay MVP que elegir: la liga rápida no lo exige.
    expect(liga.registraMvp).toBe(false);

    expect(mockTx.equipo.create).toHaveBeenCalledTimes(2);
    const [{ data: partido }] = mockTx.partido.create.mock.calls[0] as [
      {
        data: {
          estado: string;
          equipoLocalId: string;
          equipoVisitanteId: string;
          categoriaId: string;
        };
      },
    ];
    expect(partido).toMatchObject({
      estado: 'PROGRAMADO',
      categoriaId: 'cat-1',
      equipoLocalId: 'eq-1',
      equipoVisitanteId: 'eq-2',
    });
    expect(mockTx.asignacionArbitral.create).toHaveBeenCalledWith({
      data: { partidoId: 'p-1', arbitroId: 'inv-1', rolEnCampo: 'Referee' },
    });

    expect(mockJwt.signAsync).toHaveBeenCalledWith({
      sub: 'inv-1',
      email: usuario.email,
      rol: 'ARBITRO',
    });
    expect(r).toEqual({
      access_token: 'token-invitado',
      partidoId: 'p-1',
      usuario: { sub: 'inv-1', email: usuario.email, rol: 'ARBITRO' },
    });
  });

  it('con un usuario existente reutiliza su liga RAPIDA y no crea otro invitado', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValueOnce({
      id: 'u-9',
      email: 'ref@liga.mx',
      rol: 'ARBITRO',
    });
    mockTx.liga.findFirst.mockResolvedValueOnce({ id: 'liga-9' });
    mockTx.categoria.findFirst.mockResolvedValueOnce({ id: 'cat-9' });

    const r = await service.crear(
      { equipoLocal: 'A', equipoVisitante: 'B' },
      { sub: 'u-9', email: 'ref@liga.mx', rol: 'ARBITRO' },
    );

    expect(mockTx.usuario.create).not.toHaveBeenCalled();
    expect(mockTx.liga.create).not.toHaveBeenCalled();
    expect(mockTx.categoria.create).not.toHaveBeenCalled();
    const [{ data: partido }] = mockTx.partido.create.mock.calls[0] as [
      { data: { categoriaId: string } },
    ];
    expect(partido.categoriaId).toBe('cat-9');
    expect(r.usuario.sub).toBe('u-9');
  });

  it('si el token trae un usuario que ya no existe, crea un invitado nuevo', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
    await service.crear(
      { equipoLocal: 'A', equipoVisitante: 'B' },
      { sub: 'borrado', email: 'x@x', rol: 'ARBITRO' },
    );
    expect(mockTx.usuario.create).toHaveBeenCalledTimes(1);
  });

  describe('intercambiarEquipos', () => {
    const partido = (tipo = 'RAPIDA') => ({
      categoria: { liga: { tipo, propietarioId: 'dueno' } },
      asignaciones: [{ arbitroId: 'arb' }],
      equipoLocal: { id: 'eq-l', nombre: 'Toros', colorPrimario: '#111111' },
      equipoVisitante: { id: 'eq-v', nombre: 'Lobos', colorPrimario: null },
    });
    const dueno = { sub: 'dueno', email: 'd@x', rol: 'ARBITRO' as const };

    it('intercambia nombres y color de los dos equipos en una transacción', async () => {
      mockTx.partido.findUnique.mockResolvedValue(partido());
      const r = await service.intercambiarEquipos('p-1', dueno);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.equipo.update).toHaveBeenCalledWith({
        where: { id: 'eq-l' },
        data: { nombre: 'Lobos', colorPrimario: null },
      });
      expect(mockTx.equipo.update).toHaveBeenCalledWith({
        where: { id: 'eq-v' },
        data: { nombre: 'Toros', colorPrimario: '#111111' },
      });
      expect(r).toEqual({
        equipoLocal: { id: 'eq-l', nombre: 'Lobos' },
        equipoVisitante: { id: 'eq-v', nombre: 'Toros' },
        aplicado: true,
      });
    });

    describe('idempotencia con localEsperado', () => {
      it('intercambia cuando localEsperado coincide con el local actual', async () => {
        mockTx.partido.findUnique.mockResolvedValue(partido());
        const r = await service.intercambiarEquipos('p-1', dueno, {
          localEsperado: 'Toros',
        });
        expect(mockTx.equipo.update).toHaveBeenCalledTimes(2);
        expect(r).toEqual({
          equipoLocal: { id: 'eq-l', nombre: 'Lobos' },
          equipoVisitante: { id: 'eq-v', nombre: 'Toros' },
          aplicado: true,
        });
      });

      it('no intercambia y devuelve el estado actual con aplicado:false cuando no coincide (reintento)', async () => {
        // El primer intento ya dejó Lobos como local; el reintento aún cree
        // que el local es Toros.
        mockTx.partido.findUnique.mockResolvedValue({
          ...partido(),
          equipoLocal: { id: 'eq-l', nombre: 'Lobos', colorPrimario: null },
          equipoVisitante: {
            id: 'eq-v',
            nombre: 'Toros',
            colorPrimario: '#111111',
          },
        });
        const r = await service.intercambiarEquipos('p-1', dueno, {
          localEsperado: 'Toros',
        });
        expect(mockTx.equipo.update).not.toHaveBeenCalled();
        expect(r).toEqual({
          equipoLocal: { id: 'eq-l', nombre: 'Lobos' },
          equipoVisitante: { id: 'eq-v', nombre: 'Toros' },
          aplicado: false,
        });
      });

      it('sin localEsperado (clientes viejos) intercambia siempre', async () => {
        mockTx.partido.findUnique.mockResolvedValue(partido());
        const r = await service.intercambiarEquipos('p-1', dueno, {});
        expect(mockTx.equipo.update).toHaveBeenCalledTimes(2);
        expect(r.aplicado).toBe(true);
      });

      it('sigue validando permisos aunque localEsperado no coincida', async () => {
        mockTx.partido.findUnique.mockResolvedValue(partido());
        await expect(
          service.intercambiarEquipos(
            'p-1',
            { ...dueno, sub: 'ajeno' },
            { localEsperado: 'Otro' },
          ),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });
    });

    it('lee el partido dentro de la transacción tras bloquear su fila (FOR UPDATE)', async () => {
      mockTx.partido.findUnique.mockResolvedValue(partido());
      await service.intercambiarEquipos('p-1', dueno);
      expect(mockPrisma.partido.findUnique).not.toHaveBeenCalled();
      const sql = (
        mockTx.$executeRaw.mock.calls[0] as [TemplateStringsArray]
      )[0]
        .join('?')
        .toUpperCase();
      expect(sql).toContain('FOR UPDATE');
      expect(mockTx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
        mockTx.partido.findUnique.mock.invocationCallOrder[0],
      );
    });

    it('permite al árbitro asignado y al superadmin', async () => {
      mockTx.partido.findUnique.mockResolvedValue(partido());
      await service.intercambiarEquipos('p-1', { ...dueno, sub: 'arb' });
      await service.intercambiarEquipos('p-1', {
        ...dueno,
        sub: 'otro',
        rol: 'SUPERADMIN',
      });
      expect(mockTx.equipo.update).toHaveBeenCalledTimes(4);
    });

    it('un usuario ajeno recibe 403', async () => {
      mockTx.partido.findUnique.mockResolvedValue(partido());
      await expect(
        service.intercambiarEquipos('p-1', { ...dueno, sub: 'ajeno' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockTx.equipo.update).not.toHaveBeenCalled();
    });

    it('partido inexistente → 404', async () => {
      mockTx.partido.findUnique.mockResolvedValue(null);
      await expect(
        service.intercambiarEquipos('nope', dueno),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('liga tipo LIGA → 400 Solo disponible en partidos rápidos', async () => {
      mockTx.partido.findUnique.mockResolvedValue(partido('LIGA'));
      await expect(service.intercambiarEquipos('p-1', dueno)).rejects.toThrow(
        'Solo disponible en partidos rápidos',
      );
      expect(mockTx.equipo.update).not.toHaveBeenCalled();
    });

    it('no toca eventos', async () => {
      mockTx.partido.findUnique.mockResolvedValue(partido());
      await service.intercambiarEquipos('p-1', dueno);
      expect(mockPrisma.eventoPartido.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.eventoPartido.create).not.toHaveBeenCalled();
    });
  });
});
