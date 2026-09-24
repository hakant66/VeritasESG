# ADR-P1-03: Async precompute of validation via save hooks; persist runs

**Status:** Proposed
**Date:** 2026-06-03
**Severity:** High | **Effort:** M
**Relates to:** Priority 1 — Features 1 & 2; "Save project → auto-validate", `<2s`, 100+ projects

## Context

The requirement is "save project → auto-validate" with `<2s` validation, at 100+ projects. There are two
ways to honor "auto-validate on save":

1. **Synchronous:** run completeness + consistency inline on every emissions/answer/materiality write,
   block the response until done.
2. **Asynchronous precompute:** the write returns immediately; a hook enqueues a (debounced) engine run;
   the result is persisted as a `ComplianceRun`; dashboards read the latest run.

Synchronous coupling makes every data write pay the validation cost, multiplies under bulk imports (the
emissions module does bulk metric entry), and risks exceeding `<2s` as frameworks/mappings grow.

## Decision

Use asynchronous precompute. A lightweight post-write hook on emissions/answers/materiality enqueues
`ComplianceEngine.runAll(customerId, year)`, debounced per `(customerId, year)` to collapse bursts (e.g.
bulk import). Results are persisted to `ComplianceRun` / `ConsistencyConflict`. The hook is
fire-and-forget and never throws into the write path (mirrors `autoCalculateEmissionForMetric` in
`emissionsRoute.ts`).

Dashboards read the precomputed latest run (`GET /runs/latest`). A synchronous
`POST /validate-completeness` endpoint remains for on-demand "validate now" and returns within `<2s`.

## Consequences

**Positive**
- Writes stay fast; bulk import unaffected; validation cost decoupled from write latency.
- Scales to 100+ projects: dashboards read one indexed doc, not a live recompute.
- Run history is captured naturally (each precompute persists a run).

**Negative / costs**
- Dashboards can be a few seconds stale relative to the very latest save.
- Storage growth from persisted runs; needs an eventual archival/TTL policy.
- Two code paths (sync endpoint + async hook) both calling the same engine.

**Mitigations**
- Show "validating…" state and last-computed timestamp in the AlertBanner; "validate now" button hits the
  sync endpoint for immediate feedback.
- Both paths call the identical `ComplianceEngine` method — no logic divergence.
- Plan run archival in Priority 2 (TTL or roll-up); audit events remain the permanent record.
