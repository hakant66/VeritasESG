# Prisma (relational core) — MongoDB migration

This directory holds the provider-neutral Prisma schema for the GovernanceIQ
relational core. It is part of the MongoDB → SQL migration
([`docs/migration/mongo-to-sql-migration-plan.md`](../docs/migration/mongo-to-sql-migration-plan.md)).

## Engine selection (PostgreSQL or MySQL)

The same `schema.prisma` targets either engine. Prisma fixes the `provider` at
generate time, so pick one per deployment:

```bash
# PostgreSQL (default, recommended — enables pgvector RAG in the same DB)
npm run db:provider postgresql
DATABASE_URL="postgresql://user:pass@host:5432/governance" npm run db:generate

# MySQL (core only; RAG vectors use a Postgres sidecar — see VECTOR_DATABASE_URL)
npm run db:provider mysql
DATABASE_URL="mysql://user:pass@host:3306/governance" npm run db:generate
```

## Environment

- `DATABASE_URL` — relational core connection string (Postgres or MySQL).
- `DB_DRIVER` — `mongo` (default) | `sql`. Selects the persistence backend at
  runtime while both code paths coexist during the migration.
- `VECTOR_DATABASE_URL` — optional Postgres connection for the RAG chunk store
  (`kb_chunks` + `pgvector`). When the core is Postgres you can reuse
  `DATABASE_URL`; when the core is MySQL, point this at a Postgres sidecar. If
  unset, semantic RAG features degrade off.
- `VECTOR_BACKEND` — `pgvector` (default) | `qdrant` | `disabled`.

## Migrations

Migration history is kept per engine because the DDL differs (backticks vs
double quotes, `DATETIME(3)` vs `TIMESTAMP(3)`, `JSON` vs `jsonb`, and
Postgres-only pgvector/tsvector/partial indexes):

| Folder | Engine | `migration_lock.toml` |
|--------|--------|-----------------------|
| `prisma/migrations` | **MySQL (default)** | `mysql` |
| `prisma/migrations-postgresql` | PostgreSQL | `postgresql` |

Prisma always reads `prisma/migrations`, so it is the MySQL default. To deploy
on PostgreSQL, swap the provider and point Prisma at the Postgres folder:

```bash
# MySQL (default)
npm run db:provider mysql && npm run db:generate
npm run db:deploy                              # applies prisma/migrations

# PostgreSQL
npm run db:provider postgresql && npm run db:generate
npx prisma migrate deploy --schema prisma/schema.prisma \
  # then apply prisma/migrations-postgresql (copy over prisma/migrations for the run,
  # or use a PG-specific checkout); includes pgvector/tsvector/partial-index migration
```

For local dev you can skip migrations entirely and sync with `npm run sql:push`
(`prisma db push`).

> **Warning:** never pass a real database as `--shadow-database-url` to
> `prisma migrate diff/dev` — Prisma **resets** the shadow database. Use a
> throwaway DB for drift checks.

Engine-specific concerns handled in raw migration SQL (not expressible in the
schema, PostgreSQL only): partial unique indexes (`metricEntries` sparse key),
`pgvector` column and index on `kb_chunks`, and `tsvector` full-text index
(see `prisma/migrations-postgresql/1_pgvector_and_partial_indexes`). MySQL uses
app-level enforcement for the sparse uniques and never hosts `kb_chunks`
(vectors live on a Postgres core or sidecar via `VECTOR_DATABASE_URL`).

## Data migration

```bash
npm run audit:mongo             # Phase 0 data-quality audit (read-only)
npm run migrate:mongo-to-sql -- --dry-run
npm run migrate:mongo-to-sql    # ETL: Mongo -> SQL with canonical-id remap
```
