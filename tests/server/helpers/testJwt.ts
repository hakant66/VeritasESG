/**
 * Shared JWT constants/helpers for server-side tests.
 *
 * Kept separate from `makeSqlApp.ts` so lightweight (non-DB) tests can sign
 * tokens without pulling in Express/Prisma route wiring.
 */
import jwt from 'jsonwebtoken';

export const TEST_JWT_SECRET = 'test-secret-for-tests-only';

export function signTestToken(payload: object, expiresIn = '1h') {
  return jwt.sign(payload, TEST_JWT_SECRET, {
    expiresIn,
  } as jwt.SignOptions);
}
