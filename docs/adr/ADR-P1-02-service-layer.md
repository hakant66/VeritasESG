# ADR-P1-02: Introduce a server/services layer for the compliance & climate engine

**Status:** Proposed
**Date:** 2026-06-03
**Severity:** High | **Effort:** M
**Relates to:** Priority 1 — all three features; aligns with platform ADR-07

## Context

The existing feature routes (`emissionsRoute.ts`, `materialityRoute.ts`) keep business logic inside
Express route closures. That is acceptable for CRUD-ish flows but unworkable here because Priority 1 is
computation-heavy:

- completeness gap detection, variance/conflict detection, GFANZ trajectory math, financial NPV, SBT
  alignment — all must be unit-testable to hit the ±10% auditability and `<2s` performance targets;
- QA must be able to test algorithms in isolation (Tasks 13–15) starting in Week 6, before the UI exists;
- the same primitives (resolve data points, look up reference data) are reused across all three features.

Logic embedded in route closures cannot be tested without spinning up HTTP and a DB, and cannot be shared
cleanly across routes.

## Decision

Create `server/services/` containing pure-ish service classes with **no Express/HTTP imports**:
`compliance/` (ComplianceEngine, CompletenessService, ConsistencyService, DataPointResolver,
FrameworkRegistry), `climate/` (ScenarioService, FinancialImpactService, SbtService, and a `math/`
folder of pure deterministic functions), and `audit/ComplianceAuditService`.

Route modules (`complianceRoute.ts`, `climateRoute.ts`) stay thin: auth, zod validation, call a service,
wrap the result in the standard envelope. The `math/` functions take plain inputs and return plain
outputs — no I/O — so they are trivially and exhaustively unit-tested.

## Consequences

**Positive**
- Algorithms unit-testable without HTTP/DB → QA parallelizes from Week 6; supports ±10% and `<2s` claims.
- Shared primitives (resolver, registry) prevent duplicate logic across the three features.
- Establishes the service-layer pattern the platform already wants (ADR-07), scoped to greenfield code.

**Negative / costs**
- Introduces a layer the current codebase lacks; small upfront structure cost and a convention to hold.
- Two places to look (route + service) for a given endpoint.

**Mitigations**
- Keep routes mechanically thin (a documented one-paragraph rule); services own all branching logic.
- Scope this ADR to the new Priority 1 code only; do not retrofit existing routes in this cycle.
