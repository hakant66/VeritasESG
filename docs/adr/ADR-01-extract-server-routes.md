# ADR-01: Extract server.ts routes into server/routes/* modules

## Status
Proposed

## Context

`server.ts` is 1,620 lines: ~25 route handlers plus CORS, mail, auth helpers — all inside one `startServer()` closure. Route groups present:

| Group | Lines |
|-------|-------|
| Auth/session/logout | 414-549, 984-1016 |
| Password reset | 1018-1110, 1305-1323 |
| OTP | 1112-1196 |
| Profile upload (Multer) | 482-545 |
| Assignment email | 1198-1303 |
| Quick/merge assignments | 552-801 |
| Admin/migration | 804-979, 1325-1401 |
| Customer API (API-key gated) | 1417-1587 |
| Contact magic-link | ~1005 |

Shared state (`upload`, `corsAllowedOrigins`, `JWT_SECRET`) is captured by closure. A syntax error anywhere drops the app into the emergency fallback server (line 1610). The `registerMongoApiRoutes` and `registerOnBehalfResponseRoutes` patterns already exist, proving module extraction works.

This also blocks ADR-05 (validation middleware) and ADR-07 (service layer) since per-router middleware cannot be cleanly attached without defined router boundaries.

## Decision

Extract each route group into a `registerXRoutes(app, ctx)` module under `server/routes/`, following the existing pattern. Pass shared config via a typed `AppContext` object: `{ jwtSecret, mailer, upload, corsOrigins }`. Move transport helpers to `server/lib/mailer.ts`, `server/lib/cors.ts`.

Consolidate the 3 JWT parsing patterns onto `resolvePlatformUserFromRequest` everywhere (closes I-8 from architecture.md).

`server.ts` becomes a thin composition root (~150 lines): imports modules, builds `AppContext`, registers routes in documented order.

## Rationale

Smaller files reduce blast radius and merge conflicts. Per-router middleware (auth from ADR-03, validation from ADR-05) becomes attachable cleanly. Route registration order constraints become explicit in one composition root. Enables `buildApp()` factory for test harness (closes test-plan.md gap #2).

## Risks

- Closure-captured state must be threaded explicitly; a missed dependency breaks a route silently.
- Route registration order matters (the generic `/api/db` catch-all must come after specific routes). Must be documented and enforced in the composition root.

Mitigation: extract one group per PR, run `npm run lint` + smoke-test each endpoint after each extraction.

## Migration Path

1. Create `server/lib/mailer.ts`, `server/lib/cors.ts` — move pure helpers (zero route change).
2. Create `server/routes/auth.ts` — move auth + OTP + password reset; register from server.ts.
3. Create `server/routes/assignments.ts` — move quick/merge assignment routes.
4. Create `server/routes/email.ts` — move assignment/reset email routes.
5. Create `server/routes/admin.ts` — move admin/migration routes.
6. Create `server/routes/uploads.ts` — move Multer profile image route.
7. Create `server/routes/customerApi.ts` — move `/api/v1/customer/*`.
8. Replace all inline `jwt.verify(req.headers.authorization?.replace('Bearer ', ''))` with `resolvePlatformUserFromRequest`.
9. Introduce `buildApp(ctx): Express` factory used by both server.ts and the test harness.
10. server.ts becomes composition root.

## Effort

M (2–5 days, parallelizable per group after step 1).
