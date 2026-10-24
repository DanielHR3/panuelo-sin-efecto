import { depurar } from './depurar';

describe('depurar', () => {
  it('oculta contraseñas, tokens, CLABE y archivos a cualquier profundidad', () => {
    expect(
      depurar({
        email: 'a@b.c',
        password: 'x',
        nuevoPassword: 'y',
        access_token: 't',
        datos: { clabe: '014', archivo: 'z' },
      }),
    ).toEqual({
      email: 'a@b.c',
      password: '[oculto]',
      nuevoPassword: '[oculto]',
      access_token: '[oculto]',
      datos: { clabe: '[oculto]', archivo: '[oculto]' },
    });
  });

  it('recorta textos largos y listas grandes', () => {
    const r = depurar({
      t: 'a'.repeat(300),
      l: Array.from({ length: 25 }, (_, i) => i),
    }) as {
      t: string;
      l: unknown[];
    };
    expect(r.t).toHaveLength(201);
    expect(r.l).toHaveLength(21);
    expect(r.l[20]).toBe('[… 5 más]');
  });

  it('corta objetos muy anidados y convierte buffers en marcador', () => {
    expect(depurar({ a: { b: { c: { d: { e: 1 } } } } })).toEqual({
      a: { b: { c: { d: '[…]' } } },
    });
    expect(depurar({ f: Buffer.from('x') })).toEqual({ f: '[archivo]' });
  });
});
