/**
 * Starts a disposable Postgres (pgvector) container, applies Prisma schema +
 * pgvector extras, and exposes the connection URL to test workers via Vitest
 * `provide` / `inject`.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const statePath = path.join(repoRoot, '.vitest-sql-state.json');

let container: StartedPostgreSqlContainer | undefined;

function writeState(state: { skipped: boolean; reason?: string; databaseUrl?: string }) {
  writeFileSync(statePath, JSON.stringify(state), 'utf8');
}

function shouldSkipSqlTests(): boolean {
  const flag = process.env.SKIP_SQL_TESTS?.trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

async function applyPgExtras(databaseUrl: string): Promise<void> {
  const sqlPath = path.join(repoRoot, 'prisma/sql/pgvector-and-partial-indexes.sql');
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(readFileSync(sqlPath, 'utf8'));
  } finally {
    await client.end();
  }
}

function pushPrismaSchema(databaseUrl: string): void {
  // Use inherit/ignore — `stdio: 'pipe'` can deadlock when Prisma's stdout
  // fills the OS pipe buffer on large schemas (CI hangs with no further logs).
  console.log('[sql-tests] prisma db push starting…');
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
  console.log('[sql-tests] prisma db push finished');
}

export default async function globalSetup(project: TestProject) {
  if (shouldSkipSqlTests()) {
    writeState({ skipped: true, reason: 'SKIP_SQL_TESTS is set' });
    project.provide('sqlTestsSkipped', '1');
    project.provide('sqlTestsSkipReason', 'SKIP_SQL_TESTS is set');
    return async () => undefined;
  }

  // Prefer an externally provisioned DB (e.g. GitHub Actions `services:`) so CI
  // does not depend on Testcontainers / Docker-in-Docker startup.
  const externalUrl = process.env.SQL_TEST_DATABASE_URL?.trim();
  if (externalUrl) {
    try {
      console.log('[sql-tests] Using SQL_TEST_DATABASE_URL (external Postgres)');
      pushPrismaSchema(externalUrl);
      console.log('[sql-tests] Applying pgvector extras…');
      await applyPgExtras(externalUrl);
      console.log('[sql-tests] External DB ready');
      writeState({ skipped: false, databaseUrl: externalUrl });
      project.provide('sqlDatabaseUrl', externalUrl);
      return async () => {
        writeState({ skipped: true, reason: 'teardown' });
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[sql-tests] External SQL_TEST_DATABASE_URL failed:', message);
      writeState({ skipped: true, reason: message });
      project.provide('sqlTestsSkipped', '1');
      project.provide('sqlTestsSkipReason', message);
      return async () => undefined;
    }
  }

  try {
    container = await new PostgreSqlContainer('pgvector/pgvector:pg16')
      .withDatabase('governance')
      .withUsername('governance')
      .withPassword('governance')
      .withStartupTimeout(120_000)
      .start();

    const databaseUrl = container.getConnectionUri();
    pushPrismaSchema(databaseUrl);
    await applyPgExtras(databaseUrl);
    writeState({ skipped: false, databaseUrl });

    project.provide('sqlDatabaseUrl', databaseUrl);

    return async () => {
      await container?.stop();
      container = undefined;
      writeState({ skipped: true, reason: 'teardown' });
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[sql-tests] Postgres Testcontainer unavailable:', message);
    await container?.stop().catch(() => undefined);
    container = undefined;
    writeState({ skipped: true, reason: message });
    project.provide('sqlTestsSkipped', '1');
    project.provide('sqlTestsSkipReason', message);
    return async () => undefined;
  }
}
