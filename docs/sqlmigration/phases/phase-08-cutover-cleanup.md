# Phase 8 — Cutover + cleanup

**Plan reference:** Migration plan §13, §10 Phase 8 (2–4 days estimated)

## Planned (post-validation only)

**Do not execute until SQL path is validated in staging/production.**

### Infrastructure removal

- Remove Mongoose, `mongodb-memory-server`
- Drop `mongo` and `qdrant` services from `docker-compose.yml`
- Retire Firestore tooling: `server/migration/firestoreExport.ts`, `scripts/import-firestore-export.ts`, `migrate:import`
- Retire `seed:dump` / `seed:restore` or repurpose for SQL dumps

### Schema cleanup

- Drop `legacyFirebaseId` columns
- Remove `OR legacyFirebaseId = ?` fallbacks in API
- Collapse `findByExternalId` to single PK lookup

### Documentation / env

- `MONGODB_URI` → `DATABASE_URL` as primary in README, `.env.example`
- Update Settings → Backup UI copy (`pg_dump` default)
- Refresh `docs/architecture/tech-stack-architecture.md`

## Delivered (additive prep only)

| Item | Status |
|------|--------|
| Postgres service in compose | Done (additive) |
| `backupCommand.ts` for pg_dump/mysqldump | Done (not wired) |
| Cleanup checklist in plan §13 | Documented |
| `firebase-blueprint.json` archived | `docs/archive/firebase-blueprint.json` |

## Remaining

- [ ] Production cutover runbook (read-only window)
- [ ] Pre-cutover `mongodump` + `pg_dump` archives
- [ ] Smoke test checklist post-flip
- [ ] Execute all §13 cleanup items
- [ ] Remove `connectMongo()` mandatory boot when Mongo retired

## Cutover gate checklist

- [ ] Phase 4 specialized routes complete
- [ ] Phase 7 CI green on SQL
- [ ] ETL validator zero mismatches on production snapshot
- [ ] RAG A/B acceptable on pgvector
- [ ] Stakeholder sign-off on maintenance window
