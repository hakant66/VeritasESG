# GovernanceIQ — Architecture Analysis

**Generated:** 2026-05-30  
**Status:** Active — see roadmap for prioritized action items.

---

## 1. Executive Summary

This document records the findings of a systematic architectural review of GovernanceIQ. It identifies 14 issues ranked by severity and effort, provides Architecture Decision Records (ADRs) for the 7 most impactful improvements, and a 3-phase roadmap.

Two corrections to preliminary assumptions confirmed during review:
- The "3-copy" platform-role duplication is actually **1 re-export + 1 true duplicate**: `src/lib/platformRoles.ts` re-exports `lib/platformRoles.ts` (no drift risk). The only real duplicate is the hand-typed `PLATFORM_USER_ROLE_ENUM` in `server/models/index.ts:41-48`.
- The `/api/db` authorization gap is **worse than expected**: `GET` handlers (mongoApi.ts:255, 293) read no `Authorization` header at all — reads are open to anonymous callers.

---

## 2. Issue Register

| # | Issue | Severity | Effort | Key Evidence |
|---|-------|----------|--------|--------------|
| I-1 | No row-level/tenant authorization on `/api/db/:resource` | **Critical** | L | Writes only stamp `createdBy` (mongoApi.ts:308); no role or customerId scoping |
| I-2 | `GET /api/db/*` requires no authentication at all | **Critical** | S | mongoApi.ts:246, 255, 293 never read `Authorization` header |
| I-3 | No request/body validation anywhere | **High** | L | No zod/joi/yup/express-validator in package.json |
| I-4 | JWT in `localStorage` with no CSP/helmet | **High** | M | src/lib/authToken.ts; no helmet in server.ts |
| I-5 | `server.ts` monolith (1,620 lines, ~25 routes) | **High** | M | All routes in one `startServer()` closure |
| I-6 | `ProjectDetailPage.tsx` (8,479 lines, 71 useState, 6 tabs) | **High** | XL | Tab ternary lines 4360-6361; eager XLSX/Gemini imports |
| I-7 | Hardcoded fallback secrets | **High** | S | server.ts:42 (`JWT_SECRET` fallback), server.ts:1382 |
| I-8 | 3 inconsistent auth-parsing patterns | **Medium** | M | `resolvePlatformUserFromRequest` vs `getRequesterId` vs inline `jwt.verify` |
| I-9 | No service/business-logic layer | **Medium** | L | Logic in Express closures + React page |
| I-10 | Firestore shim still load-bearing | **Medium** | XL | `src/services/db.ts` 1,522 lines; emulation block ~dead, helpers alive |
| I-11 | `MASTER_ADMIN_EMAILS` hardcoded | **Medium** | S | server.ts:53 |
| I-12 | Logging request bodies/tokens | **Low** | S | server.ts:553, server.ts:986 |
| I-13 | Boot-time fire-and-forget migrations | **Low** | M | server.ts:380-394 |
| I-14 | `passwordHash` only stripped by `serialize()` | **Low** | S | mongoApi.ts:201; prefer `select: false` on the schema field |

---

## 3. Detailed Findings

### WS4-T1: Monolith/splitting risks

**`server.ts` (1,620 lines)** contains ~10 extractable route/helper groups currently inside one `startServer()` closure:

| Group | Lines | Route prefix |
|-------|-------|--------------|
| Auth/session | 414-549, 984-1016 | `/api/auth/*` |
| Password reset | 1018-1110, 1305-1323 | `/api/auth/reset-password`, `/api/email/send-reset` |
| OTP | 1112-1196 | `/api/auth/otp/*` |
| Profile upload (Multer) | 482-545 | `/api/uploads/*` |
| Assignment email | 1198-1303 | `/api/email/send-assignment` |
| Quick/merge assignments | 552-801 | `/api/projects/:id/quick-assignment`, `/api/projects/:id/merge-assignments` |
| Admin/migration | 804-979, 1325-1401 | `/api/admin/*` |
| Customer API (API-key gated) | 1417-1587 | `/api/v1/customer/*` |
| Contact magic-link | ~1005 | `/api/auth/validate-token`, `/api/auth/generate-token` |

The pattern `registerXRoutes(app, ctx)` already exists (`registerMongoApiRoutes`, `registerOnBehalfResponseRoutes`). Extraction is mechanical.

**`ProjectDetailPage.tsx` (8,479 lines)** — 6 tabs rendered as a single ternary chain (lines 4360-6361), 71 `useState` hooks, ~30 helper functions/sub-components declared in-file. XLSX and Gemini are imported at module top-level (eager). `ProjectPlanTab` is already extracted (line 142), proving the pattern works.

### WS4-T2: Security debt

**Unauthenticated reads (Critical — I-2):** `registerMongoApiRoutes` middleware at `mongoApi.ts:246` only calls `connectMongo()`. `GET /api/db/:resource` and `GET /api/db/:resource/:id` at lines 255 and 293 never parse `Authorization`. Any HTTP client can enumerate all exposed collections.

**No row-level authorization (Critical — I-1):** Write handlers call `getRequesterId()` (mongoApi.ts:233) only to stamp `createdBy`. No customerId scoping, no role check. A low-privilege JWT can create/patch/delete any tenant's data.

**LocalStorage JWT + no security headers (High — I-4):** `src/lib/authToken.ts` stores the bearer token in `localStorage`. `server.ts` has no `helmet` middleware and sets no CSP headers. Any successful XSS exfiltrates the session token until it expires (default `1d`).

**Missing validation (High — I-3):** POST/PATCH/PUT handlers pass `convertIncomingDates(req.body)` directly to Mongoose. Over-posting arbitrary fields is possible. The only backstop is Mongoose's own `ValidationError`.

### WS4-T3: Migration/layering debt

**`src/services/db.ts` (1,522 lines):** Lines 21-206 are a dead Firestore emulation block. Lines 402-1521 contain live domain helpers (caching, error handling, role logic) still actively used by many components. The emulation block is safe to delete but the helpers are not.

**Role enum duplication (I via ADR-06):** `lib/platformRoles.ts` is canonical. `src/lib/platformRoles.ts` is a pure re-export (no drift risk). `server/models/index.ts:41-48` contains a hand-typed array `PLATFORM_USER_ROLE_ENUM` that must be kept in sync manually. Fix is trivial (derive from `CANONICAL_PLATFORM_ROLES` import).

**No service layer:** Business logic for merge-assignments (server.ts:718-801), create/rebuild-from-template (mongoApi.ts:717-816), and contact-conflict migration (server.ts:870-979) lives in Express closures. Multi-step flows cannot be unit-tested without HTTP. Invariants are partially duplicated between server routes and the React page.

---

## 4. Architecture Decision Records

| ADR | Title | Status | Severity | Effort |
|-----|-------|--------|----------|--------|
| [ADR-01](adr/ADR-01-extract-server-routes.md) | Extract server.ts routes into server/routes/* | Proposed | High | M |
| [ADR-02](adr/ADR-02-code-split-project-detail.md) | Code-split ProjectDetailPage.tsx | Proposed | High | XL |
| [ADR-03](adr/ADR-03-resource-scoped-authorization.md) | Resource-scoped routes + row-level authorization | Proposed | **Critical** | L |
| [ADR-04](adr/ADR-04-httponly-cookie-auth.md) | Migrate JWT to HttpOnly cookies + CSRF | Proposed | High | M |
| [ADR-05](adr/ADR-05-request-validation-zod.md) | Request validation with zod at route boundaries | Proposed | High | L |
| [ADR-06](adr/ADR-06-single-source-platform-roles.md) | Single source of truth for platform roles | Proposed | Medium | S |
| [ADR-07](adr/ADR-07-service-layer.md) | Introduce a server-side service layer | Proposed | Medium | L |

---

## 5. Three-Phase Roadmap

### Phase 1 — Quick Wins (no behavior change, ≤1 week)

| Task | ADR | Effort | Why first |
|------|-----|--------|-----------|
| Remove hardcoded fallback secrets (server.ts:42, 1382) | I-7 | S | Zero risk, removes credentials from code |
| Derive `PLATFORM_USER_ROLE_ENUM` from `CANONICAL_PLATFORM_ROLES` | ADR-06 | S | One-liner, eliminates drift hazard |
| Add `select: false` to `passwordHash` schema field | I-14 | S | Defense-in-depth; `serialize()` is not the only path |
| Stop logging request bodies/tokens | I-12 | S | Privacy/compliance; dead simple |
| Add `helmet` to Express (baseline CSP) | I-4 partial | S | Header-only, no auth change |
| Add `GET /api/db` auth middleware (require bearer) | ADR-03 stage 1 | S | Closes anonymous reads immediately |

### Phase 2 — Security & Correctness (2–6 weeks)

| Task | ADR | Effort |
|------|-----|--------|
| Extract server.ts route groups into server/routes/* | ADR-01 | M |
| Migrate JWT to HttpOnly cookies + CSRF | ADR-04 | M |
| Add per-resource authorization policy + tenant scoping | ADR-03 stage 2 | M |
| Add zod validation on auth routes first, then CRUD | ADR-05 | L (incremental) |
| Consolidate JWT parsing to `resolvePlatformUserFromRequest` | I-8 | M |

### Phase 3 — Architecture (6+ weeks)

| Task | ADR | Effort |
|------|-----|--------|
| Extract tab components from ProjectDetailPage | ADR-02 | XL |
| Introduce server/services/* layer | ADR-07 | L |
| Retire Firestore emulation block in db.ts | ADR-07 | XL |
| Route-level dynamic imports for XLSX/Gemini/export | ADR-02 | M |

---

## 6. Risks of Inaction

- **I-2 (unauthenticated reads):** Any actor with network access to the API can enumerate customers, contacts, platform users, answers, and audit logs without credentials. This is a data-breach risk in any deployment reachable from outside localhost.
- **I-1 (no row-level auth):** A `customer` role user with a valid JWT can modify another tenant's answers or project data.
- **I-3 (no validation):** Over-posting allows untrusted clients to set internal fields (e.g. `ownerId`, `isConfirmed`, `platformRole`) directly on created documents.
- **I-7 (hardcoded secrets):** If server.ts is ever exposed (e.g., source leak), the fallback JWT secret is compromised; any token becomes forgeable.
