# Phase 0 — Discovery & data-quality audit

**Plan reference:** Migration plan §10 Phase 0 (3–5 days estimated)

## Planned

- Confirm engine decision (Postgres primary, MySQL supported)
- Audit dangling references and duplicate emails
- Finalize per-table FK vs loose-string columns
- Choose Qdrant vs pgvector (resolved: pgvector)
- Gate ETL on data-quality report

## Delivered

| Artifact | Path | Notes |
|----------|------|-------|
| Audit CLI | `scripts/audit-mongo-data.ts` | Read-only against `MONGODB_URI` |
| Schema registry | `server/data/migration/schemaMap.ts` | 45 collections → Prisma models, unique keys, ref fields |
| npm script | `npm run audit:mongo` | |

### Audit outputs

- Document counts per collection
- Duplicate values on declared unique keys
- Dangling `*Id` references (hard vs soft)
- `legacyFirebaseId` usage stats
- `--json` for machine-readable reports

## Remaining

- [ ] Run audit on production/staging Mongo and archive report in this folder (e.g. `reports/audit-YYYY-MM-DD.json`)
- [ ] Sign off FK strictness per table based on audit
- [ ] Add audit to pre-ETL checklist in CI (optional gate)

## Validation

```bash
MONGODB_URI=mongodb://localhost:27018/governance npm run audit:mongo
MONGODB_URI=... npm run audit:mongo -- --json > docs/sqlmigration/reports/audit-local.json
```
