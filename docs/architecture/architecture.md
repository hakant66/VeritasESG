# VeritasESG — Architecture Analysis

**Generated:** 2026-05-30
**Status:** Historical point-in-time review — see note below before relying on it.

> **2026-11-02 note:** Sections 1–6 below were written before the MongoDB → PostgreSQL/Prisma migration (now complete; see `docs/migration/mongo-to-sql-migration-plan.md` and CLAUDE.md) and describe a backend (Mongoose models, `server/models/index.ts`, unauthenticated `GET /api/db/*`) that no longer exists in that form. Several issues in the register below may already be resolved by that migration (e.g. I-2's unauthenticated-reads finding — the current `registerMongoApiRoutes` requires `requireAuth: true`) or may need re-verification against the current PostgreSQL/Prisma codebase; this document was **not** re-audited as part of that migration or the changes below. Treat the issue register and line numbers as historical, not current. For the current, maintained stack reference, see [`tech-stack-architecture.md`](tech-stack-architecture.md). Section 7, added below, covers what's new since this review and is current as of today.

---

## 1. Executive Summary

This document records the findings of a systematic architectural review of VeritasESG. It identifies 14 issues ranked by severity and effort, provides Architecture Decision Records (ADRs) for the 7 most impactful improvements, and a 3-phase roadmap.

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

---

## 7. Since this review (current as of 2026-11-02)

The findings above predate several architectural changes. This section is current; sections 1–6 are not (see the note at the top of this document).

### MongoDB → PostgreSQL/Prisma migration (complete)

The backend described in sections 1–6 (Mongoose, `server/models/index.ts`, MongoDB-backed `/api/db/*`) has been fully replaced. PostgreSQL via Prisma 6 is now the only backend; `prisma/schema.prisma` is the single source of truth for the data model. See [`tech-stack-architecture.md`](tech-stack-architecture.md) (the maintained, current stack reference) and `docs/migration/mongo-to-sql-migration-plan.md` / `docs/migration/mongo-to-sql-implementation-status.md` for the migration itself. `server/routes/mongoApi.ts` keeps its name for historical reasons only — it is Postgres-only, and `registerMongoApiRoutes` is registered with `requireAuth: true`, closing the I-2 unauthenticated-reads finding above (row-level/tenant authorization per I-1 has not been re-audited against the current codebase).

### VeritasESG AI Quality & Continuous Improvement (Hermit)

A new, optional, `platform_admin`-managed subsystem (Settings → **AI Quality**, off by default) for evaluating — and, once a human approves a candidate, improving — the prompting behind AI-assisted features (questionnaire autofill, customer profile autofill, KB RAG), built on the open-source [Hermit](https://github.com/Infini-AI-Lab/hermit) harness-adapter framework.

- **Admin gate:** `lib/aiQualitySettings.ts`, `server/lib/aiQuality/aiQualityConfig.ts`, `server/routes/aiQualityRoute.ts` (`GET/PUT /api/admin/ai-quality/settings`), `src/components/admin/AiQualityPanel.tsx`. Built and live-verified end to end (API + UI, toggle persists).
- **Schema:** 7 new, additive Prisma models — `AiEvaluationDataset`, `AiEvaluationCase`, `AiEvaluationRun`, `AiEvaluationResult`, `AiAdapterVersion`, `AiAdapterApproval`, `AiAdapterDeployment` — migrated, currently empty.
- **Isolation:** Hermit itself is Python, run in a separate, profile-gated `hermit-worker` Docker Compose service (`docker compose --profile hermit up hermit-worker`) — never started by `docker compose up`, and never embedded in an Express request handler. A real baseline evaluation was run through the actual Hermit CLI against the live app (`hermit/` — pipelines, datasets, configs), proving the integration works, not just scaffolded.
- **What's not built yet:** persisting evaluation results into the new tables, the "Evaluation runs" / "Adapter experiments" / "Approval management" / "Quality trends" admin UI sections, any LLM-assisted judging, and — deliberately, pending human review — any actual adapter training, approval, or deployment.

Full design, verified facts about Hermit's real contract, and an honest list of what's done vs. planned: [`docs/hermit/architecture-review.md`](../hermit/architecture-review.md).

### Formlar / reporting-framework workflow changes

The Formlar (forms) tab moved from a single destructive "rebuild" model to an additive one: **Form Ekle** now adds a template's pages/questions alongside what a project already has (instead of wiping it), is visible even when forms already exist (not just on an empty project), and a new multi-select lets an admin delete a chosen subset of forms without affecting the rest. Saving a project's Reporting Framework selection can now auto-add the matching template(s) (e.g. selecting both TSRS 1 and TSRS 2 adds both) when the selection unambiguously implies them.
