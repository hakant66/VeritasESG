# Phase 2 — Repository seam

**Plan reference:** Migration plan §9 steps 1–2, §10 Phase 2 (4–6 days estimated)

## Planned

- Introduce `server/data/repositories/*` with route-facing method signatures
- Initially Mongo-backed (no behaviour change) — **adapted:** seam goes straight to Prisma when `DB_DRIVER=sql`
- Centralize JSON serialization and API input normalization
- Single factory for driver selection

## Delivered

| Artifact | Path | Role |
|----------|------|------|
| `ResourceRepository` interface | `server/data/resourceRepository.ts` | list, get, create, update, patch, delete, bulkCreate |
| Prisma implementation | `server/data/prismaResourceRepository.ts` | Dynamic delegate per resource; chunk transactions |
| Driver helpers | `server/data/prismaClient.ts` | `getDbDriver()`, `isSqlDriver()`, `getPrisma()`, `getVectorPrisma()` |
| Factory | `server/data/index.ts` | `getSqlResourceRepository()` returns null when `DB_DRIVER=mongo` |
| Serialize | `server/lib/apiSerialize.ts` | Epoch dates, password strip, avatar rewrite |
| Input normalize | `server/lib/apiInput.ts` | Shared with mongoApi |
| ETL registry | `server/data/migration/schemaMap.ts` | Collection ↔ model ↔ resource name |

## Remaining

- [ ] Mongo-backed repository implementation behind same interface (optional — routes still call Mongoose directly when `DB_DRIVER=mongo`)
- [ ] Expand repository with bespoke methods as specialized routes port (e.g. emissions `GROUP BY`)
- [ ] `findByExternalId` unified PK + legacy fallback in Prisma layer

## Pattern for new SQL paths

```typescript
import { isSqlDriver, getPrisma } from '../data/prismaClient.ts';

if (isSqlDriver()) {
  // Prisma or raw SQL
  return res.json(serialize(row));
}
// existing Mongoose path
```
