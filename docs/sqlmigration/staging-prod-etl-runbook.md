# Staging / production ETL runbook

> **⚠️ Historical record — this procedure can no longer be run.** MongoDB and
> Mongoose have been deleted from the codebase, including every script this
> runbook calls (`migrate-mongo-to-sql.ts`, `audit-mongo-data.ts`,
> `validate-sql-migration.ts`, `migrate-embeddings-to-pgvector.ts`, and
> `mongodump`/`MONGODB_URI` support generally). The migration described here is
> complete and Postgres is the only backend. Kept as a record of how the
> cutover was actually performed; do not attempt to follow these steps.

Step-by-step procedure to migrate a **MongoDB snapshot** (staging or production) into the relational core and sign off before cutover.

## Prerequisites

- Read-only or backup copy of source Mongo (`mongodump` archive recommended)
- Empty **target** Postgres (or MySQL) database — do not point at production SQL until validated
- `DATABASE_URL` and `MONGODB_URI` set for the migration host (VPN/bastion as required)
- Prisma engine chosen: `npm run db:provider postgresql` (or `mysql`)
- Node 20+ and `npm install` on the migration runner

## 1 — Back up source Mongo

```bash
# On a host that can reach Mongo
mongodump --uri="$MONGODB_URI" --archive=./backups/mongo-$(date +%Y%m%d-%H%M%S).archive --gzip
```

Store the archive off-box. ETL is read-only on Mongo but treat the dump as the rollback source of truth.

## 2 — Provision target SQL schema

Use a **dedicated migration database** (not shared with a running `DB_DRIVER=sql` app until sign-off).

```bash
export DATABASE_URL='postgresql://USER:PASS@HOST:5432/governance_migration'
export VECTOR_DATABASE_URL="$DATABASE_URL"   # if migrating vectors to same DB

npm run db:provider postgresql
npm run db:generate
npm run sql:push
npm run sql:extras    # pgvector + partial indexes (Postgres only)
```

> **Do not** run `npm run dev` / `npm start` before validation — boot seeds (GFANZ pathways, emission factors, etc.) add rows that are excluded from ETL counts. The validator now filters SQL rows with the same `etlRequiredFields` rules as Mongo.

## 3 — Phase 0 audit (archive report)

```bash
export MONGODB_URI='mongodb://...'   # staging or prod read URI

npm run audit:mongo 2>&1 | tee docs/sqlmigration/reports/audit-STAGING-$(date +%Y%m%d).txt
npm run audit:mongo -- --json > docs/sqlmigration/reports/audit-STAGING-$(date +%Y%m%d).json
```

Review before ETL:

| Finding | Action |
|---------|--------|
| Duplicate unique keys | Fix in Mongo or adjust schema before cutover |
| Hard dangling refs | Clean data or accept loose string FKs (already modeled) |
| Soft dangling refs | Expected for legacy data; ETL still loads |

## 4 — ETL dry-run

```bash
npm run migrate:mongo-to-sql -- --dry-run 2>&1 | tee docs/sqlmigration/reports/etl-dry-run-STAGING-$(date +%Y%m%d).txt
```

Confirm document counts per collection match expectations (~4.9k rows for current seed scale). `Failed: 0` required.

## 5 — ETL load

```bash
npm run migrate:mongo-to-sql 2>&1 | tee docs/sqlmigration/reports/etl-run-STAGING-$(date +%Y%m%d).txt
```

Idempotent: re-runs use `skipDuplicates` (0 loaded if already present). For a **clean re-run**, truncate SQL tables in reverse dependency order or drop/recreate the migration database.

Single collection retry:

```bash
npm run migrate:mongo-to-sql -- --collection=customers
```

## 6 — Cross-DB validation (gate)

```bash
npm run sql:validate 2>&1 | tee docs/sqlmigration/reports/validate-STAGING-$(date +%Y%m%d).txt
```

**Exit code must be 0** — output ends with `All collections match.`

Known exclusions:

- `climateScenarios`: GFANZ catalog rows without `projectId` are seeded at app boot, not migrated from Mongo. Validator counts only rows with `projectId` set.

## 7 — Optional: vector migration

If production uses Qdrant:

```bash
export QDRANT_URL='...'
npm run migrate:embeddings-pgvector
```

## 8 — Smoke test on staging

Point staging app at the **migration** SQL database (or promote DB after backup):

```bash
DB_DRIVER=sql
DATABASE_URL=...
VECTOR_BACKEND=pgvector
VECTOR_DATABASE_URL=...
```

Checklist:

- [ ] `GET /api/health` → `sqlReady: true`
- [ ] Login + `/api/auth/me`
- [ ] Customers / projects list
- [ ] Open a project (questions, answers)
- [ ] Assignments / tasks
- [ ] Knowledge chat (if vectors migrated)
- [ ] Customer API (`/api/v1/customer/customers` with `x-api-key`)

## 9 — Production cutover (summary)

1. Maintenance window announced
2. Final `mongodump` + `pg_dump` of migration target
3. Repeat steps 3–6 on **production** Mongo → **production** Postgres (or promote validated staging DB)
4. Flip `DB_DRIVER=sql` on app servers
5. Monitor logs + Sentry for 24–48h
6. Keep Mongo read-only for rollback window (see Phase 8)

## Environment template

```bash
# Source (read)
MONGODB_URI=mongodb://user:pass@mongo-host:27017/governance

# Target (write)
DATABASE_URL=postgresql://user:pass@postgres-host:5432/governance
VECTOR_DATABASE_URL=postgresql://user:pass@postgres-host:5432/governance

# App (after sign-off)
DB_DRIVER=sql
VECTOR_BACKEND=pgvector
```

## npm shortcuts

| Command | Purpose |
|---------|---------|
| `npm run sql:etl:pipeline` | Full pipeline (setup → audit → dry-run → load → validate) |
| `npm run audit:mongo` | Phase 0 data-quality report |
| `npm run migrate:mongo-to-sql -- --dry-run` | Transform without write |
| `npm run migrate:mongo-to-sql` | Full ETL load |
| `npm run sql:validate` | Mongo vs SQL row-count gate |

Set `STAGING_MONGODB_URI` and `STAGING_DATABASE_URL` (or export inline). Use `SKIP_SQL_SETUP=1` if schema already exists.

## Related docs

- [Local dual-stack runbook](local-dev-runbook.md)
- [Phase 6 detail](phases/phase-06-etl.md)
- [Current status](current-status.md)
