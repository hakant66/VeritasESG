/**
 * Auth routes on `DB_DRIVER=sql` (platformAuth + Prisma).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { inject } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { makeSqlApp, TEST_JWT_SECRET } from '../helpers/makeSqlApp.ts';
import {
  clearSqlTables,
  seedSqlPlatformUser,
  sqlTestsSkipReason,
} from '../helpers/sqlTestHarness.ts';
import { getPrisma } from '../../../server/data/prismaClient.ts';

const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.vitest-sql-state.json',
);
const sqlState = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as { skipped?: boolean; reason?: string })
  : { skipped: false };

const describeSql = describe.skipIf(Boolean(sqlState.skipped));

describeSql('SQL auth API', () => {
  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  it('skips with reason when Testcontainers unavailable', () => {
    if (sqlState.skipped) {
      console.warn('[sql-tests] Skipped:', sqlState.reason ?? sqlTestsSkipReason());
    }
    expect(true).toBe(true);
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when credentials are missing', async () => {
      const res = await request(makeSqlApp()).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('auth/missing-credentials');
    });

    it('returns 401 for unknown email', async () => {
      const res = await request(makeSqlApp())
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'secret123' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth/user-not-found');
    });

    it('returns 401 for wrong password', async () => {
      await seedSqlPlatformUser({ password: 'correct-password' });
      const res = await request(makeSqlApp())
        .post('/api/auth/login')
        .send({ email: 'sql-tester@example.com', password: 'wrong-password' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth/wrong-password');
    });

    it('returns token, user, and profile for valid credentials', async () => {
      const seeded = await seedSqlPlatformUser({ password: 'correct-password' });
      const res = await request(makeSqlApp())
        .post('/api/auth/login')
        .send({ email: seeded.email, password: 'correct-password' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.profile.email).toBe(seeded.email);
      expect(res.body.data.profile.role).toBe('platform_admin');
      expect(res.body.data.user.displayName).toBeTruthy();

      const decoded = jwt.verify(res.body.data.token, TEST_JWT_SECRET) as Record<string, unknown>;
      expect(decoded.uid).toBe(seeded.id);
      expect(decoded.email).toBe(seeded.email);
    });

    it('sets lastLoginAt and isConfirmed on successful login', async () => {
      const seeded = await seedSqlPlatformUser({ password: 'correct-password' });
      await getPrisma().platformUser.update({
        where: { id: seeded.id },
        data: { isConfirmed: false, lastLoginAt: null },
      });

      const res = await request(makeSqlApp())
        .post('/api/auth/login')
        .send({ email: seeded.email, password: 'correct-password' });
      expect(res.status).toBe(200);

      const user = await getPrisma().platformUser.findUnique({ where: { id: seeded.id } });
      expect(user?.isConfirmed).toBe(true);
      expect(user?.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without a bearer token', async () => {
      const res = await request(makeSqlApp()).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth/invalid-token');
    });

    it('returns profile for a valid session token', async () => {
      const seeded = await seedSqlPlatformUser();
      const res = await request(makeSqlApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${seeded.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.email).toBe(seeded.email);
      expect(res.body.data.user.id).toBe(seeded.id);
      expect(res.body.data.profile.passwordHash).toBeUndefined();
    });

    it('returns 401 for an expired token', async () => {
      const seeded = await seedSqlPlatformUser();
      const token = jwt.sign({ uid: seeded.id, sub: seeded.id }, TEST_JWT_SECRET, {
        expiresIn: '-1s',
      });

      const res = await request(makeSqlApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 for a tampered token', async () => {
      const seeded = await seedSqlPlatformUser();
      const token = jwt.sign({ uid: seeded.id, sub: seeded.id }, 'a-different-secret');

      const res = await request(makeSqlApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 when the user was deleted after the token was issued', async () => {
      const seeded = await seedSqlPlatformUser();
      await getPrisma().platformUser.delete({ where: { id: seeded.id } });

      const res = await request(makeSqlApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${seeded.token}`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns success', async () => {
      const res = await request(makeSqlApp()).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ok).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // OTP login
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/otp/request', () => {
    const GENERIC_MESSAGE = 'If an account exists, a login code has been sent.';

    it('returns 400 when email is missing', async () => {
      const res = await request(makeSqlApp()).post('/api/auth/otp/request').send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('auth/missing-email');
    });

    it('bootstraps the first user as platform_admin and sends a code', async () => {
      const sendEmail = vi.fn(async () => {});
      const res = await request(makeSqlApp({ sendEmail }))
        .post('/api/auth/otp/request')
        .send({ email: 'first@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe(GENERIC_MESSAGE);

      const created = await getPrisma().platformUser.findUnique({
        where: { email: 'first@example.com' },
      });
      expect(created).toBeTruthy();
      expect(created?.role).toBe('platform_admin');
      expect(sendEmail).toHaveBeenCalledTimes(1);

      const otp = await getPrisma().otpCode.findUnique({
        where: { email: 'first@example.com' },
      });
      expect(otp).toBeTruthy();
    });

    it('does not create a user or OTP for an unknown email once users exist', async () => {
      await seedSqlPlatformUser();
      const sendEmail = vi.fn(async () => {});

      const res = await request(makeSqlApp({ sendEmail }))
        .post('/api/auth/otp/request')
        .send({ email: 'stranger@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe(GENERIC_MESSAGE);

      const stranger = await getPrisma().platformUser.findUnique({
        where: { email: 'stranger@example.com' },
      });
      expect(stranger).toBeNull();
      const otp = await getPrisma().otpCode.findUnique({
        where: { email: 'stranger@example.com' },
      });
      expect(otp).toBeNull();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('upserts an OTP with a future expiry and emails an existing user', async () => {
      const seeded = await seedSqlPlatformUser();
      const sendEmail = vi.fn(
        async (_to: string, _subject: string, _text: string) => {},
      );

      const res = await request(makeSqlApp({ sendEmail }))
        .post('/api/auth/otp/request')
        .send({ email: seeded.email });

      expect(res.status).toBe(200);
      const otp = await getPrisma().otpCode.findUnique({ where: { email: seeded.email } });
      expect(otp).toBeTruthy();
      expect(otp!.expiresAt.getTime()).toBeGreaterThan(Date.now());

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail.mock.calls[0][0]).toBe(seeded.email);
    });
  });

  describe('POST /api/auth/otp/verify', () => {
    it('returns 400 when fields are missing', async () => {
      const res = await request(makeSqlApp()).post('/api/auth/otp/verify').send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('auth/missing-otp');
    });

    it('returns 400 for a wrong code', async () => {
      const seeded = await seedSqlPlatformUser();
      await getPrisma().otpCode.create({
        data: { email: seeded.email, code: '123456', expiresAt: new Date(Date.now() + 600_000) },
      });

      const res = await request(makeSqlApp())
        .post('/api/auth/otp/verify')
        .send({ email: seeded.email, code: '000000' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('auth/invalid-otp');
    });

    it('returns 400 for an expired OTP', async () => {
      const seeded = await seedSqlPlatformUser();
      await getPrisma().otpCode.create({
        data: { email: seeded.email, code: '123456', expiresAt: new Date(Date.now() - 1_000) },
      });

      const res = await request(makeSqlApp())
        .post('/api/auth/otp/verify')
        .send({ email: seeded.email, code: '123456' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('auth/invalid-otp');
    });

    it('returns a token, deletes the OTP, and confirms the user for a valid code', async () => {
      const seeded = await seedSqlPlatformUser();
      await getPrisma().platformUser.update({
        where: { id: seeded.id },
        data: { isConfirmed: false },
      });
      await getPrisma().otpCode.create({
        data: { email: seeded.email, code: '123456', expiresAt: new Date(Date.now() + 600_000) },
      });

      const res = await request(makeSqlApp())
        .post('/api/auth/otp/verify')
        .send({ email: seeded.email, code: '123456' });

      expect(res.status).toBe(200);
      expect(typeof res.body.data.token).toBe('string');

      const otp = await getPrisma().otpCode.findUnique({ where: { email: seeded.email } });
      expect(otp).toBeNull();

      const refreshed = await getPrisma().platformUser.findUnique({ where: { id: seeded.id } });
      expect(refreshed?.isConfirmed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Contact magic-link tokens
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/generate-token', () => {
    it('returns 400 when projectId is missing', async () => {
      const res = await request(makeSqlApp())
        .post('/api/auth/generate-token')
        .send({ contactId: 'c1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing data');
    });

    it('returns 400 when contactId is missing', async () => {
      const res = await request(makeSqlApp())
        .post('/api/auth/generate-token')
        .send({ projectId: 'p1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing data');
    });

    it('returns a token whose payload carries projectId and contactId', async () => {
      const res = await request(makeSqlApp())
        .post('/api/auth/generate-token')
        .send({ projectId: 'p1', contactId: 'c1' });

      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe('string');

      const decoded = jwt.verify(res.body.token, TEST_JWT_SECRET) as Record<string, unknown>;
      expect(decoded.projectId).toBe('p1');
      expect(decoded.contactId).toBe('c1');
    });
  });

  describe('POST /api/auth/validate-token', () => {
    it('returns 400 when the token is missing', async () => {
      const res = await request(makeSqlApp()).post('/api/auth/validate-token').send({});
      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
    });

    it('returns the decoded payload for a valid token', async () => {
      const token = jwt.sign({ projectId: 'p1', contactId: 'c1' }, TEST_JWT_SECRET, {
        expiresIn: '7d',
      });

      const res = await request(makeSqlApp())
        .post('/api/auth/validate-token')
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.decoded.projectId).toBe('p1');
      expect(res.body.decoded.contactId).toBe('c1');
    });

    it('returns 401 for a tampered signature', async () => {
      const token = jwt.sign({ projectId: 'p1', contactId: 'c1' }, 'a-different-secret');

      const res = await request(makeSqlApp())
        .post('/api/auth/validate-token')
        .send({ token });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe('Invalid token signature');
    });

    it('returns 401 for an expired token', async () => {
      const token = jwt.sign({ projectId: 'p1', contactId: 'c1' }, TEST_JWT_SECRET, {
        expiresIn: '-1s',
      });

      const res = await request(makeSqlApp())
        .post('/api/auth/validate-token')
        .send({ token });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe('Token has expired');
    });
  });

});
