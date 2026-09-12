import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEYLEN = 64;

/**
 * Deriva un hash de la contraseña con scrypt (KDF nativo de Node) y una sal
 * aleatoria. Formato almacenado: "<sal-hex>:<derivada-hex>".
 *
 * Se usa scrypt en vez de bcrypt/argon2 para no añadir dependencias nativas.
 * Migrar a argon2id si el proyecto lo justifica más adelante.
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(plain, salt, KEYLEN).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verifica una contraseña contra un hash generado por {@link hashPassword}.
 * Comparación en tiempo constante para evitar timing attacks. Devuelve `false`
 * ante cualquier formato inválido en vez de lanzar.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;

  const derivedKey = scryptSync(plain, salt, KEYLEN);
  const storedKey = Buffer.from(keyHex, 'hex');
  if (storedKey.length !== derivedKey.length) return false;

  return timingSafeEqual(storedKey, derivedKey);
}
