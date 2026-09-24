# MongoDB -> SQL migration: implementation status

> **Status: COMPLETE.** MongoDB and Mongoose have been removed from the codebase. Postgres/Prisma is the only persistence backend; there is no `DB_DRIVER` flag anymore. This file is now a record of what shipped.

> **Canonical delivery journal:** [`docs/sqlmigration/README.md`](../sqlmigration/README.md) — planned vs delivered per phase, chronological log, local runbook.

Companion to [`mongo-to-sql-migration-plan.md`](mongo-to-sql-migration-plan.md). During the migration this file tracked what had been built and what remained; the app ran on MongoDB throughout, with every new SQL path additive and gated by `DB_DRIVER` / `VECTOR_BACKEND`. That gating is gone — the SQL path is the only path.

## Runtime switches (current)

- ~~`DB_DRIVER`~~ — **removed.** Prisma/Postgres is unconditional.
- `DATABASE_URL` — Postgres or MySQL (pick engine with `npm run db:provider`).
- `VECTOR_BACKEND` = `pgvector` (default) | `qdrant` | `disabled`.
- `VECTOR_DATABASE_URL` — Postgres holding `kb_chunks` + embeddings (reuse `DATABASE_URL` on a PG core; sidecar on a MySQL core).

`MONGODB_URI` is no longer read by anything and has been dropped from `.env.example`.

## What shipped

- Provider-neutral Prisma schema for all models: [`prisma/schema.prisma`](../../prisma/schema.prisma) + engine swap [`prisma/set-provider.mjs`](../../prisma/set-provider.mjs). This is now the single source of truth for the data model (`server/models/index.ts` is deleted).
- Raw SQL for what Prisma can't express (partial unique, pgvector, tsvector): [`prisma/sql/pgvector-and-partial-indexes.sql`](../../prisma/sql/pgvector-and-partial-indexes.sql).
- Collection/reference registry: [`server/data/migration/schemaMap.ts`](../../server/data/migration/schemaMap.ts) — originally built for the ETL, still used by `prismaResourceRepository` to resolve resource names and reference fields.
- Repository seam + Prisma implementation: [`server/data/resourceRepository.ts`](../../server/data/resourceRepository.ts), [`server/data/prismaResourceRepository.ts`](../../server/data/prismaResourceRepository.ts), factory [`server/data/index.ts`](../../server/data/index.ts). `getSqlResourceRepository()` now always returns a repository (it used to return `null` on the Mongo driver).
- Shared serialize/input helpers: [`server/lib/apiSerialize.ts`](../../server/lib/apiSerialize.ts), [`server/lib/apiInput.ts`](../../server/lib/apiInput.ts).
- Generic `/api/db/:resource` (list/get/create/bulk/patch/put/delete), `/api/settings`, and `answers/upsert`: [`server/data/genericApiSql.ts`](../../server/data/genericApiSql.ts) + [`server/routes/mongoApi.ts`](../../server/routes/mongoApi.ts) (the file name is historical; it contains no Mongo code).
- Specialized routes — auth, emissions, materiality, DMA assessments, compliance, climate, workflow (assignments / on-behalf / audit), KB metadata, scheduler, customer API, demo seed — all on Prisma via `server/data/*DataAccess.ts`.
- Vector/keyword search seam (pgvector + qdrant + disabled): [`server/data/vector/`](../../server/data/vector/); KB ingest routed through it in [`server/lib/rag/ingestKbDocument.ts`](../../server/lib/rag/ingestKbDocument.ts).
- Engine-aware backup command + OTP TTL replacement (Mongo's TTL index has no SQL equivalent): [`server/lib/backupCommand.ts`](../../server/lib/backupCommand.ts), [`server/lib/otpCleanup.ts`](../../server/lib/otpCleanup.ts).
- SQL integration tests against ephemeral Postgres (Testcontainers): `tests/server/sql/**`, run with `npm run test:server:sql`, plus the `.github/workflows/sql-tests.yml` CI job.

`GET /api/health` now returns `{ status, timestamp, env, dbDriver: 'sql', sqlReady }` — the old `mongoReady` field is gone.

## Cleanup performed at the end of the migration

- Deleted: `server/models/index.ts` (all Mongoose schemas), `server/db/mongo.ts`, `server/migrations/**`, `server/migration/firestoreExport.ts`.
- Deleted: the `mongoose` dependency, the `mongo` service + `mongo_data` volume in `docker-compose.yml`, and the `seed/mongo-dump/` archive.
- Deleted: every Mongo-only script under `scripts/` (ETL, audit, validators, Firestore import, one-off backfills) and their npm aliases — see [`../sqlmigration/artifact-index.md`](../sqlmigration/artifact-index.md) for the full list.
- Removed: `MONGODB_URI` and `DB_DRIVER` from `.env.example`; all `isSqlDriver()` branches in routes and data-access files.

## Deliberately kept

- `legacyFirebaseId` columns and the `OR legacyFirebaseId` id fallback — rows migrated from Firestore still carry these, and old links still resolve through them. Dropping them is optional future work, not part of this migration.
- The Firestore-shaped frontend shim `src/services/db.ts` — it is the abstraction that made the migration invisible to the UI.
- `docs/archive/firebase-blueprint.json` — reference only, not used at runtime.
- The Qdrant adapter and the `qdrant` compose service — `VECTOR_BACKEND=qdrant` remains a supported configuration.

## Historical runbook (no longer runnable)

The staging procedure below was how the cutover was rehearsed and executed. **It cannot be re-run**: `audit:mongo`, `migrate:mongo-to-sql`, `migrate:validate-sql`, and `migrate:embeddings-pgvector` were deleted along with their scripts. Kept here as a record.

```bash
npm run db:provider postgresql
export DATABASE_URL=postgresql://governance:governance@localhost:5432/governance
export VECTOR_DATABASE_URL="$DATABASE_URL"
npm run db:generate && npm run db:deploy
psql "$DATABASE_URL" -f prisma/sql/pgvector-and-partial-indexes.sql
npm run audit:mongo                 # review data quality      [script deleted]
npm run migrate:mongo-to-sql -- --dry-run                      # [script deleted]
npm run migrate:mongo-to-sql                                   # [script deleted]
npm run migrate:validate-sql        # count parity             [script deleted]
npm run migrate:embeddings-pgvector # copy vectors from Qdrant [script deleted]
DB_DRIVER=sql VECTOR_BACKEND=pgvector npm run dev   # flag no longer exists
```

For today's setup, see [`../sqlmigration/local-dev-runbook.md`](../sqlmigration/local-dev-runbook.md) and `CLAUDE.md` → "Database Setup & Seeds".
