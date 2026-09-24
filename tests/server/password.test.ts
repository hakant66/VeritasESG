import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../server/auth/password.ts';

describe('hashPassword', () => {
  it('returns the scrypt:<32-hex-salt>:<128-hex-hash> format', () => {
    const stored = hashPassword('correct horse battery staple');
    expect(stored).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it('produces different hashes for the same password (random salt)', () => {
    const a = hashPassword('same-password');
    const b = hashPassword('same-password');
    expect(a).not.toBe(b);

    const saltA = a.split(':')[1];
    const saltB = b.split(':')[1];
    expect(saltA).not.toBe(saltB);
  });
});

describe('verifyPassword', () => {
  it('round-trips a hashed password', () => {
    const stored = hashPassword('s3cr3t!');
    expect(verifyPassword('s3cr3t!', stored)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const stored = hashPassword('s3cr3t!');
    expect(verifyPassword('wrong', stored)).toBe(false);
  });

  it('returns false for an undefined stored hash', () => {
    expect(verifyPassword('anything', undefined)).toBe(false);
  });

  it('returns false for the wrong algorithm prefix', () => {
    const stored = hashPassword('s3cr3t!');
    const [, salt, hash] = stored.split(':');
    expect(verifyPassword('s3cr3t!', `bcrypt:${salt}:${hash}`)).toBe(false);
  });

  it('returns false when segments are missing (only one colon)', () => {
    const stored = hashPassword('s3cr3t!');
    const [, salt] = stored.split(':');
    expect(verifyPassword('s3cr3t!', `scrypt:${salt}`)).toBe(false);
  });

  it('returns false for a mismatched hash length', () => {
    const stored = hashPassword('s3cr3t!');
    const [, salt] = stored.split(':');
    expect(verifyPassword('s3cr3t!', `scrypt:${salt}:abcd`)).toBe(false);
  });

  it('round-trips a unicode password', () => {
    const stored = hashPassword('pärola-şifre-密码-🔐');
    expect(verifyPassword('pärola-şifre-密码-🔐', stored)).toBe(true);
    expect(verifyPassword('parola-sifre', stored)).toBe(false);
  });

  it('round-trips an empty-string password', () => {
    const stored = hashPassword('');
    expect(verifyPassword('', stored)).toBe(true);
    expect(verifyPassword('x', stored)).toBe(false);
  });
});
