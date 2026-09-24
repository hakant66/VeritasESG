import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');

  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string) {
  if (!storedHash) return false;

  const [algorithm, salt, hash] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;

  const candidate = Buffer.from(scryptSync(password, salt, KEY_LENGTH).toString('hex'), 'hex');
  const expected = Buffer.from(hash, 'hex');

  if (candidate.length !== expected.length) return false;

  return timingSafeEqual(candidate, expected);
}
