/**
 * Password-reset + logout routes on `DB_DRIVER=sql`.
 *
 * Ported from the former Mongo-backed `tests/server/api/auth.reset.test.ts`.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { inject } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { makeSqlApp, TEST_JWT_SECRET } from '../helpers/makeSqlApp.ts';
import { clearSqlTables, createSqlPlatformUser } from '../helpers/sqlTestHarness.ts';
import { getPrisma } from '../../../server/data/prismaClient.ts';
import { hashPassword, verifyPassword } from '../../../server/auth/password.ts';

const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.vitest-sql-state.json',
);
const sqlState = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as { skipped?: boolean })
  : { skipped: false };

const describeSql = describe.skipIf(Boolean(sqlState.skipped));

async function createUser(email: string, password?: string, role = 'consultant') {
  return createSqlPlatformUser({
    name: email.split('@')[0],
    email,
    role,
    passwordHash: password ? hashPassword(password) : undefined,
  });
}

function resetTokenFor(userId: string, overrides?: Record<string, unknown>) {
  return jwt.sign(
    { purpose: 'password-reset', sub: userId, uid: userId, ...overrides },
    TEST_JWT_SECRET,
    { expiresIn: '1h' },
  );
}

describeSql('SQL password reset API', () => {
  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  describe('POST /api/auth/logout', () => {
    it('returns 200 with ok: true regardless of auth state', async () => {
      const res = await request(makeSqlApp()).post('/api/auth/logout').send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ok).toBe(true);
    });
  });

  describe('POST /api/auth/request-password-reset', () => {
    it('returns 400 when email is missing', async () => {
      const res = await request(makeSqlApp())
        .post('/api/auth/request-password-reset')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email required');
    });

    it('returns generic success without sending email for an unknown address', async () => {
      await createUser('existing@example.com');
      const sendEmail = vi.fn(async () => {});

      const res = await request(makeSqlApp({ sendEmail }))
        .post('/api/auth/request-password-reset')
        .send({ email: 'stranger@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/if an account exists/i);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('returns generic success and sends one email for a known address', async () => {
      await createUser('user@example.com');
      const sendEmail = vi.fn(async (_to: string, _subject: string, _text: string) => {});

      const res = await request(makeSqlApp({ sendEmail }))
        .post('/api/auth/request-password-reset')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/if an account exists/i);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail.mock.calls[0][0]).toBe('user@example.com');
    });

    it('email contains a valid password-reset JWT', async () => {
      await createUser('user@example.com');
      let capturedText = '';
      const sendEmail = vi.fn(async (_to: string, _sub: string, text: string) => {
        capturedText = text;
      });

      await request(makeSqlApp({ sendEmail }))
        .post('/api/auth/request-password-reset')
        .send({ email: 'user@example.com' });

      const tokenMatch = capturedText.match(/Reset token: (\S+)/);
      expect(tokenMatch).toBeTruthy();
      const decoded = jwt.verify(tokenMatch![1], TEST_JWT_SECRET) as Record<string, unknown>;
      expect(decoded.purpose).toBe('password-reset');
      expect(typeof decoded.sub).toBe('string');
    });

    it('is case-insensitive for the email lookup', async () => {
      await createUser('user@example.com');
      const sendEmail = vi.fn(async () => {});

      const res = await request(makeSqlApp({ sendEmail }))
        .post('/api/auth/request-password-reset')
        .send({ email: 'USER@EXAMPLE.COM' });

      expect(res.status).toBe(200);
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('returns 400 when token is missing', async () => {
      const res = await request(makeSqlApp())
        .post('/api/auth/reset-password')
        .send({ newPassword: 'newpass123' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('auth/missing-reset-fields');
    });

    it('returns 400 when newPassword is missing', async () => {
      const user = await createUser('user@example.com');
      const res = await request(makeSqlApp())
        .post('/api/auth/reset-password')
        .send({ token: resetTokenFor(user.id) });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('auth/missing-reset-fields');
    });

    it('returns 400 for a password shorter than 6 characters', async () => {
      const user = await createUser('user@example.com');
      const res = await request(makeSqlApp())
        .post('/api/auth/reset-password')
        .send({ token: resetTokenFor(user.id), newPassword: 'abc' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('auth/weak-password');
    });

    it('returns 401 for a token signed with the wrong secret', async () => {
      const user = await createUser('user@example.com');
      const token = jwt.sign(
        { purpose: 'password-reset', sub: user.id },
        'a-different-secret',
        { expiresIn: '1h' },
      );

      const res = await request(makeSqlApp())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'newpass123' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth/invalid-reset-token');
    });

    it('returns 401 for an expired token', async () => {
      const user = await createUser('user@example.com');
      const token = jwt.sign(
        { purpose: 'password-reset', sub: user.id, uid: user.id },
        TEST_JWT_SECRET,
        { expiresIn: '-1s' },
      );

      const res = await request(makeSqlApp())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'newpass123' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth/invalid-reset-token');
    });

    it('returns 401 for a JWT with a wrong purpose', async () => {
      const user = await createUser('user@example.com');
      const token = jwt.sign({ purpose: 'contact-access', sub: user.id }, TEST_JWT_SECRET, {
        expiresIn: '1h',
      });

      const res = await request(makeSqlApp())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'newpass123' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth/invalid-reset-token');
    });

    it('returns 404 when the user referenced in the token no longer exists', async () => {
      const user = await createUser('user@example.com');
      const token = resetTokenFor(user.id);
      await getPrisma().platformUser.delete({ where: { id: user.id } });

      const res = await request(makeSqlApp())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'newpass123' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('auth/user-not-found');
    });

    it('updates the password hash and returns success', async () => {
      const user = await createUser('user@example.com', 'old-password');
      const token = resetTokenFor(user.id);

      const res = await request(makeSqlApp())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'new-secure-password' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/password has been updated/i);

      const refreshed = await getPrisma().platformUser.findUnique({ where: { id: user.id } });
      const hash = refreshed?.passwordHash ?? undefined;
      expect(verifyPassword('new-secure-password', hash)).toBe(true);
      expect(verifyPassword('old-password', hash)).toBe(false);
      expect(refreshed?.isConfirmed).toBe(true);
      expect(refreshed?.passwordUpdatedAt).toBeInstanceOf(Date);
    });
  });
});
