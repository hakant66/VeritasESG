/**
 * `resolvePlatformUserFromRequest` contract against the SQL (Prisma) seam.
 *
 * Ported from the former Mongo-backed `tests/server/requestAuth.test.ts`.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { resolvePlatformUserFromRequest } from '../../../server/lib/requestAuth.ts';
import { getPrisma } from '../../../server/data/prismaClient.ts';
import { clearSqlTables, createSqlPlatformUser } from '../helpers/sqlTestHarness.ts';

const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.vitest-sql-state.json',
);
const sqlState = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as { skipped?: boolean })
  : { skipped: false };

const describeSql = describe.skipIf(Boolean(sqlState.skipped));

const JWT_SECRET = 'request-auth-test-secret';

/** Build a minimal Express-like Request with the given Authorization header. */
function makeRequest(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {},
  } as unknown as Request;
}

function bearer(payload: object, options?: jwt.SignOptions): string {
  return `Bearer ${jwt.sign(payload, JWT_SECRET, options)}`;
}

let emailCounter = 0;
async function createUser(overrides: { legacyFirebaseId?: string; email?: string } = {}) {
  emailCounter += 1;
  const user = await createSqlPlatformUser({
    name: `User ${emailCounter}`,
    email: overrides.email ?? `req-auth-user-${emailCounter}@example.com`,
    role: 'consultant',
  });
  if (overrides.legacyFirebaseId) {
    return getPrisma().platformUser.update({
      where: { id: user.id },
      data: { legacyFirebaseId: overrides.legacyFirebaseId },
    });
  }
  return user;
}

describeSql('resolvePlatformUserFromRequest (SQL)', () => {
  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  it('returns missing-token when there is no Authorization header', async () => {
    const result = await resolvePlatformUserFromRequest(makeRequest(), JWT_SECRET);
    expect(result).toEqual({ user: null, decoded: null, reason: 'missing-token' });
  });

  it('returns missing-token for a non-Bearer scheme', async () => {
    const result = await resolvePlatformUserFromRequest(
      makeRequest('Basic abc123'),
      JWT_SECRET,
    );
    expect(result.user).toBeNull();
    expect(result.reason).toBe('missing-token');
  });

  it('returns invalid-token for a bad signature', async () => {
    const token = jwt.sign({ uid: 'x' }, 'a-different-secret');
    const result = await resolvePlatformUserFromRequest(
      makeRequest(`Bearer ${token}`),
      JWT_SECRET,
    );
    expect(result.user).toBeNull();
    expect(result.decoded).toBeNull();
    expect(result.reason).toBe('invalid-token');
  });

  it('returns invalid-token for an expired token', async () => {
    const result = await resolvePlatformUserFromRequest(
      makeRequest(bearer({ uid: 'x' }, { expiresIn: '-1s' })),
      JWT_SECRET,
    );
    expect(result.user).toBeNull();
    expect(result.reason).toBe('invalid-token');
  });

  it('returns invalid-token when payload has no uid/sub/email', async () => {
    const result = await resolvePlatformUserFromRequest(
      makeRequest(bearer({ role: 'consultant' })),
      JWT_SECRET,
    );
    expect(result.user).toBeNull();
    expect(result.reason).toBe('invalid-token');
  });

  it('resolves a user by primary-key uid', async () => {
    const user = await createUser();
    const result = await resolvePlatformUserFromRequest(
      makeRequest(bearer({ uid: user.id })),
      JWT_SECRET,
    );
    expect(result.reason).toBeNull();
    expect(result.user?.id).toBe(user.id);
  });

  it('falls back to sub when uid is absent', async () => {
    const user = await createUser();
    const result = await resolvePlatformUserFromRequest(
      makeRequest(bearer({ sub: user.id })),
      JWT_SECRET,
    );
    expect(result.reason).toBeNull();
    expect(result.user?.id).toBe(user.id);
  });

  it('resolves a legacy uid via legacyFirebaseId', async () => {
    const user = await createUser({ legacyFirebaseId: 'legacy-uid-123' });
    const result = await resolvePlatformUserFromRequest(
      makeRequest(bearer({ uid: 'legacy-uid-123' })),
      JWT_SECRET,
    );
    expect(result.reason).toBeNull();
    expect(result.user?.id).toBe(user.id);
  });

  it('resolves an email-only token (normalized lowercase/trim)', async () => {
    const user = await createUser({ email: 'casey@example.com' });
    const result = await resolvePlatformUserFromRequest(
      makeRequest(bearer({ email: '  CASEY@Example.com  ' })),
      JWT_SECRET,
    );
    expect(result.reason).toBeNull();
    expect(result.user?.id).toBe(user.id);
  });

  it('returns user-not-found when a well-formed uid matches no user', async () => {
    const result = await resolvePlatformUserFromRequest(
      makeRequest(bearer({ uid: 'orphan-user-id-0001' })),
      JWT_SECRET,
    );
    expect(result.user).toBeNull();
    expect(result.reason).toBe('user-not-found');
  });

  it('rejects a contact magic-link token (no uid/sub/email) as a session bearer', async () => {
    const result = await resolvePlatformUserFromRequest(
      makeRequest(bearer({ projectId: 'p1', contactId: 'c1' })),
      JWT_SECRET,
    );
    expect(result.user).toBeNull();
    expect(result.reason).toBe('invalid-token');
  });
});
