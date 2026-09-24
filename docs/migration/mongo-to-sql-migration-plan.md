# VeritasESG — MongoDB → Relational (MySQL / PostgreSQL) Migration Plan

> **Status: EXECUTED AND COMPLETE.** This document is the original proposal, retained as the design record for the migration. It has been delivered: the app runs on PostgreSQL via Prisma, Mongoose and MongoDB are removed from the codebase, and the `DB_DRIVER` flag described throughout is gone. **Read the tenses below as history, not as a to-do list.** See the [completion summary](#15-completion-summary-what-actually-shipped) at the end for what deviated from the plan.
>
> **Implementation journal:** [`docs/sqlmigration/README.md`](../sqlmigration/README.md)
> Scope: Migrate the primary datastore from MongoDB (Mongoose) to a relational database, with a clean removal of Firebase/Firestore legacy artifacts left over from the previous migration.
> Audience: Engineering, DevOps, Product.

---

## 0. Locked decisions (v2)

The open questions in §14 have been decided. This section overrides any conflicting guidance below.

- **ORM: Prisma.** One provider-neutral `schema.prisma`; the datasource `provider` is chosen per deployment (`postgresql` | `mysql`) at generate/build time. Embedded objects are stored as `Json`; divergent `@db.*` native types are avoided so the same schema generates on both engines.
- **Dual-engine support.** PostgreSQL and MySQL are both supported for the relational core. Only one engine runs per deployment (Prisma cannot switch `provider` at runtime).
- **Vectors + keyword search: `pgvector` (Qdrant retired).** The RAG chunk store (`kb_chunks` = text + embedding) always lives in **PostgreSQL**:
  - Postgres core → `kb_chunks` in the same database (`pgvector` + `tsvector`).
  - MySQL core → `kb_chunks` in a **Postgres sidecar** (second connection); relational KB metadata (`knowledge_bases`, `kb_documents`, `kb_ingest_jobs`) stays in the MySQL core.
  - MySQL core with no sidecar → RAG/semantic features degrade off (keyword-only or disabled). This is acceptable.
- **Redis: optional.** Used only by the KB ingest queue, which already falls back to inline ingestion in [`server/lib/rag/kbIngestQueue.ts`](../server/lib/rag/kbIngestQueue.ts). Run without Redis unless KB upload throughput requires out-of-process workers.
- **Search/vector is a pluggable capability** behind one interface (`pgvector-core`, `pgvector-sidecar`, `disabled`), selected by env, independent of the relational core.
- **Contracts preserved.** `/api/db/:resource` + specialized routes keep identical JSON (epoch-millis dates); the frontend Firestore shim (`src/services/db.ts`) is unchanged. New SQL paths ship behind `DB_DRIVER` (`mongo` default) until they pass the full test suite.

---

## 1. Executive summary

VeritasESG is a React 19 + Vite SPA backed by an Express + **MongoDB (Mongoose 9)** API, with **Qdrant** (vector search), **Redis/BullMQ** (KB ingest queue), **S3/MinIO** (file storage) and **Resend** (email). The data model has **45 collections** and the app was previously migrated **Firebase/Firestore → MongoDB**, leaving behind a thick Firestore-compatibility shim and a dual-identity (`ObjectId` + `legacyFirebaseId`) scheme.

The good news for a relational migration:

- **The frontend never talks to Mongo directly.** All reads/writes flow through one Firestore-style shim (`src/services/db.ts`) → a single generic REST endpoint (`/api/db/:resource`). If we preserve that REST contract, **the frontend needs ~zero data-layer changes.**
- **Query patterns are overwhelmingly simple**: equality filters + sort + limit. There is exactly **one** runtime aggregation pipeline in the whole app (emissions totals) and a handful of regex/`$text` lookups. This maps almost 1:1 to SQL.

The hard parts are all consequences of the Firebase heritage: the **dual ID system**, **string "foreign keys" with no referential integrity**, **embedded/`Mixed` arrays**, a **Mongo text index** used by RAG, a **TTL index**, and a **`mongodump`-based backup job**.

### Recommendation on MySQL vs PostgreSQL vs both

**Recommended: target PostgreSQL as the primary engine, but build the data-access layer through an ORM that can also emit MySQL.** Supporting *both* is inexpensive **only if** we route all persistence through one abstraction (Prisma or Drizzle) and avoid engine-specific SQL. The marginal cost of "both" is then mostly *testing surface*, not *code*.

Why PostgreSQL wins for this specific app:

| Need in the codebase | PostgreSQL | MySQL 8 |
|---|---|---|
| Many embedded/`Mixed` objects & arrays (`esgSummary`, `answerNotes`, `gaps`, `frameworks[]`, `selectedLevers[]`, …) | `jsonb` + rich operators/indexing | `JSON` (weaker indexing, no partial GIN) |
| KB semantic search (currently **Qdrant**) | **`pgvector`** can absorb Qdrant → one fewer service | no native vector type |
| KB keyword search (currently Mongo `$text`) | `tsvector`/`tsquery` (mature) | `FULLTEXT` (works, less flexible) |
| Partial / expression unique indexes (already used in Mongo: `knowledgeBases`, `metricEntries`) | Native partial indexes | Emulate via generated columns |
| Case-insensitive email lookups (currently `$regex`) | `citext` or functional index | collation-based |

**Bottom line:** Standardizing on **one** engine minimizes ops cost, and PostgreSQL is the better single choice here (it can also consolidate Qdrant via `pgvector`). We will keep the ORM engine-agnostic so a MySQL deployment remains a supported config for customers who require it, but we recommend **not** running both in production simultaneously.

> Decision needed from stakeholders (see §14): (a) single engine = Postgres? (b) keep Qdrant or consolidate to `pgvector`? (c) is a maintenance window / short read-only cutover acceptable?

---

## 2. Current architecture (as-is)

```
React 19 SPA (Vite, HashRouter)
   │  imports Firestore-style helpers (collection/doc/where/getDocs/setDoc/writeBatch…)
   ▼
src/services/db.ts        ← Firestore COMPATIBILITY SHIM (Firebase leftover)
   │  translates to REST
   ▼
/api/db/:resource         ← generic CRUD endpoint (server/routes/mongoApi.ts)
   │                          + specialized routes (emissions, materiality, compliance,
   │                            climate, KB/RAG, assignments, audit, scheduler)
   ▼
Mongoose 9 models (server/models/index.ts, 45 schemas)
   ▼
MongoDB 7
```

Side services:
- **Qdrant** — KB chunk embeddings (vector search) for RAG autofill/chat.
- **Redis + BullMQ** — `kbIngestQueue` background document ingestion.
- **S3 / MinIO** — uploaded files & avatars, proxied via `/storage/...`.
- **Resend** — transactional email + delivery webhooks (status written back to `auditLogs`).
- **node-cron scheduler** — runs shell commands (notably **`mongodump` backups**).

### Data-access footprint (migration blast radius)

- **Frontend:** ~30 files import `src/services/db.ts`, but **all** go through the shim. Preserving the `/api/db` contract keeps the frontend essentially unchanged.
- **Backend:** ~**400+ direct Mongoose calls** across ~55 files. This is the real work. Breakdown of the heaviest:
  - `server.ts` (1,868 lines): 42 calls (auth, OTP, bootstrap, misc).
  - `server/routes/mongoApi.ts`: generic CRUD + answer upsert/notes/review (22).
  - `server/routes/onBehalfResponse.ts` (27), `emissionsRoute.ts` (22, incl. the 1 aggregation).
  - `server/routes/*Assessment/materiality/compliance/climate` (~50 total).
  - `server/lib/**` (assignments, RAG, audit, seeds): ~150.
  - `server/migrations/**`, `scripts/**`: one-off (can stay Mongo or be retired).

---

## 3. Firebase legacy leftovers to clean up

These are the "conversion leftovers" the migration should eliminate for a *clean* result:

| # | Leftover | Where | Action |
|---|---|---|---|
| L1 | **Firestore compat shim** (`collection`, `doc`, `where`, `query`, `getDocs`, `writeBatch`, `Timestamp`, `handleFirestoreError`, "Firebase Quota Exceeded" strings) | `src/services/db.ts` | Keep as-is for phase 1 (it's an asset — isolates FE). Optionally slim later. Rename error taxonomy away from "Firestore". |
| L2 | **Dual ID system**: every doc has `legacyFirebaseId`; lookups try 24-hex `_id` *then* `legacyFirebaseId` (`findByExternalId`, `buildFilter`) | `mongoApi.ts`, models `commonSchemaFields` | Resolve to a **single canonical string PK** during ETL (see §6). |
| L3 | **String foreign keys, no referential integrity** (`customerId: String`, `projectId: String`, …) | all models | Introduce real FKs where safe; keep as indexed strings where data is dirty (see §5). |
| L4 | **Mixed ObjectId vs string refs** — most refs are strings, but `ClimateScenario` & `TransitionLeverTemplate` use real `ObjectId` `ref`s | `models/index.ts` | Normalize all refs to the canonical PK type in ETL. |
| L5 | **Firestore export/import tooling** | `server/migration/firestoreExport.ts`, `scripts/import-firestore-export.ts`, `docs/archive/firebase-blueprint.json`, `migrate:*` npm scripts | Archive/remove after SQL cutover; they target the old path. |
| L6 | **`createdBy` / `ownerId`** are free-form strings (Firebase UIDs) | `commonSchemaFields` | Map to `platformUsers` PK during ETL; add nullable FK. |
| L7 | **Legacy answer key** `\`${contactId}_${questionId}\`` stored as `legacyFirebaseId` | `mongoApi.ts` answers upsert | Replace with a proper unique constraint `(projectId, questionId, contactId)`. |
| L8 | **Legacy CDN URL rewriting** (`cdn.impact-ai.co.uk`) | `publicAssetUrl.ts` | Orthogonal to DB; leave or clean separately. |

---

## 4. Target architecture (to-be)

```
React SPA (unchanged)  →  src/services/db.ts (unchanged contract)
   ▼
/api/db/:resource  +  specialized routes  (unchanged HTTP contract)
   ▼
NEW: Repository / data-access layer  (server/data/*)   ← single seam
   ▼
ORM (Prisma or Drizzle)  ──────────────►  PostgreSQL 16   (primary)
        (engine-agnostic)          └────►  MySQL 8         (optional/supported)
   ▼
pgvector (optional: replaces Qdrant)   |   tsvector/FULLTEXT (replaces $text)
```

Principles:
1. **Preserve HTTP contracts** (`/api/db/*`, specialized routes, JSON shapes incl. epoch-millis dates). This is what keeps the frontend and API tests stable.
2. **One persistence seam.** Wrap the ORM in thin repositories so engine differences and JSON handling live in one place.
3. **Ship behind a flag.** `DB_DRIVER=mongo|postgres|mysql` so we can run old and new in parallel and cut over per-environment.

### ORM choice

- **Prisma** — best DX, migrations, typed client; supports Postgres + MySQL; `Json` type; weaker for `tsvector`/`pgvector` (use raw SQL escapes). Recommended default.
- **Drizzle** — lighter, SQL-first, great for raw `tsvector`/`pgvector`, both engines. Good alternative if we lean on Postgres-native features heavily.
- Knex/raw — most control, most boilerplate. Not recommended given 45 tables.

---

## 5. Relational schema design

General rules applied to all 45 tables:

- **PK:** `id VARCHAR(32)` (or `CHAR(24)`) — carry the existing Mongo `_id` hex string as the canonical id so all existing string references keep working. (`legacyFirebaseId` folds into this — see §6.) New rows use CUID/ULID.
- **Timestamps:** `created_at`, `updated_at` as `TIMESTAMPTZ` (PG) / `DATETIME(3)` (MySQL). API layer converts to epoch millis on read (as today's `serialize()` does).
- **Common columns:** `legacy_firebase_id` (kept nullable during transition, then droppable), `created_by`, `owner_id` (nullable FK → `platform_users`).
- **Enums:** native `ENUM`/`CHECK` mirroring Mongoose `enum`s (e.g. project `status`, `category`, role enums, approval stages).
- **Foreign keys:** add real FKs for the clean, always-present relationships; keep as **indexed columns without FK** where legacy data may be orphaned (decide per-table after a data-quality audit in Phase 0).

### 5.1 Table groups

**Core directory & questionnaire**
- `segments`, `sectors/templates`, `template_pages`, `questions`, `project_questions`
- `customers` (+ embedded `esgSummary`, `materialityAssessment` → **`jsonb`** columns; or split `customer_esg_summary` 1:1 table — recommend jsonb since it's read/written whole)
- `branches` (FK `customer_id`), `contacts` (FK `customer_id`, nullable `branch_id`)
- `projects` (FK `customer_id`, nullable `template_id`), `project_pages` (FK `project_id`)
- `domains`

**Assignments & answers**
- `project_user_assignments` (unique `(project_id, user_id)`) — clean FK candidate
- `assignments` (FK `project_id`); `assigneeNoticeItems[]` → **`jsonb`** (write-whole, no queries on it)
- `answers` — unique **`(project_id, question_id, contact_id)`** (replaces legacy `contactId_questionId` key). `answerNotes[]`, `workflowStatusLog[]`, `reviewComments[]` → **`jsonb`**
- `answer_versions` (FK `answer_id`) — this is an append-only history table, natural fit
- `comment_messages`

**Identity & settings**
- `platform_users` (unique `email`; `password_hash` stays `select:false`-equivalent → never expose in API serialization)
- `otp_codes` (unique `email`; **TTL** → see §7.3)
- `email_settings`, `app_settings` (`data` → `jsonb`), `translations` (unique `key`), `scheduled_jobs`

**Emissions / metrics**
- `emission_factors` (unique `name`), `emission_entries` (FK `customer_id`, `emission_factor_id`)
- `emission_intensity_inputs` (unique `(customer_id, year)`), `scope2_market_data` (unique `(customer_id, year)`)
- `metric_definitions` (unique `code`), `metric_entries` (partial-unique `(customer_id, year, metric_definition_code, facility_id)`; `approvalStatusLog[]` → `jsonb`)

**Materiality (DMA)**
- `materiality_topics`, `materiality_assessments` (`materialTopics[]` → `jsonb` array or child table), `gri_materiality_matrix_rows`
- `gri_assessment_scores`, `esrs_assessment_scores`, `issb_assessment_scores` (each unique `(customer_id, year, rowId)`)

**Compliance & frameworks**
- `framework_requirements` (unique `disclosure_id`; `dataPointKeys[]`, `alternateDataKeys[]`, `conditions[]` → `jsonb` or child table)
- `compliance_runs` (`gaps[]` → `jsonb` or `compliance_run_gaps` child table — child table preferred since gaps are counted/reported)
- `framework_mappings` (`frameworks[]`, `reconciliationLogic` → `jsonb`)
- `consistency_conflicts` (`framework1/2`, `variance`, `likelyCauses[]`, `resolution` → `jsonb`)

**Climate scenarios**
- `climate_scenarios` (FK `project_id`; `selectedLevers[]`, `financialImpact`, `riskAssessment`, `sbtAlignment`, `roadmap[]` → `jsonb`)
- `transition_lever_templates` (unique `lever_id`; nested ranges → `jsonb`)

**Knowledge base / RAG**
- `knowledge_bases` (partial-unique on `(project_id,name)` and `(customer_id,name)`; `domainIds[]` → `jsonb`/child)
- `kb_documents` (FK `kb_id`), `kb_ingest_jobs` (FK `document_id`,`kb_id`)
- `kb_chunks` (FK `document_id`,`kb_id`) — **full-text + vector target** (§7.1/§7.2)

**Audit**
- `audit_logs` (indexes on `(project_id, timestamp)`, `(collection, record_id)`, `(collection, email_message_id)`)

### 5.2 Embedded data policy

| Pattern | Rule |
|---|---|
| Object read/written as a whole, never filtered on (`esgSummary`, `materialityAssessment`, `assigneeNoticeItems`, `answerNotes`, `reviewComments`, `workflowStatusLog`, climate nested objects, mapping nested) | **`jsonb`/`JSON` column** — least code churn, preserves API shapes |
| Array that is aggregated/counted/reported (`compliance_runs.gaps`) | **Child table** (`compliance_run_gaps`) for accurate counts & indexing |
| Array of scalar IDs used in `where … in` filters (`domainIds`, `sectorIds`, `reportingFrameworkKeys`) | Prefer **junction table** if filtered; else `jsonb` array + GIN index |
| History/versioning (`answer_versions`) | Already its own collection → its own table |

---

## 6. The ID strategy (most important design decision)

Today an id passed to the API can be **either** a 24-hex Mongo `_id` **or** a `legacyFirebaseId` string, and every reference field stores one of those as a plain string.

Migration approach — **canonical single string id**:

1. During ETL, each document's **Mongo `_id` hex string becomes the row PK** (`id`).
2. Build a global **`legacy_firebase_id → _id`** map from all collections up front.
3. **Rewrite every reference field** (`customerId`, `projectId`, `questionId`, `assignmentId`, `createdBy`, `ownerId`, ObjectId refs in climate/lever, the `contactId_questionId` answer key, etc.) to the canonical `id` using the map.
4. Keep `legacy_firebase_id` on rows for one release (so any un-migrated external link still resolves), then drop.
5. Simplify the API: `findByExternalId` collapses to a single `WHERE id = ?` (with a temporary `OR legacy_firebase_id = ?` fallback during transition).

This removes L2/L4/L6/L7 in one pass and is the backbone of a "clean" migration. It must be done as a **deterministic, re-runnable** transform with a validation report (row counts + dangling-reference report per table).

---

## 7. Feature-specific concerns

### 7.1 Keyword search (Mongo `$text` on `kb_chunks`)
Used by hybrid RAG (`mongoTextKbSearch.ts`). Replace with:
- **Postgres:** `tsvector` generated column + GIN index; query with `websearch_to_tsquery`; `ts_rank` for scoring (mirrors `textScore`).
- **MySQL:** `FULLTEXT(text)` index + `MATCH … AGAINST` (natural language mode).
Wrap behind `searchCustomerKbChunksByText()` so the call site is unchanged.

### 7.2 Vector search (Qdrant)
Two options:
- **A (recommended, Postgres):** move embeddings into `kb_chunks.embedding vector(768)` via **`pgvector`** (`ivfflat`/`hnsw` index). Eliminates Qdrant, simplifies infra & backups, keeps RRF hybrid merge in `rrfMerge.ts`.
- **B (either engine):** keep Qdrant as-is; only SQL-migrate the metadata (`kb_chunks.qdrantPointId` stays). Lower risk, one more service to run.
Decision belongs to §14. If MySQL is chosen, option B is effectively required (or an external vector store).

### 7.3 TTL index (`otp_codes.expiresAt`)
Mongo auto-expires OTPs. Replace with:
- A tiny **cron/`node-cron` sweep** (`DELETE FROM otp_codes WHERE expires_at < now()`), or
- Postgres `pg_cron`, or MySQL `EVENT SCHEDULER`.
Also enforce at read time (ignore expired) so correctness never depends on the sweep.

### 7.4 Backups (`mongodump` in scheduled jobs)
`schedulerService.executeCommand` runs arbitrary shell (a `mongodump` backup job ships in seed). Replace the default backup job command with **`pg_dump`** (or `mysqldump`) and update the Settings→Backup UI copy. Note: this scheduler executes shell — keep it locked to `platform_admin` and consider allow-listing commands.

### 7.5 The one aggregation
`emissionsRoute.ts`: `\$match` by customer/years → `\$group` by `(year, scope)` sum `resultTCO2e`. Becomes:
```sql
SELECT year, scope, SUM(result_tco2e) AS total
FROM emission_entries
WHERE customer_id = ? AND year = ANY(?)
GROUP BY year, scope;
```

### 7.6 Regex lookups
Case-insensitive email/name matches (`$regex ^x$ /i`) → `WHERE lower(email) = lower(?)` with a functional index, or `citext`. KB keyword regex fallback (`taskQuestionKbSearch.ts`) → `ILIKE`.

### 7.7 Transactions
Mongo path is largely non-transactional. Multi-step writes (create-from-template, clear-data, rebuild-from-template, project cascade deletes) become **proper SQL transactions** — a *correctness upgrade*. Cascade deletes can use `ON DELETE CASCADE` FKs where relationships are clean.

---

## 8. Data migration (ETL)

**Tooling:** a dedicated `scripts/migrate-mongo-to-sql.ts` runner (Node + the ORM), reading from the live Mongo (or from `seed/mongo-dump/*` BSON for dry runs).

Pipeline per collection:
1. Read documents (batched cursor).
2. Transform: rewrite ids/refs via the legacy map (§6); split embedded arrays → child tables where chosen; coerce dates; map enums; drop `_id`/`__v`.
3. Load: bulk insert (ORM `createMany` / `COPY` for Postgres for speed).
4. Validate: row-count parity, dangling-reference report, spot-check invariants (e.g. unique answer keys, partial-unique metric entries).

Order respects dependencies (users → customers → branches/contacts → projects → pages/questions → assignments → answers → …). Provide `--dry-run`, `--collection=`, and `--resume` flags. Repurpose the existing `scripts/validate-mongo-migration.ts` into a **cross-DB validator** (compare Mongo vs SQL counts/hashes).

**Cutover models:**
- **Simple (recommended first):** short **read-only maintenance window** → final ETL → flip `DB_DRIVER` → smoke test → open. Cleanest for a consultancy app with modest write volume.
- **Zero/low-downtime (if required):** dual-write behind the repository seam for a period, backfill, then reconcile and cut reads over. More engineering; only if a window is unacceptable.

---

## 9. Backend rewrite approach

1. **Introduce the repository seam** (`server/data/repositories/*`) with the exact method signatures the routes need. Back it initially with Mongoose (no behavior change) to prove the seam.
2. **Add ORM schema** for all 45 tables (Prisma schema or Drizzle definitions) — this is the bulk of the typing work.
3. **Implement SQL repositories**; switch each route group over behind `DB_DRIVER`.
4. **Port the generic `/api/db/:resource`** first (covers most frontend traffic + existing `tests/server/api/db.*` provide a safety net), then specialized routes.
5. **Preserve `serialize()` semantics** (epoch-millis dates, strip `passwordHash`, avatar URL normalization, role normalization).
6. Keep Mongo code path available until SQL passes the full test suite in CI, then delete Mongoose + Mongo infra.

Existing tests are a major asset: `tests/server/api/*` (db CRUD, bulk, answers, auth, projects, onBehalf), plus lib tests. Add an ORM test harness (Testcontainers Postgres/MySQL, or `pg-mem` for unit speed) to replace `mongodb-memory-server`.

---

## 10. Phased execution plan & effort

Estimates assume 1–2 engineers; ranges reflect the "Postgres-only" vs "both engines + pgvector" spread.

| Phase | Work | Est. |
|---|---|---|
| **0. Discovery & data-quality audit** | Confirm engine decision; audit dangling refs & duplicate emails; finalize per-table FK vs loose-string; choose Qdrant vs pgvector | 3–5 d |
| **1. Schema + ORM** | Define 45 tables, enums, indexes, partial-uniques, jsonb/child-table choices; migrations | 5–8 d |
| **2. Repository seam** | Introduce repositories, wire generic API + specialized routes to interface (Mongo-backed) | 4–6 d |
| **3. SQL implementation** | Implement SQL repos; port generic API; make `tests/server/api/db.*` green on SQL | 6–10 d |
| **4. Specialized routes** | Emissions (incl. aggregation), materiality/assessments, compliance, climate, assignments, audit, KB/RAG metadata, scheduler/backup, auth/OTP+TTL | 8–12 d |
| **5. Search/vector** | `tsvector`/`FULLTEXT`; pgvector (if chosen) + Qdrant retirement | 3–7 d |
| **6. ETL + validation** | Migration runner, legacy-id remap, cross-DB validator, dry runs on `seed/mongo-dump` | 5–8 d |
| **7. Test, perf, hardening** | Testcontainers CI, load-check hot endpoints, index tuning, rollback rehearsal | 4–6 d |
| **8. Cutover + cleanup** | Prod cutover; remove Mongoose, Firestore shim tooling (L5), drop `legacy_firebase_id` | 2–4 d |
| | **Total** | **~7–13 weeks** |

Add ~1–2 weeks if we commit to *simultaneously supported* MySQL **and** Postgres in production (extra CI matrix, dialect edge-cases, dual perf tuning).

---

## 11. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Dirty legacy refs (orphans, mixed id types) | ETL failures / broken links | Phase 0 audit; loose-string columns where needed; dangling-ref report gates cutover |
| Hidden Mongo-ism in a route | Runtime bug post-cutover | Repository seam + full API test suite on SQL before flip; `DB_DRIVER` parallel run |
| `jsonb` vs `JSON` behavior drift (if both engines) | Subtle bugs | Centralize JSON (de)serialization in repos; engine matrix in CI |
| RAG regression when leaving Qdrant | Search quality drop | Keep RRF merge; A/B `pgvector` vs Qdrant on a fixed query set before retiring |
| Scheduler runs shell (`mongodump`→`pg_dump`) | Backup gap / security | Update job + UI; restrict to `platform_admin`; command allow-list |
| Cutover data loss | Severe | Read-only window, full pre-cutover dump, rehearsed rollback (flip `DB_DRIVER` back to Mongo) |

---

## 12. Testing & validation

- **Contract tests:** existing `tests/server/api/*` must pass against SQL unchanged (proves frontend safety).
- **ETL validation:** per-table row counts, unique-constraint checks, dangling-ref = 0, checksum sampling of key fields.
- **Search eval:** fixed query/answer set; compare hybrid results Mongo+Qdrant vs SQL (+pgvector) with RRF.
- **Perf:** hot endpoints (`projectQuestions`, `answers`, `auditLogs` paged, emissions aggregation) under representative volume; verify indexes.
- **CI:** Testcontainers Postgres (and MySQL if supported); keep unit-fast path with `pg-mem` where possible.

---

## 13. Post-migration cleanup (the "clean" in clean migration) — DONE

| Planned cleanup | Outcome |
|---|---|
| Remove Mongoose, `mongodb-memory-server`, Mongo infra from `docker-compose.yml` | **Done** — `mongoose` dependency, the `mongo` service and `mongo_data` volume removed; compose is app + postgres + minio + redis + qdrant |
| Remove/retire Firestore export-import and `migrate:*` / `seed:dump` scripts | **Done** — `server/migration/firestoreExport.ts`, `scripts/import-firestore-export.ts` and ~15 Mongo-only scripts deleted with their npm aliases. `docs/archive/firebase-blueprint.json` **kept** as an archived reference |
| Drop `legacy_firebase_id` columns and the `OR legacy_firebase_id = ?` fallbacks | **Not done (deliberate)** — rows migrated from Firestore still carry these ids and old links still resolve through them. Optional future work |
| Collapse `findByExternalId/...ByExternalId` to plain PK operations | Partially — they remain as the id-resolution seam because of the point above |
| Rename Firestore-flavored error taxonomy in `src/services/db.ts` | Not done (cosmetic; shim kept intentionally) |
| Replace backup job default command | **Done** — `server/lib/backupCommand.ts` emits `pg_dump` / `mysqldump`; the seeded backup job was updated |
| Refresh `README.md`, architecture docs, `.env.example` (`MONGODB_URI` → `DATABASE_URL`) | **Done** — `MONGODB_URI` and `DB_DRIVER` removed from `.env.example`; `CLAUDE.md` and docs updated |

Also removed beyond the original list: `server/models/index.ts` (all Mongoose schemas), `server/db/mongo.ts`, `server/migrations/**`, the `seed/mongo-dump/` archive, and every `isSqlDriver()` branch in routes and data-access files.

---

## 14. Decisions (resolved — see §0)

1. **Engine:** Both **PostgreSQL and MySQL** supported via a provider-neutral Prisma schema; one engine per deployment. ✅
2. **Vectors:** Consolidate to **`pgvector`**; Qdrant retired. MySQL core uses a **Postgres sidecar** for `kb_chunks`. ✅
3. **Cutover:** Short **read-only maintenance window** (dual-write remains a documented fallback if needed). ✅
4. **FK strictness:** Per-table, decided in Phase 0 (clean relations get FKs; messy legacy columns stay indexed strings during transition). ✅
5. **ORM:** **Prisma.** ✅

Phase 0 (data-quality audit) and Phase 1 (schema) are the critical path.

---

## 15. Completion summary (what actually shipped)

All eight phases were delivered and production was cut over to PostgreSQL. The plan held up; the notable deviations:

- **Engine in practice: PostgreSQL only.** MySQL remains *supported* by the provider-neutral schema (`npm run db:provider mysql`) but was never deployed, so it is untested beyond typecheck.
- **Vectors: `pgvector` is the default**, but Qdrant was **not** retired — the adapter (`server/data/vector/qdrantVectorStore.ts`) and the compose service stayed, and `VECTOR_BACKEND=qdrant` is still a valid configuration.
- **Cutover model:** the "simple" read-only maintenance window (§8) was used. Dual-write was never needed.
- **`DB_DRIVER` is gone.** It existed for the duration of the migration so Mongo and SQL could run in parallel; with Mongo removed it was deleted, along with `getDbDriver()` / `isSqlDriver()` in `server/data/prismaClient.ts`.
- **Rollback to Mongo is no longer possible.** The Mongo code path, the Mongoose models, the `mongo` compose service and the seed dump are all deleted. The rollback plan in §11 applied only to the cutover window and has expired.
- **`legacy_firebase_id` was kept**, not dropped (see §13).
- **Tests:** `mongodb-memory-server` fixtures were replaced by a Testcontainers-Postgres suite under `tests/server/sql/**` (`npm run test:server:sql`), wired into CI via `.github/workflows/sql-tests.yml`.
- **ETL tooling was deleted after use.** `scripts/migrate-mongo-to-sql.ts`, `validate-sql-migration.ts`, `audit-mongo-data.ts`, `migrate-embeddings-to-pgvector.ts` and the rest served their purpose and are gone; the runbooks that describe them ([`../sqlmigration/staging-prod-etl-runbook.md`](../sqlmigration/staging-prod-etl-runbook.md)) are now historical.

Current-state reference: `CLAUDE.md` and [`../sqlmigration/local-dev-runbook.md`](../sqlmigration/local-dev-runbook.md).

