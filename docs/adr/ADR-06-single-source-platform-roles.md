# ADR-06: Single source of truth for platform roles

## Status
Proposed — **QUICK WIN (< 1 day)**

## Context

The "3-copy" concern from initial analysis was clarified during review:

- `lib/platformRoles.ts` — **canonical source**. Defines `CANONICAL_PLATFORM_ROLES`, `LEGACY_PLATFORM_ROLE_MAP`, `normalizePlatformRole`, `CanonicalPlatformRole` type.
- `src/lib/platformRoles.ts` — a **pure re-export** of the canonical file. No content, no drift risk.
- `server/models/index.ts` lines **41-48** — a **hand-typed copy** of the six role strings as `PLATFORM_USER_ROLE_ENUM`, used as the Mongoose `enum` validator and re-typed as a TS union in the `platformUser` interface (lines 615-621). **This is the only real hazard.**

The server already imports `normalizePlatformRole` from `lib/platformRoles.ts` (mongoApi.ts:15), confirming the shared import path works at runtime.

The CLAUDE.md currently carries a manual "must stay in sync" rule for role changes — a process constraint that can be eliminated entirely by this ADR.

## Decision

In `server/models/index.ts`:
1. Import `CANONICAL_PLATFORM_ROLES` and `CanonicalPlatformRole` from `../../lib/platformRoles.ts`.
2. Replace the literal `PLATFORM_USER_ROLE_ENUM` array with `[...CANONICAL_PLATFORM_ROLES] as const`.
3. Replace the hand-typed TS union in the `platformUser` interface with `CanonicalPlatformRole`.
4. Delete the now-redundant string literals.

Keep `src/lib/platformRoles.ts` as a re-export (it is correct and used by frontend components).

## Rationale

A future role add/remove becomes a single-line change in `lib/platformRoles.ts` that propagates to Mongoose validation, client role checks, and server authorization automatically. Eliminates the manual "must stay in sync" rule from CLAUDE.md.

## Risks

- ESM import path from `server/models/index.ts` to `lib/platformRoles.ts` — already proven to work via the existing `mongoApi.ts:15` import.
- The Mongoose model hot-reload guard at `server/models/index.ts:33` still applies; using a derived enum does not affect it.
- `npm run migrate:platform-roles` is unaffected — it calls `normalizePlatformRole` which is already in the canonical file.

## Migration Path

1. In `server/models/index.ts`, add: `import { CANONICAL_PLATFORM_ROLES, CanonicalPlatformRole } from '../../lib/platformRoles.ts';`
2. Replace: `const PLATFORM_USER_ROLE_ENUM = ['platform_admin', ...]` with `const PLATFORM_USER_ROLE_ENUM = [...CANONICAL_PLATFORM_ROLES] as const;`
3. Replace the TS union `'platform_admin' | 'consultant_manager' | ...` in the interface with `CanonicalPlatformRole`.
4. Delete the redundant literals. Run `npm run lint`.
5. Update `CLAUDE.md` to remove the manual sync rule.
6. Add a CI test in `tests/shared/platformRoles.test.ts` that asserts `CANONICAL_PLATFORM_ROLES` deep-equals the Mongoose enum (prevents future drift).

## Effort

S (< 1 day).
