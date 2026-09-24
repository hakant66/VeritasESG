# MongoDB → SQL migration — implementation log

> **Status: COMPLETE.** All eight phases delivered, production cut over to PostgreSQL, and MongoDB/Mongoose removed from the codebase. This folder is now a historical record of how the migration was done, not a live plan.

Persistent record of **what was planned** and **what was delivered** for the GovernanceIQ relational migration. This folder is the canonical delivery journal; the original proposal lives in [`../migration/mongo-to-sql-migration-plan.md`](../migration/mongo-to-sql-migration-plan.md).

## How to read this folder

| Document | Purpose |
|----------|---------|
| [`00-decisions-and-scope.md`](00-decisions-and-scope.md) | Locked architecture decisions and migration scope |
| [`01-delivery-log.md`](01-delivery-log.md) | Chronological delivery journal (plan → build → ops → removal) |
| [`phases/`](phases/) | Per-phase **planned / delivered / remaining** detail — frozen as written at the time |
| [`artifact-index.md`](artifact-index.md) | Code, schema, and script inventory by phase (marks what was deleted post-migration) |
| [`staging-prod-etl-runbook.md`](staging-prod-etl-runbook.md) | **Historical** — the ETL procedure that was executed; no longer runnable |
| [`prod-cutover-checklist.md`](prod-cutover-checklist.md) | **Historical** — the cutover checklist that was executed |
| [`local-dev-runbook.md`](local-dev-runbook.md) | **Live** — current Postgres-only local dev setup |
| [`current-status.md`](current-status.md) | Final snapshot |
| [`reports/`](reports/) | Dated audit / ETL / validation outputs — frozen record |

The `phases/` docs and `reports/` files are deliberately **not** updated to reflect the finished state; they are dated logs of work as it happened.

## Phase index

| Phase | Topic | Status |
|-------|--------|--------|
| [0](phases/phase-00-discovery.md) | Discovery & data-quality audit | **Complete** (tooling since deleted) |
| [1](phases/phase-01-schema.md) | Prisma schema (45 tables) | **Complete** |
| [2](phases/phase-02-repository-seam.md) | Repository seam | **Complete** |
| [3](phases/phase-03-generic-api.md) | Generic `/api/db/*` on SQL | **Complete** |
| [4](phases/phase-04-specialized-routes.md) | Specialized routes + auth | **Complete** (Batch A–E + admin/customer API + demo seed) |
| [5](phases/phase-05-search-vector.md) | pgvector / search seam | **Complete** (pgvector default; Qdrant adapter retained) |
| [6](phases/phase-06-etl.md) | ETL + cross-DB validator | **Complete** (executed, then tooling deleted) |
| [7](phases/phase-07-tests-ci.md) | Testcontainers / CI on SQL | **Complete** (`tests/server/sql/**`, `npm run test:server:sql`) |
| [8](phases/phase-08-cutover-cleanup.md) | Cutover + remove Mongo | **Complete** |

## What the final state looks like

- **Postgres/Prisma only.** No `DB_DRIVER` flag, no `mongoose` dependency, no `server/models/index.ts`, no `server/db/mongo.ts`, no `server/migrations/**`.
- `prisma/schema.prisma` is the source of truth for the data model.
- `docker-compose.yml` runs app + postgres + minio + redis + qdrant. The `mongo` service, `mongo_data` volume and `seed/mongo-dump/` archive are gone.
- `GET /api/health` returns `{ status, timestamp, env, dbDriver: 'sql', sqlReady }`.
- Every Mongo-only npm script (`audit:mongo`, `migrate:mongo-to-sql`, `migrate:validate-sql`, `migrate:embeddings-pgvector`, `migrate:import`, `migrate:validate`, `seed:dump`, `seed:restore`, `sql:etl*`, …) has been removed along with its script file.
- **Rollback to MongoDB is not possible.** The Mongo code path no longer exists.

## Runtime flags (quick reference)

```bash
DATABASE_URL=...         # Postgres (or MySQL) — required
VECTOR_BACKEND=pgvector  # default | qdrant | disabled
VECTOR_DATABASE_URL=...  # Postgres for kb_chunks + embeddings (= DATABASE_URL on a PG core)
```

`DB_DRIVER` and `MONGODB_URI` no longer exist; setting them has no effect.

## Related docs

- [Migration plan (proposal + completion summary)](../migration/mongo-to-sql-migration-plan.md)
- [Implementation status (short companion)](../migration/mongo-to-sql-implementation-status.md)
- [Prisma README](../../prisma/README.md)
- [ADR index](../adr/) — platform ADRs; P1 ADRs are separate compliance work
