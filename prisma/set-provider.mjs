// Swaps the Prisma datasource provider between PostgreSQL and MySQL so the same
// provider-neutral schema can target either engine per deployment.
//
//   node prisma/set-provider.mjs postgresql   (or: postgres | pg)
//   node prisma/set-provider.mjs mysql
//   DB_PROVIDER=mysql node prisma/set-provider.mjs
//
// After swapping, run `npm run db:generate` (and migrations) for that engine.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, 'schema.prisma');

const arg = (process.argv[2] || process.env.DB_PROVIDER || '').toLowerCase();
const provider =
  arg === 'mysql' || arg === 'maria' || arg === 'mariadb'
    ? 'mysql'
    : arg === 'postgres' || arg === 'postgresql' || arg === 'pg'
      ? 'postgresql'
      : '';

if (!provider) {
  console.error('Usage: node prisma/set-provider.mjs <postgresql|mysql>');
  process.exit(1);
}

const schema = readFileSync(schemaPath, 'utf8');
const swapped = schema.replace(
  /(datasource db \{[\s\S]*?provider\s*=\s*)"[^"]+"/,
  `$1"${provider}"`,
);

if (swapped === schema && !schema.includes(`provider = "${provider}"`)) {
  console.error('Could not locate datasource provider line to swap.');
  process.exit(1);
}

writeFileSync(schemaPath, swapped);
console.log(`Prisma datasource provider set to "${provider}". Run: npm run db:generate`);
