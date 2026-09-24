/**
 * Per-worker setup for the `server-sql` Vitest project.
 */
import { afterAll, beforeAll } from 'vitest';
import { inject } from 'vitest';
import { disconnectPrisma } from '../../../server/data/prismaClient.ts';

beforeAll(async () => {
  if (inject('sqlTestsSkipped') === '1') return;

  const databaseUrl = inject('sqlDatabaseUrl');
  if (!databaseUrl) {
    throw new Error('sqlDatabaseUrl was not provided by globalSetup');
  }

  process.env.DATABASE_URL = databaseUrl;
  process.env.VECTOR_DATABASE_URL = databaseUrl;
  process.env.DB_DRIVER = 'sql';
  process.env.JWT_SECRET = 'test-secret-for-tests-only';
  process.env.PLATFORM_API_KEY = 'test-platform-api-key';

  await disconnectPrisma();
});

afterAll(async () => {
  if (inject('sqlTestsSkipped') === '1') return;
  await disconnectPrisma();
});
