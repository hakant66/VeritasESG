// Applies Prisma migrations using the folder that matches schema.prisma's
// datasource provider. The repo keeps MySQL DDL in prisma/migrations and
// PostgreSQL DDL in prisma/migrations-postgresql; this script avoids
// accidentally running the wrong engine's migrations against DATABASE_URL.
//
// Usage: node prisma/migrate-deploy.mjs   (via npm run db:deploy)

import { cpSync, mkdtempSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function readSchemaProvider() {
  const schema = readFileSync(join(here, 'schema.prisma'), 'utf8');
  const match = schema.match(/provider\s*=\s*"([^"]+)"/);
  if (!match) {
    console.error('[db:deploy] Could not read datasource provider from prisma/schema.prisma');
    process.exit(1);
  }
  return match[1];
}

function migrationsSourceFor(provider) {
  if (provider === 'postgresql') return join(here, 'migrations-postgresql');
  if (provider === 'mysql') return join(here, 'migrations');
  console.error(`[db:deploy] Unsupported Prisma provider "${provider}". Expected postgresql or mysql.`);
  process.exit(1);
}

function deployFrom(sourceDir, provider) {
  const tmp = mkdtempSync(join(tmpdir(), 'giq-prisma-deploy-'));
  try {
    mkdirSync(join(tmp, 'prisma'));
    cpSync(join(here, 'schema.prisma'), join(tmp, 'prisma/schema.prisma'));
    cpSync(sourceDir, join(tmp, 'prisma/migrations'), { recursive: true });
    console.log(`[db:deploy] Applying ${provider} migrations from ${sourceDir.replace(`${root}/`, '')}`);
    execSync('npx prisma migrate deploy --schema prisma/schema.prisma', {
      cwd: tmp,
      stdio: 'inherit',
      env: process.env,
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const provider = readSchemaProvider();
if (!process.env.DATABASE_URL) {
  console.error('[db:deploy] DATABASE_URL is required.');
  process.exit(1);
}

const source = migrationsSourceFor(provider);
const lockPath = join(source, 'migration_lock.toml');
try {
  const lock = readFileSync(lockPath, 'utf8');
  const lockProvider = lock.match(/provider\s*=\s*"([^"]+)"/)?.[1];
  if (lockProvider && lockProvider !== provider) {
    console.error(
      `[db:deploy] Provider mismatch: schema.prisma is "${provider}" but ${lockPath} is "${lockProvider}".`,
    );
    process.exit(1);
  }
} catch {
  console.error(`[db:deploy] Missing migration lock at ${lockPath}`);
  process.exit(1);
}

deployFrom(source, provider);
