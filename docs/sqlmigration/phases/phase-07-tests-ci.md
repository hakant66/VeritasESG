# Phase 7 — Tests, perf, hardening

**Plan reference:** Migration plan §12, §10 Phase 7 (4–6 days estimated)

## Planned

- Testcontainers Postgres (+ MySQL if dual-engine CI)
- `tests/server/api/db.*` green with `DB_DRIVER=sql`
- Apply migrations + `pgvector-and-partial-indexes.sql` in test setup
- Perf-check hot endpoints
- Rollback rehearsal

## Delivered

| Item | Status |
|------|--------|
| Typecheck of new SQL modules | Passes (`npm run lint` — baseline unchanged) |
| Mongo test baseline unchanged | `server` vitest project excludes `tests/server/sql/**` |
| **Testcontainers Postgres harness** | `tests/server/sql/globalSetup.ts`, `setup.ts`, `sqlTestHarness.ts` |
| **SQL API contract tests** | `tests/server/sql/db.api.test.ts` (28 cases, all green) |
| **Vitest `server-sql` project** | `vitest.config.ts` + `npm run test:server:sql` |
| **GitHub Actions workflow** | `.github/workflows/sql-tests.yml` |
| **Prisma validation → 400** | `handlePrismaWriteError` maps `PrismaClientValidationError` to `db/validation-error` |
| Local runbook | See below |

## Remaining

- [ ] Port legacy `tests/server/api/db.*` to dual-driver fixtures
- [ ] Optional MySQL matrix job in CI
- [ ] Auth/settings SQL integration tests (`makeApp` + `platformAuth`)
- [ ] Perf benchmarks: `projectQuestions`, `answers`, paged `auditLogs`, emissions aggregate

---

## Local runbook

Run the generic `/api/db/*` contract suite against a disposable Postgres
(pgvector) container via Testcontainers.

### Prerequisites

- Docker running locally
- `npm install` (includes `@testcontainers/postgresql` and `pg`)

### Commands

```bash
# Full SQL integration suite (~15s after image is cached)
npm run test:server:sql

# Skip when Docker is unavailable (suite reports skipped, exit 0)
npm run test:server:sql:skip
# or: SKIP_SQL_TESTS=1 npm run test:server:sql

# Mongo baseline (unchanged)
npm run test:server
```

### What runs

| Step | Detail |
|------|--------|
| Container | `pgvector/pgvector:pg16` via Testcontainers |
| Schema | `prisma db push` against ephemeral DB |
| Extras | `prisma/sql/pgvector-and-partial-indexes.sql` |
| Runtime | `DB_DRIVER=sql`, `DATABASE_URL` from container |
| Tests | `tests/server/sql/db.api.test.ts` |

### CI

GitHub Actions workflow: [`.github/workflows/sql-tests.yml`](../../.github/workflows/sql-tests.yml)

Runs on push/PR to `main`/`master` after `npm run db:generate`.

### Rollback rehearsal

If SQL tests fail in staging, flip back to Mongo:

```bash
DB_DRIVER=mongo npm run dev
# restore Mongo dump if needed: npm run seed:restore
```

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Postgres Testcontainer unavailable` | Start Docker; re-run without `SKIP_SQL_TESTS` |
| `prisma db push` fails | Run `npm run db:generate`; ensure `prisma/schema.prisma` provider is `postgresql` |
| Slow first run | Testcontainers pulls `pgvector/pgvector:pg16` once |

## Target CI sketch (implemented)

```yaml
# .github/workflows/sql-tests.yml
steps:
  - npm ci
  - npm run db:generate
  - npm run test:server:sql
  - npm run lint
```
