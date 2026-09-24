# Phase 6 — ETL + validation

**Plan reference:** Migration plan §6, §8, §10 Phase 6 (5–8 days estimated)

## Planned

- Deterministic Mongo → SQL ETL with global `legacyFirebaseId → _id` map
- Dependency-ordered collection load
- `--dry-run`, `--collection`, `--resume` flags
- Cross-DB validator (row counts)
- Repurpose validate script for SQL parity

## Delivered

| Artifact | Path | Notes |
|----------|------|-------|
| ETL runner | `scripts/migrate-mongo-to-sql.ts` | Chunked load; `skipDuplicates` idempotency |
| Cross-DB validator | `scripts/validate-sql-migration.ts` | Per-resource Mongo vs SQL counts |
| Schema map | `server/data/migration/schemaMap.ts` | Drives order and field mapping |
| npm scripts | `migrate:mongo-to-sql`, `migrate:validate-sql` | |

### ETL steps (as implemented)

1. Build global legacy-id → canonical `_id` hex map
2. For each collection in dependency order: transform refs, JSON embeds, dates
3. Bulk insert via Prisma (`createMany` with per-row fallback on chunk failure)
4. Report per-collection success/skip/error counts

## Remaining

- [ ] Archive validator output in `docs/sqlmigration/reports/validate-YYYY-MM-DD.txt`
- [ ] Dangling-reference report post-ETL (extend validator beyond counts)
- [ ] Checksum sampling of key fields (plan §12)
- [ ] `--resume` flag (if not fully implemented — verify script)
- [x] `climateScenarios` GFANZ pathway templates without `projectId` — skipped via `etlRequiredFields` (see `climatePathwaySeed.ts`)

### climateScenarios edge case

`seedGFANZPathways()` upserts pathway catalog rows into `climatescenarios` without `projectId`. These are not project scenarios. ETL excludes them; validation uses `mongoEtlFilter()` so counts match (0 vs 0 until real scenarios exist). ObjectId reference fields are normalized to hex strings before load.

## Validation

```bash
npm run audit:mongo
npm run migrate:mongo-to-sql -- --dry-run
npm run migrate:mongo-to-sql
npm run sql:validate
```

Expected: all resources `ok` in validator output.
