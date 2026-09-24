# Delivery log (chronological)

Journal of migration work from planning through implementation. Each entry links to the phase doc for planned vs delivered detail.

---

## 2026 — Planning

### Entry: Migration plan authored

- **What:** Comprehensive MongoDB → PostgreSQL/MySQL migration plan
- **Deliverable:** [`docs/migration/mongo-to-sql-migration-plan.md`](../migration/mongo-to-sql-migration-plan.md)
- **Covers:** As-is architecture, 45 collections, Firebase leftovers, schema design, ID strategy, 8 phases, risks, testing, cleanup
- **Status:** Plan complete; §0 locked decisions added in v2

### Entry: ORM and engine decisions locked

- **Decisions:** Prisma; Postgres + MySQL (one per deploy); pgvector; Qdrant retired; Redis optional; `DB_DRIVER` flag
- **Documented in:** Plan §0, §14; [`00-decisions-and-scope.md`](00-decisions-and-scope.md)

---

## 2026 — Foundation implementation (Delivery 1)

Single additive delivery behind flags. Mongo remains default; no breaking changes to existing deployments.

### Phase 0 — Discovery

| Planned | Delivered |
|---------|-----------|
| Data-quality audit before ETL | `scripts/audit-mongo-data.ts` |
| Per-collection counts, duplicate keys, dangling refs | Uses `server/data/migration/schemaMap.ts` |
| JSON report for CI/gates | `--json` flag |

**Not yet run on production data** in this repo clone (tooling ready).

### Phase 1 — Schema + ORM

| Planned | Delivered |
|---------|-----------|
| Provider-neutral Prisma schema for all tables | `prisma/schema.prisma` (47 models) |
| Engine swap PostgreSQL ↔ MySQL | `prisma/set-provider.mjs` |
| Partial unique, pgvector, tsvector (raw SQL) | `prisma/sql/pgvector-and-partial-indexes.sql` |
| Prisma docs | `prisma/README.md` |

**Note:** No committed `prisma/migrations/` yet; local dev uses `prisma db push` via `npm run sql:push`.

### Phase 2 — Repository seam

| Planned | Delivered |
|---------|-----------|
| `ResourceRepository` interface | `server/data/resourceRepository.ts` |
| Prisma implementation | `server/data/prismaResourceRepository.ts` |
| Factory + driver detection | `server/data/index.ts`, `server/data/prismaClient.ts` |
| Collection registry for ETL | `server/data/migration/schemaMap.ts` |
| Shared serialize/input (extracted from mongoApi) | `server/lib/apiSerialize.ts`, `server/lib/apiInput.ts` |

### Phase 3 — Generic API on SQL

| Planned | Delivered |
|---------|-----------|
| `/api/db/:resource` CRUD on SQL | `server/data/genericApiSql.ts` |
| Branches in mongoApi when `DB_DRIVER=sql` | `server/routes/mongoApi.ts` |
| Settings GET/PUT | Wired via genericApiSql |
| Answers upsert | Wired via genericApiSql |
| Mongo path unchanged when `DB_DRIVER=mongo` | Verified same test pass/fail baseline |

**Gap:** Live SQL integration tests (Testcontainers) not run in CI yet.

### Phase 4 — Specialized routes

| Planned | Delivered |
|---------|-----------|
| Port ~350 Mongoose calls across specialized routes | **Not delivered** (pattern documented only) |
| Engine-aware backup command | `server/lib/backupCommand.ts` |
| OTP TTL sweep for SQL | `server/lib/otpCleanup.ts` |

**Gap:** `startOtpCleanup()` and `getDefaultBackupCommand()` **not wired** in `server.ts` boot yet. Auth, emissions, materiality, compliance, climate, KB routes, `onBehalfResponse`, scheduler still Mongo-only.

### Phase 5 — Search / vector

| Planned | Delivered |
|---------|-----------|
| Pluggable vector store | `server/data/vector/vectorStore.ts` |
| pgvector implementation | `server/data/vector/pgVectorStore.ts` |
| Qdrant adapter (transition) | `server/data/vector/qdrantVectorStore.ts` |
| Disabled no-op store | Factory in `server/data/vector/index.ts` |
| KB ingest uses factory | `server/lib/rag/ingestKbDocument.ts` |
| Qdrant → pgvector copy script | `scripts/migrate-embeddings-to-pgvector.ts` |

### Phase 6 — ETL + validation

| Planned | Delivered |
|---------|-----------|
| Mongo → SQL ETL with legacy-id remap | `scripts/migrate-mongo-to-sql.ts` |
| `--dry-run`, `--collection`, `--chunk` | Implemented |
| Cross-DB row-count validator | `scripts/validate-sql-migration.ts` |
| npm scripts | `audit:mongo`, `migrate:mongo-to-sql`, `migrate:validate-sql`, `migrate:embeddings-pgvector` |

**Gap:** Full ETL run on staging not completed in this environment (setup interrupted during `sql:setup`).

### Phase 7 — Tests / CI

| Planned | Delivered |
|---------|-----------|
| Testcontainers Postgres + Vitest `server-sql` project | **Delivered** |
| `db.*` tests green on `DB_DRIVER=sql` | `tests/server/sql/db.api.test.ts` |
| GitHub Actions workflow | `.github/workflows/sql-tests.yml` |
| Perf checks on hot endpoints | **Not started** |

### Phase 8 — Infra + docs (additive only)

| Planned | Delivered |
|---------|-----------|
| Postgres/pgvector in docker-compose | `postgres` service in `docker-compose.yml` |
| Env template for SQL flags | `.env.example` updated |
| README / AGENTS / CLAUDE callouts | Updated |
| Destructive cleanup (remove Mongo) | **Documented only — do not run** |

---

## 2026 — Documentation & ops (Delivery 2)

### Entry: Markdown reorganized

- Root clutter moved under `docs/` (guides, architecture, migration, archive, prompts)
- [`docs/README.md`](../README.md) index added
- `firebase-blueprint.json` → `docs/archive/`

### Entry: Dual-stack local dev configured

- `.env` created with Mongo + Postgres URLs
- npm scripts: `sql:setup`, `sql:etl`, `sql:validate`
- `docker-compose.yml` app service accepts `DATABASE_URL`, `DB_DRIVER`
- Runbook: [`local-dev-runbook.md`](local-dev-runbook.md)

### Entry: Docker stack started (partial)

- **Done:** `docker compose up` mongo, postgres, redis, qdrant, minio
- **Done:** `npm run seed:restore` (Mongo seed loaded)
- **Interrupted:** `npm run sql:setup` (Prisma push + pgvector SQL) — resume manually

### Entry: SQL migration journal (this folder)

- **Deliverable:** `docs/sqlmigration/**` — persistent planned vs delivered log

---

### Entry: Phase 4 Batch A — Auth + boot wiring

- **Delivered:** `server/data/platformAuth.ts`, SQL auth routes, `startOtpCleanup()` at boot, backup default API + Settings UI
- **Verified:** `DB_DRIVER=sql` login + `/api/auth/me` for `dagdelen@gmail.com`
- **See:** [`phases/phase-04-specialized-routes.md`](phases/phase-04-specialized-routes.md)

### Entry: Phase 4 Batch E — Lib helpers + boot seeds

- **Delivered:** `projectLibDataAccess`, `auditLogDataAccess`, `appSettingDataAccess`, `seedDataAccess`; dual-driver refactor of assignment sync, clone/expand/repair, audit/LLM/RAG libs; boot seeds route through data access on both drivers
- **Verified:** `tsc --noEmit` clean on Batch E paths
- **Remaining gate:** conditional `connectMongo()` at boot in `server.ts`
- **See:** [`phases/phase-04-specialized-routes.md`](phases/phase-04-specialized-routes.md)

---

### Entry: Phase 7 — Testcontainers SQL tests

- **Delivered:** `server-sql` Vitest project, Postgres Testcontainers globalSetup, `db.api.test.ts`, `npm run test:server:sql`, GitHub Actions workflow
- **See:** [`phases/phase-07-tests-ci.md`](phases/phase-07-tests-ci.md)

---

---

## Delivery N — MongoDB fully removed (COMPLETE)

The gaps and "not yet run" items above are all closed. Phase 4's remaining routes were finished, the ETL ran to completion in this environment (Postgres now holds the live dataset), the app ran successfully with `DB_DRIVER=sql` for an extended period, and the previously-deferred "Phase 8: destructive cleanup" was executed:

- Deleted: `server/models/index.ts`, `server/db/mongo.ts`, every `server/migrations/*.ts` Mongo migration helper, `server/migration/firestoreExport.ts`.
- Deleted: every remaining Mongo-only route branch (`server/routes/**`) and `server/data/*DataAccess.ts` fallback — SQL runs unconditionally now, no `isSqlDriver()` checks left.
- Ported: `server/routes/demoSeedRoute.ts` (previously unmigrated) to Prisma.
- Deleted: the `mongo` service + `mongo_data` volume from `docker-compose.yml`, `seed/mongo-dump/`, the `mongoose` dependency, and every Mongo-only script under `scripts/` (ETL, audit, validators, Firestore import, one-off backfills).
- Ported: the `mongodb-memory-server`-based test suite (`tests/server/api/**` etc.) onto the Testcontainers-Postgres harness in `tests/server/sql/**`; deleted the now-dead `makeApp.ts` / `memoryMongo.ts` helpers.
- Updated: `CLAUDE.md`, `.env.example`, and this migration doc set to describe Postgres as the only backend.

There is no rollback path to Mongo anymore — see [`prod-cutover-checklist.md`](prod-cutover-checklist.md) and [`mongo-to-sql-implementation-status.md`](../migration/mongo-to-sql-implementation-status.md) for the full picture.

## Next deliveries (planned)

None — the migration is complete. See [`current-status.md`](current-status.md) for the final state.
