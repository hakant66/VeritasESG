# Current status snapshot

**Status:** ✅ **Migration complete.** Production runs on PostgreSQL; MongoDB and Mongoose have been removed from the codebase.

**Last updated:** Mongo removal delivery — models, driver flag, ETL tooling, compose service and seed dump deleted.

## Overall progress

```
Phase 0  ████████████████████ 100%  discovery + audit (tooling since deleted)
Phase 1  ████████████████████ 100%  schema + committed migrations (baseline + pgvector)
Phase 2  ████████████████████ 100%  repository seam
Phase 3  ████████████████████ 100%  generic API + SQL contract tests
Phase 4  ████████████████████ 100%  all routes on Prisma (incl. demo seed)
Phase 5  ████████████████████ 100%  pgvector default; Qdrant adapter retained
Phase 6  ████████████████████ 100%  ETL executed (local, staging, production)
Phase 7  ████████████████████ 100%  Testcontainers harness + SQL tests + CI workflow
Phase 8  ████████████████████ 100%  cutover done; Mongo removed from the codebase
```

## What runs today

Everything, on Postgres via Prisma — there is no second code path to qualify this with anymore:

| Area | Notes |
|------|-------|
| Login, OTP, password reset, `/api/auth/me` | `server/data/platformAuth.ts`, `server/lib/requestAuth.ts` |
| Generic `/api/db/*` CRUD + settings + answer upsert | `server/data/genericApiSql.ts`, `server/routes/mongoApi.ts` (name is historical) |
| Emissions + materiality + DMA + compliance + climate | `server/data/*Sql.ts` / `*DataAccess.ts` |
| Assignments, audit review, on-behalf, KB metadata, scheduler | Batch C–D data access |
| Lib helpers: clone/expand questions, assignment sync, LLM settings, RAG autofill, audit logs | Batch E |
| Customer API (`/api/v1/customer/*`), admin set-password, contact-conflict ops | |
| Quick-assignment + merge-assignments, demo seed route | `server/routes/demoSeedRoute.ts` ported last |
| Boot seeds (emission factors, GFANZ, levers, frameworks) | `bootstrapPersistence` uses Prisma only |
| KB ingest / RAG | pgvector by default (`VECTOR_BACKEND`) |

## ETL record

| Environment | Audit | ETL | Validate | Reports |
|-------------|-------|-----|----------|---------|
| **Local** (docker seed) | Done | Done (idempotent) | All collections match | `reports/*-local-2026-07-02.txt` |
| **Local staging** (`governance_migration`) | Done | Done | All collections match | `reports/*-staging-local.txt` |
| **Local staging smoke** | — | — | Passed | health, auth, 26 customers, projects, customer API |
| **Production** | Done | Done | Passed (cutover gate) | — |

The ETL scripts themselves (`migrate-mongo-to-sql.ts`, `validate-sql-migration.ts`, `audit-mongo-data.ts`) have since been deleted; the reports above are the surviving record.

## Blockers

None. The migration is closed.

## Known follow-ups (optional, not blocking)

1. **`legacyFirebaseId` columns and the `OR legacyFirebaseId` id fallback are still in place** — deliberate, so pre-Mongo links keep resolving. Dropping them is a separate piece of work.
2. **MySQL is supported by the schema but untested in deployment** — only PostgreSQL has been run in anger.
3. **Qdrant is still a supported `VECTOR_BACKEND`** — consolidating fully onto pgvector would let the `qdrant` compose service go.
4. **Perf checks on hot endpoints** (`projectQuestions`, `answers`, paged `auditLogs`, emissions aggregate) were never formalized into a benchmark.

## Cutover gate (closed)

- [x] All routes ported off Mongo
- [x] Local ETL validator green
- [x] Local staging ETL + smoke test green
- [x] Remote staging ETL validator green
- [x] SQL tests green (`npm run test:server:sql`, Testcontainers Postgres)
- [x] CI `server-sql` workflow green
- [x] ETL validator zero mismatches on prod snapshot
- [x] RAG quality sign-off on pgvector
- [x] Maintenance window executed
- [x] Mongoose, Mongo compose service, seed dump and ETL tooling removed

⚠️ **Rollback to MongoDB is no longer possible** — the Mongo code path, models and seed data are deleted. See [`prod-cutover-checklist.md`](prod-cutover-checklist.md).
