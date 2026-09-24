# Phase 1 — Schema + ORM

**Plan reference:** Migration plan §5, §10 Phase 1 (5–8 days estimated)

## Planned

- Define 45 relational tables with enums, indexes, partial-uniques
- Choose jsonb vs child tables for embedded data
- Prisma migrations for PostgreSQL and MySQL
- Raw SQL for pgvector, tsvector, partial unique indexes

## Delivered

| Artifact | Path | Notes |
|----------|------|-------|
| Prisma schema | `prisma/schema.prisma` | 47 `model` blocks; provider-neutral |
| Provider swap | `prisma/set-provider.mjs` | `postgresql` \| `mysql` at generate time |
| Raw SQL extras | `prisma/sql/pgvector-and-partial-indexes.sql` | Run after schema apply on Postgres |
| Documentation | `prisma/README.md` | Engine selection, env vars |

### Delivered (as built)

| Artifact | Path | Notes |
|----------|------|-------|
| Prisma schema | `prisma/schema.prisma` | 47 `model` blocks; provider-neutral |
| Provider swap | `prisma/set-provider.mjs` | `postgresql` \| `mysql` at generate time |
| Raw SQL extras | `prisma/sql/pgvector-and-partial-indexes.sql` | Run after schema apply on Postgres |
| **Committed migrations (MySQL, default)** | `prisma/migrations/0_init` | MySQL baseline DDL; `migration_lock.toml` = mysql |
| **Committed migrations (PostgreSQL)** | `prisma/migrations-postgresql/0_init`, `.../1_pgvector_and_partial_indexes` | PG baseline DDL + pgvector/tsvector/partial-uniques; `migration_lock.toml` = postgresql |
| Documentation | `prisma/README.md` | Engine selection, env vars |

Validation: `prisma migrate deploy` applies both cleanly on a fresh DB; existing `governance` / `governance_migration` DBs baselined with `prisma migrate resolve --applied` and report "schema is up to date". The only `migrate diff` delta is the pgvector `embedding` / `text_tsv` columns, which are raw-SQL-only (not expressible in schema.prisma) and therefore expected.

### Schema design choices (as built)

- PK `id` = string (Mongo `_id` hex during ETL)
- Reference fields as indexed strings (no FK relations in schema — app-side joins preserved)
- Enum-like fields as `String` (route-layer validation unchanged)
- Embedded objects/arrays as `Json`
- `legacyFirebaseId` nullable on all models

## Remaining

- [x] Commit initial Prisma migration(s) under `prisma/migrations/` (`0_init` + `1_pgvector_and_partial_indexes`); existing DBs baselined via `prisma migrate resolve --applied`
- [ ] MySQL-specific raw SQL pass (partial uniques via generated columns if needed)
- [ ] Document per-table jsonb vs child-table choices in schema comments (compliance gaps child table deferred)

## Validation

```bash
npm run db:provider postgresql
DATABASE_URL=postgresql://governance:governance@localhost:5432/governance npm run db:generate
npx prisma validate
npm run sql:push    # dev schema sync
npm run sql:extras  # pgvector + partial indexes (Postgres only)
```
