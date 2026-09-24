# Phase 3 — Generic API on SQL

**Plan reference:** Migration plan §9 step 4, §10 Phase 3 (6–10 days estimated)

## Planned

- Port generic `/api/db/:resource` first (covers most frontend traffic)
- Wire settings and answer upsert
- Preserve `serialize()` semantics
- Make `tests/server/api/db.*` pass on SQL

## Delivered

| Endpoint / behaviour | SQL handler | Wired in |
|---------------------|-------------|----------|
| `GET /api/db/:resource` (list + filters) | `genericApiSql.list` | `mongoApi.ts` |
| `GET /api/db/:resource/:id` | `genericApiSql.get` | `mongoApi.ts` |
| `POST /api/db/:resource` | `genericApiSql.create` | `mongoApi.ts` |
| `POST /api/db/bulk` | `genericApiSql.bulkCreate` | `mongoApi.ts` |
| `PATCH /api/db/:resource/:id` | `genericApiSql.patch` | `mongoApi.ts` |
| `PUT /api/db/:resource/:id` | `genericApiSql.put` | `mongoApi.ts` |
| `DELETE /api/db/:resource/:id` | `genericApiSql.delete` | `mongoApi.ts` |
| `GET /api/settings/:key` | `genericApiSql.getSetting` | `mongoApi.ts` |
| `PUT /api/settings/:key` | `genericApiSql.putSetting` | `mongoApi.ts` |
| Answers upsert route | `genericApiSql.upsertAnswer` | `mongoApi.ts` |

### Behaviour guarantees

- When `DB_DRIVER=mongo` (default): Mongo code path unchanged
- When `DB_DRIVER=sql`: generic CRUD uses Prisma via `getSqlResourceRepository()`
- Frontend `src/services/db.ts` unchanged

## Remaining

- [ ] Live integration tests with Testcontainers (`DB_DRIVER=sql`) — Phase 7
- [ ] Edge cases: complex filters, `orderBy`, nested paths used by ProjectDetailPage
- [ ] Authorization (ADR-03) — separate from migration; still UI-only on `/api/db/*`

## Validation

```bash
DB_DRIVER=sql DATABASE_URL=... npm run test:server -- tests/server/api/db
# Today: typecheck passes; live SQL tests deferred
npm run lint
```
