# ADR-03: Resource-scoped routes + row-level authorization for /api/db

## Status
Proposed — **IMPLEMENT STAGE 1 IMMEDIATELY**

## Context

`/api/db/:resource` exposes 21 Mongoose models (mongoApi.ts:42-65) including `customers`, `contacts`, and `platformUsers`.

**Critical finding:** The `/api/db` middleware (mongoApi.ts:246) only calls `connectMongo()`. GET handlers at lines 255 and 293 read no `Authorization` header — **anonymous reads of any collection are possible**. Write handlers use `getRequesterId` (line 233) only to stamp `createdBy` (line 308); no role check, no `customerId`/ownership scoping is performed. A `customer`/`auditor` token (or an anonymous caller, for reads) can enumerate, read, patch, or delete any tenant's data.

The `resolvePlatformUserFromRequest` helper exists in `server/lib/requestAuth.ts` but is not wired to the `/api/db` router.

## Decision

**Stage 1 (immediate):** Add `requireAuth` middleware to the `/api/db` router using `resolvePlatformUserFromRequest`. Reject unauthenticated requests with 401. This closes the anonymous-read gap (I-2) with minimal risk.

**Stage 2:** Replace the generic allow-map with a policy table. For each resource, declare:
- Allowed roles per verb (GET/POST/PATCH/PUT/DELETE)
- A tenant-scoping rule (inject `{ customerId: requester.resolvedCustomerId }` into the Mongo filter for non-admin roles)
- Fields that are server-set-only (e.g. `createdBy`, `ownerId`, `isConfirmed`, `platformRole`)

Keep the generic plumbing but make scoping mandatory and server-derived — never trust client-supplied `customerId` for filtering.

## Rationale

Row-level scoping derived from the authenticated user (not query params) is the only correct fix for multi-tenant isolation. A declarative policy table avoids writing 21 separate routers while making authorization auditable in one place.

## Risks

- Tightening scope can break legitimate client calls that currently over-fetch (e.g. admin lists that pass no `customerId`). Must map each role's required reads before enforcing.
- Performance: customer-scoping filters need indexes (`customerId` indexes largely exist).

Mitigation for Stage 2: ship in "log-only" mode that records would-be-denied requests to the audit log before enforcing. Flip to enforce per resource starting with the most sensitive: `platformUsers`, `customers`, `contacts`.

## Migration Path

1. **Stage 1** (S effort, ship immediately): Add `requireAuth` to `/api/db` middleware; deploy; monitor for unexpected 401s.
2. Define `RESOURCE_POLICY: Record<resource, { readRoles, writeRoles, scope }>`.
3. Compute `requesterScope` once per request (role + `customerId` set) from the resolved user.
4. Merge server-derived scope into `buildFilter`; ignore client-supplied `customerId` for non-admins.
5. Enforce `writeRoles` check before `create`/`patch`/`delete`.
6. Run Stage 2 in log-only mode, then flip to enforce per resource.
7. Add zod body schemas per resource (pairs with ADR-05).

## Effort

Stage 1: **S** (1–2 hours, ship today).  
Stage 2: **L** (1–2 weeks).
