import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RegistroService } from './registro.service';
import { verifyPassword } from '../common/hashing';

const AHORA = new Date('2026-10-23T18:00:00Z');

describe('RegistroService', () => {
  const tx = {
    usuario: { create: jest.fn() },
    liga: { create: jest.fn() },
  };
  const prisma = {
    pruebaUsada: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('token-123') };
  const service = new RegistroService(
    prisma as never,
    jwt as never,
    () => AHORA,
  );
  const dto = {
    nombre: 'Laura Méndez',
    email: 'Laura@Liga.mx ',
    password: 'contraseña-123',
    nombreLiga: 'Liga del Valle',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.usuario.create.mockResolvedValue({
      id: 'u1',
      email: 'laura@liga.mx',
      rol: 'LIGA_ADMIN',
    });
    tx.liga.create.mockResolvedValue({ id: 'l1' });
    prisma.pruebaUsada.findUnique.mockResolvedValue(null);
  });

  it('si el correo ya usó su mes gratis (cuenta borrada), la liga nace sin prueba', async () => {
    prisma.pruebaUsada.findUnique.mockResolvedValue({ email: 'laura@liga.mx' });
    await service.registrar(dto);
    expect(prisma.pruebaUsada.findUnique).toHaveBeenCalledWith({
      where: { email: 'laura@liga.mx' },
    });
    const [[arg]] = tx.liga.create.mock.calls as [
      [{ data: { suscripcion: { create: { pruebaHasta: Date | null } } } }],
    ];
    expect(arg.data.suscripcion.create.pruebaHasta).toBeNull();
  });

  it('crea al organizador (LIGA_ADMIN) con la contraseña hasheada y email normalizado', async () => {
    await service.registrar(dto);
    const [[arg]] = tx.usuario.create.mock.calls as [
      [{ data: Record<string, string> }],
    ];
    expect(arg.data).toMatchObject({
      nombre: 'Laura Méndez',
      email: 'laura@liga.mx',
      rol: 'LIGA_ADMIN',
    });
    expect(arg.data.passwordHash).not.toContain('contraseña-123');
    expect(verifyPassword('contraseña-123', arg.data.passwordHash)).toBe(true);
  });

  it('crea su liga con una categoría (Varonil por defecto) y 30 días de prueba', async () => {
    await service.registrar(dto);
    const [[arg]] = tx.liga.create.mock.calls as [
      [
        {
          data: {
            nombre: string;
            propietarioId: string;
            categorias: { create: { nombre: string } };
            suscripcion: { create: { plan: string; pruebaHasta: Date } };
          };
        },
      ],
    ];
    expect(arg.data.nombre).toBe('Liga del Valle');
    expect(arg.data.propietarioId).toBe('u1');
    expect(arg.data.categorias.create.nombre).toBe('Varonil');
    expect(arg.data.suscripcion.create.plan).toBe('COMPLETO');
    expect(arg.data.suscripcion.create.pruebaHasta).toEqual(
      new Date('2026-11-22T18:00:00Z'),
    );
  });

  it('usa la categoría que escribió el organizador', async () => {
    await service.registrar({ ...dto, categoria: '  Mixto ' });
    const [[arg]] = tx.liga.create.mock.calls as [
      [{ data: { categorias: { create: { nombre: string } } } }],
    ];
    expect(arg.data.categorias.create.nombre).toBe('Mixto');
  });

  it('devuelve la sesión iniciada (mismo JWT que el login)', async () => {
    const r = await service.registrar(dto);
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'laura@liga.mx',
      rol: 'LIGA_ADMIN',
    });
    expect(r).toEqual({
      access_token: 'token-123',
      usuario: { sub: 'u1', email: 'laura@liga.mx', rol: 'LIGA_ADMIN' },
      ligaId: 'l1',
    });
  });

  it('un email ya registrado responde 409 sin crear la liga', async () => {
    tx.usuario.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(service.registrar(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.liga.create).not.toHaveBeenCalled();
  });
});
