# Decisions and scope

> **The migration these decisions scoped is complete.** MongoDB and Mongoose have been removed; the app runs on PostgreSQL via Prisma. This page is kept as the historical record of *why* things were built the way they were. Where a decision has since been superseded by the removal, it is annotated inline.

Captured from the migration plan (§0, §14) and stakeholder lock-in during the initial implementation delivery.

## Locked decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | **Prisma 6** (pinned; v7 broke classic `url` in schema) | Provider-neutral schema, migrations, typed client |
| Core DB engines | **PostgreSQL** and **MySQL** — one per deployment | Same `schema.prisma`; `npm run db:provider` swaps datasource |
| Runtime switch | `DB_DRIVER=mongo` (default) \| `sql` | Incremental cutover; Mongo path unchanged until flip. **Superseded:** the flag was deleted with the Mongo path — Prisma is unconditional |
| Vectors | **`pgvector`** in Postgres; Qdrant retired as target | Consolidate RAG infra; MySQL core uses Postgres sidecar. **In practice:** pgvector is the default, but the Qdrant adapter and compose service were kept and `VECTOR_BACKEND=qdrant` still works |
| Redis | **Optional** | KB ingest already has inline fallback |
| Frontend | **Unchanged** | `src/services/db.ts` Firestore shim → `/api/db/*` |
| API contract | **Unchanged JSON** | Epoch-millis dates; same resource names |
| IDs | ETL remaps `legacyFirebaseId` → canonical Mongo `_id` hex | Single PK per row; transitional `legacyFirebaseId` column |
| Cutover model | Short **read-only window** (dual-write documented as fallback) | Consultancy app; modest write volume |

## In scope

- 45 Mongoose collections → 47 Prisma models (includes KB/RAG tables)
- Generic REST API (`/api/db/:resource`) + settings + answer upsert
- Specialized routes (emissions, materiality, compliance, climate, KB, auth, scheduler)
- RAG: `kb_chunks` text + embeddings in Postgres (`tsvector` + `pgvector`)
- ETL from live Mongo or `seed/mongo-dump` — *executed; tooling and dump archive have since been deleted*
- Engine-aware backups (`mongodump` / `pg_dump` / `mysqldump`) — *the `mongodump` branch is gone; `server/lib/backupCommand.ts` emits `pg_dump` or `mysqldump`*
- OTP TTL sweep for SQL (replaces Mongo TTL index)

## Out of scope (for this migration)

- Rewriting the React frontend data layer
- Removing `src/services/db.ts` Firestore-style API (kept intentionally)
- Firebase/Firestore re-migration (legacy tooling archived post-cutover only)
- Multi-master or dual-write in production (optional fallback only)

## Firebase legacy cleanup (post-cutover) — outcome

Tracked as migration leftovers L1–L8 in the plan; cleanup was **Phase 8**, executed after SQL was validated in production.

| ID | Item | Planned Phase 8 action | Outcome |
|----|------|----------------|---------|
| L1 | Firestore shim in `src/services/db.ts` | Keep; optionally rename error strings | **Kept** as-is (it is what made the migration invisible to the UI); error strings not renamed |
| L2 | Dual ID lookups | Drop after `legacyFirebaseId` column removed | **Kept** — `legacyFirebaseId` columns and the `OR legacyFirebaseId` fallback remain so pre-Mongo links still resolve |
| L5 | Firestore import + `firebase-blueprint.json` | Archive/remove | Import tooling (`server/migration/firestoreExport.ts`, `scripts/import-firestore-export.ts`) **removed**; blueprint **archived** |
| L7 | Answer key `contactId_questionId` | Replaced by unique `(projectId, questionId, contactId)` in SQL | **Done** |

`firebase-blueprint.json` was moved to [`docs/archive/firebase-blueprint.json`](../archive/firebase-blueprint.json) (reference only; not used at runtime).

## Repository context

This repo was cloned from `governanceiq` to pursue the SQL migration while keeping Mongo operational during transition. That transition is over — the clone is now the Postgres-only mainline, and MongoDB is not present in it at all.
