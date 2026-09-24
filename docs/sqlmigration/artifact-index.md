# Artifact index

All migration-related files grouped by phase. Paths relative to repository root.

**Legend:** ✅ still in the repo · ❌ **removed post-migration** (deleted when MongoDB was taken out; listed here so the historical phase docs and reports remain readable).

## Phase 0 — Discovery

| File | Type | State |
|------|------|-------|
| `scripts/audit-mongo-data.ts` | CLI | ❌ removed post-migration |
| `server/data/migration/schemaMap.ts` | Registry | ✅ (ETL role retired; still used by `prismaResourceRepository` for resource/reference lookups) |

## Phase 1 — Schema

| File | Type | State |
|------|------|-------|
| `prisma/schema.prisma` | Schema — **source of truth for the data model** | ✅ |
| `prisma/set-provider.mjs` | Tooling | ✅ |
| `prisma/sql/pgvector-and-partial-indexes.sql` | Raw SQL | ✅ |
| `prisma/migrations/`, `prisma/migrations-postgresql/` | Committed migrations | ✅ |
| `prisma/migrate-deploy.mjs` | Deploy helper (`npm run db:deploy`) | ✅ |
| `prisma/README.md` | Docs | ✅ |

## Phase 2 — Repository seam

| File | Type | State |
|------|------|-------|
| `server/data/resourceRepository.ts` | Interface | ✅ |
| `server/data/prismaResourceRepository.ts` | Implementation | ✅ |
| `server/data/prismaClient.ts` | Client singleton + `checkSqlConnection()` | ✅ (`getDbDriver()` / `isSqlDriver()` removed) |
| `server/data/index.ts` | Factory — `getSqlResourceRepository()` now always returns a repository | ✅ |
| `server/lib/apiSerialize.ts` | Shared lib | ✅ |
| `server/lib/apiInput.ts` | Shared lib | ✅ |

## Phase 3 — Generic API

| File | Type | State |
|------|------|-------|
| `server/data/genericApiSql.ts` | Handlers | ✅ |
| `server/routes/mongoApi.ts` | Router — `isSqlDriver()` branches stripped; SQL path unconditional (file name is historical) | ✅ |

## Phase 4 — Specialized routes

Every entry below is ✅ and now runs unconditionally on Prisma (the dual-driver branches were removed).

| File | Type |
|------|------|
| `server/lib/backupCommand.ts` | Backup helper (`pg_dump` / `mysqldump`) |
| `server/lib/otpCleanup.ts` | OTP TTL sweep (replaces Mongo TTL index) |
| `server/data/platformAuth.ts` | **Batch A** — auth facade |
| `server/lib/requestAuth.ts` | **Batch A** — SQL session lookup |
| `server.ts` (auth routes) | **Batch A** — wired |
| `server/data/emissionsSql.ts` | **Batch B** — emissions handlers |
| `server/data/materialitySql.ts`, `griMaterialitySql.ts`, `dmaAssessmentSql.ts` | **Batch B** |
| `server/lib/routeDb.ts` | **Batch B** — `withDb()` wrapper |
| `server/data/complianceDataAccess.ts`, `climateDataAccess.ts` | **Batch C** |
| `server/data/workflowDataAccess.ts`, `schedulerDataAccess.ts`, `kbRagDataAccess.ts` | **Batch D** |
| `server/data/projectLibDataAccess.ts`, `auditLogDataAccess.ts`, `appSettingDataAccess.ts`, `seedDataAccess.ts` | **Batch E** |
| `server/lib/assignmentQuestionSync.ts`, `cloneTemplateQuestionsToProject.ts`, `expandStaleBranchQuestionsInProject.ts`, `repairBranchQuestionTextInProject.ts` | **Batch E** |
| `server/lib/*Seed.ts` (emission, climate, lever, framework) | **Batch E** — boot seeds |
| `server/routes/demoSeedRoute.ts` | **Final** — last unmigrated route, ported to Prisma |

## Phase 5 — Vector / search

| File | Type | State |
|------|------|-------|
| `server/data/vector/vectorStore.ts` | Interface | ✅ |
| `server/data/vector/pgVectorStore.ts` | pgvector (default) | ✅ |
| `server/data/vector/qdrantVectorStore.ts` | Qdrant (still a supported `VECTOR_BACKEND`) | ✅ |
| `server/data/vector/index.ts` | Factory | ✅ |
| `server/lib/rag/ingestKbDocument.ts` | Consumer | ✅ |
| `server/lib/rag/keywordKbSearch.ts` | Postgres keyword search (`tsvector`) used by `hybridKbSearch.ts` | ✅ |
| `server/lib/rag/mongoTextKbSearch.ts` | Mongo `$text` keyword search | ❌ removed post-migration (replaced by `keywordKbSearch.ts`) |
| `scripts/migrate-embeddings-to-pgvector.ts` | Qdrant → pgvector copy | ❌ removed post-migration |

## Phase 6 — ETL

All Phase 6 tooling was deleted once the migration completed — its only purpose was reading from MongoDB.

| File | Type | State |
|------|------|-------|
| `scripts/migrate-mongo-to-sql.ts` | ETL | ❌ removed post-migration |
| `scripts/validate-sql-migration.ts` | Cross-DB validator | ❌ removed post-migration |
| `scripts/validate-mongo-migration.ts` | Legacy Mongo validator | ❌ removed post-migration |
| `scripts/staging-etl-pipeline.sh` | Pipeline wrapper | ❌ removed post-migration |
| `scripts/import-firestore-export.ts`, `server/migration/firestoreExport.ts` | Firestore import | ❌ removed post-migration |
| `scripts/migrate-legacy-platform-roles.ts`, `migrate-soru-cogaltma.ts`, `migrate-kimya-template-pages.ts`, `migrate-merge-kimya-templates.ts`, `backfill-on-behalf-audit-logs.ts`, `delete-assignment-by-ref.ts`, `generate-demo-snapshot-from-dump.ts` | Mongo-only one-offs | ❌ removed post-migration |
| `server/migrations/**` | Mongo-only migration helpers | ❌ removed post-migration |
| `seed/mongo-dump/` | mongodump seed archive | ❌ removed post-migration |
| `docs/sqlmigration/reports/*.txt` | Audit / ETL / validate outputs | ✅ kept as the surviving record |

## Phase 7 — Tests

| File | Type | State |
|------|------|-------|
| `tests/server/sql/globalSetup.ts` | Testcontainers Postgres bootstrap | ✅ |
| `tests/server/sql/setup.ts` | Per-worker SQL env | ✅ |
| `tests/server/helpers/sqlTestHarness.ts` | Fixtures + truncate helpers | ✅ |
| `tests/server/helpers/makeSqlApp.ts` | Express app factory for SQL tests | ✅ |
| `tests/server/sql/*.sql.test.ts` | SQL contract/integration suites (db API, auth, answers, assignments, settings, on-behalf, …) | ✅ |
| `.github/workflows/sql-tests.yml` | CI job | ✅ |
| `tests/server/helpers/memoryMongo.ts` + `mongodb-memory-server` suites | Legacy Mongo test harness | Being retired — ported to / covered by `tests/server/sql/**` |

## Phase 8 — Infra / env

| File | Type | State |
|------|------|-------|
| `docker-compose.yml` | app + `postgres` + `minio` + `redis` + `qdrant` | ✅ (`mongo` service and `mongo_data` volume removed) |
| `docker-compose.minio.yml` | MinIO only | ✅ |
| `scripts/docker-up.sh` | Compose wrapper with host-port fallback | ✅ |
| `.env.example` | `DATABASE_URL`, `VECTOR_*` | ✅ (`MONGODB_URI`, `DB_DRIVER` removed) |
| `package.json` | `db:*`, `sql:*` | ✅ (`mongoose` dependency and all `audit:mongo` / `migrate:mongo-to-sql` / `seed:dump` style scripts removed) |

## Dependencies

| Package | Version | Purpose | State |
|---------|---------|---------|-------|
| `prisma` | ^6 | CLI + migrations | ✅ added |
| `@prisma/client` | ^6 | Runtime client | ✅ added |
| `mongoose` | ^9 | Mongo ODM | ❌ removed post-migration |

## npm scripts

| Script | Phase | State |
|--------|-------|-------|
| `db:provider`, `db:generate`, `db:migrate`, `db:deploy`, `db:studio` | 1 | ✅ |
| `sql:setup`, `sql:provider`, `sql:push`, `sql:extras` | 1 + local dev | ✅ |
| `sql:smoke` (`scripts/staging-sql-smoke.sh`) | 6/8 | ✅ |
| `test:server:sql` | 7 | ✅ |
| `demo:snapshot`, `dev:set-password`, `migrate:kimya-excel-sheets` | tooling | ✅ (rewritten for Prisma) |
| `audit:mongo` | 0 | ❌ removed |
| `sql:etl`, `sql:validate`, `sql:etl:pipeline` | 6 | ❌ removed |
| `migrate:mongo-to-sql`, `migrate:validate-sql` | 6 | ❌ removed |
| `migrate:embeddings-pgvector` | 5 | ❌ removed |
| `migrate:import`, `migrate:validate`, `migrate:platform-roles`, `migrate:soru-cogaltma`, `migrate:kimya-template-pages`, `migrate:merge-kimya-templates` | legacy Mongo | ❌ removed |
| `seed:dump`, `seed:restore`, `demo:snapshot:from-dump` | Mongo seed archive | ❌ removed |

## Documentation

| File | Role |
|------|------|
| `docs/migration/mongo-to-sql-migration-plan.md` | Original proposal + completion summary |
| `docs/migration/mongo-to-sql-implementation-status.md` | Short status companion (now: what shipped) |
| `docs/sqlmigration/**` | **This journal** (planned vs delivered) |
| `docs/sqlmigration/phases/*.md`, `docs/sqlmigration/reports/*.txt` | Frozen dated record — not updated post-migration |
| `docs/archive/firebase-blueprint.json` | Legacy Firestore schema (archived, not used at runtime) |
| `CLAUDE.md` | Current-state architecture and commands |
