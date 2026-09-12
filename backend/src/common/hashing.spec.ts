import { hashPassword, verifyPassword } from './hashing';

describe('hashing', () => {
  it('genera un hash con formato "<sal>:<derivada>" y sal aleatoria por llamada', () => {
    const a = hashPassword('misma-clave');
    const b = hashPassword('misma-clave');
    expect(a).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(a).not.toEqual(b);
  });

  it('verifica correctamente la contraseña correcta', () => {
    const stored = hashPassword('correcta-123');
    expect(verifyPassword('correcta-123', stored)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', () => {
    const stored = hashPassword('correcta-123');
    expect(verifyPassword('incorrecta', stored)).toBe(false);
  });

  it('devuelve false (sin lanzar) ante un hash con formato inválido', () => {
    expect(verifyPassword('x', 'no-es-un-hash')).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
  });
});
