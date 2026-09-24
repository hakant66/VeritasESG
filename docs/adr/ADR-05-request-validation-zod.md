# ADR-05: Request validation with zod at route boundaries

## Status
Proposed

## Context

No validation library is present in `package.json` (no zod, joi, yup, or express-validator).

The generic `/api/db/:resource` POST/PATCH/PUT handler runs `convertIncomingDates(req.body)` then calls `model.create`/`model.findByIdAndUpdate`, stripping only `id`, `_id`, `__v` (mongoApi.ts:159). This allows over-posting arbitrary fields: a client can set `ownerId`, `isConfirmed`, `platformRole`, or any internal field directly. Mongoose's own `ValidationError` is the only backstop, and it does not enforce whitelisting — it ignores unknown fields and casts loosely.

Auth and feature-specific routes in `server.ts` use ad-hoc `typeof`/`String()` guards that are inconsistent and incomplete.

## Decision

Adopt `zod`. Define one schema per write endpoint (and per resource for the generic gateway). Validate and parse `req.body`/`req.query` in a `validate(schema)` middleware that:
1. Runs `schema.parse(req.body)` (throws `ZodError` on failure).
2. Replaces `req.body` with the parsed, whitelisted output — unknown fields are dropped.
3. Returns a consistent 400 envelope on `ZodError`: `{ success: false, code: 'db/validation-error', error: '...' }`.

Share zod schemas with the frontend where practical to align TypeScript types. Derive the platform-role schema from `CANONICAL_PLATFORM_ROLES` (ties to ADR-06).

## Rationale

- Centralizes input trust and eliminates scattered manual guards.
- Strict output of `schema.parse` kills over-posting without per-route field lists.
- Consistent 400 error shapes (the `{success:false, code:'db/validation-error'}` envelope already exists in mongoApi.ts).
- Zod schemas serve as executable documentation of accepted inputs.

## Pairing with ADR-03

Per-resource zod schemas slot naturally into the per-resource policy/handlers introduced by ADR-03. They should be developed together in Stage 2.

## Risks

- Strict schemas may reject currently-accepted loose payloads from the client (e.g. extra fields that UI accidentally sends). Requires inventorying real client payloads before enforcing.
- Shared schemas increase coupling between client and server build. Scope sharing carefully — prefer the server schema as the source of truth, and generate client types from it.

Mitigation: start in "warn-and-pass" mode that logs `ZodError` violations without rejecting, then flip to enforce per route after observing violations.

## Migration Path

1. Add `zod` to dependencies. Create `server/lib/validate.ts` middleware.
2. Schema the most sensitive auth routes first: `POST /api/auth/login`, `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`, `POST /api/admin/set-password`, `POST /api/auth/reset-password`.
3. Schema the answer/assignment custom routes in server.ts.
4. Schema the generic gateway per resource in a `RESOURCE_CREATE_SCHEMAS` map; run warn-only first, then enforce.
5. Derive `PlatformUserRoleSchema` from `CANONICAL_PLATFORM_ROLES` (see ADR-06).

## Effort

L (1–2 weeks, incremental per-route).
