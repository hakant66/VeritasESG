# ADR-07: Introduce a server-side service layer

## Status
Proposed

## Context

No `server/services/` directory exists. Business logic currently lives in three locations:

1. **Express closures in `server.ts`**: merge-assignments (lines 718-801), analyze/migrate-contact-conflicts (lines 870-979).
2. **`server/routes/mongoApi.ts`**: create/rebuild/clear-from-template (lines 717-816).
3. **`src/pages/admin/ProjectDetailPage.tsx`**: domain invariants duplicated from the server.
4. **`src/services/db.ts`** (1,522 lines): lines 21-206 are a dead Firestore emulation block; lines 402-1521 contain live domain helpers (caching, error/role logic) still actively called by UI components.

Multi-step transactional flows (e.g. rebuild-from-template: clear questions → clone template → expand branch questions → sync assignments) are implemented as inline route handler logic with no unit-test seam. Domain invariants duplicated between server routes and the React page cannot be verified once, requiring two places to update for any business rule change.

The existing `server/lib/` helpers (`cloneTemplateQuestionsToProject.ts`, `syncAssignmentsAfterQuestionDeletion.ts`, `expandProjectQuestionsByBranch.ts`, etc.) are already factored as callable functions — they just lack a service layer to orchestrate them from.

## Decision

Create `server/services/` with use-case-oriented services (not 1:1 model wrappers):

- `assignmentService.ts` — quick/merge assignment, sync-after-deletion
- `projectService.ts` — create/rebuild/clear from template, branch expansion
- `answerService.ts` — upsert, notes, review comments, audit logging
- `userService.ts` — platform user creation, role normalization

Route handlers become thin: **parse → validate (ADR-05) → authorize (ADR-03) → call service → serialize response**.

On the client side: keep `db.ts` domain helpers (lines 402-1521) as the data-access layer. Stop adding new Firestore-emulation call sites. Plan retirement of lines 21-206 (the dead emulation block) after ADR-02 reduces the component coupling.

## Rationale

- Separates transport from business logic — services are unit-testable without HTTP.
- Removes client/server duplication of domain invariants.
- Gives ADR-03 (authorization) and ADR-05 (validation) a clean composition point.
- Concentrates the multi-step transactional flows that are currently scattered.
- Enables the test plan's "unit tests for backend logic" to work without spinning up Express.

## Risks

- Risk of "moved spaghetti": services that just wrap models 1:1 add no value. Define services around use-cases and invariants, not around collections.
- The Firestore shim retirement (db.ts lines 21-206) is XL effort touching many call sites in `ProjectDetailPage.tsx`. Sequence it after ADR-02 reduces the component.
- Server services may duplicate effort with client-side helpers in db.ts during the transition period. Accept temporary duplication; retire client helpers incrementally.

## Migration Path

1. Create `server/services/assignmentService.ts`: move `quick-assignment` and `merge-assignments` logic out of `server.ts`. Route handler calls `assignmentService.createQuickAssignment(ctx, params)`.
2. Create `server/services/projectService.ts`: absorb create/rebuild/clear-from-template logic from `mongoApi.ts` helpers. Orchestrates existing `server/lib/clone*`, `server/lib/expand*` functions.
3. Create `server/services/answerService.ts`: absorb answers/upsert, notes, review-comments, and `recordAnswerUpsertAudit` calls.
4. Point route handlers (post ADR-01 extraction) at service calls. Each handler: validate → authorize → service → respond.
5. Incrementally rewrite client Firestore-emulation call sites to typed REST helpers; once none remain, delete `db.ts:21-206`.

## Effort

L (1–2 weeks for core services). XL (including full emulation shim retirement, sequenced after ADR-02).
