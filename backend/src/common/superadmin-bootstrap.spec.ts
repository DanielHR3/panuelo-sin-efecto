import { asegurarSuperadmin } from './superadmin-bootstrap';
import { verifyPassword } from './hashing';

const mockPrisma = {
  usuario: { upsert: jest.fn() },
};

describe('asegurarSuperadmin (arranque de la API)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.usuario.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: 'u1', ...create }),
    );
  });

  it('sin SEED_SUPERADMIN_PASSWORD no toca la base y devuelve null', async () => {
    const result = await asegurarSuperadmin(mockPrisma, {});
    expect(result).toBeNull();
    expect(mockPrisma.usuario.upsert).not.toHaveBeenCalled();
  });

  it('con contraseña hace upsert por email con el hash (nunca la contraseña en claro)', async () => {
    await asegurarSuperadmin(mockPrisma, {
      SEED_SUPERADMIN_PASSWORD: 'secreta-123',
    });

    const [arg] = mockPrisma.usuario.upsert.mock.calls[0] as [
      {
        where: { email: string };
        update: Record<string, unknown>;
        create: { email: string; rol: string; passwordHash: string };
      },
    ];
    expect(arg.where).toEqual({ email: 'danielhrubio3@gmail.com' });
    expect(arg.create.rol).toBe('SUPERADMIN');
    expect(arg.create.passwordHash).not.toContain('secreta-123');
    expect(verifyPassword('secreta-123', arg.create.passwordHash)).toBe(true);
  });

  it('no sobreescribe a un usuario que ya existe (update vacío)', async () => {
    await asegurarSuperadmin(mockPrisma, {
      SEED_SUPERADMIN_PASSWORD: 'secreta-123',
    });
    const [arg] = mockPrisma.usuario.upsert.mock.calls[0] as [
      { update: Record<string, unknown> },
    ];
    expect(arg.update).toEqual({});
  });

  it('respeta SEED_SUPERADMIN_EMAIL y SEED_SUPERADMIN_NOMBRE si vienen', async () => {
    await asegurarSuperadmin(mockPrisma, {
      SEED_SUPERADMIN_PASSWORD: 'x',
      SEED_SUPERADMIN_EMAIL: 'admin@liga.mx',
      SEED_SUPERADMIN_NOMBRE: 'Admin Liga',
    });
    const [arg] = mockPrisma.usuario.upsert.mock.calls[0] as [
      { where: { email: string }; create: { nombre: string } },
    ];
    expect(arg.where.email).toBe('admin@liga.mx');
    expect(arg.create.nombre).toBe('Admin Liga');
  });
});
