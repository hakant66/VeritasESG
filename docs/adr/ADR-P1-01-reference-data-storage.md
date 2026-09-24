# ADR-P1-01: Store framework reference data in MongoDB (seeded + versioned + cached)

**Status:** Proposed
**Date:** 2026-06-03
**Severity:** High | **Effort:** M
**Relates to:** Priority 1 — all three features

## Context

Features 1–3 depend on large, structured "reference data": the disclosure catalogue per framework
(IFRS S1/S2, GRI, ESRS, TCFD), cross-framework equivalence mappings, GFANZ climate pathways, and 30+
transition-lever templates. This data:

- changes on a regulator's schedule (ESRS/IFRS revisions), not ours;
- must be *versioned* so a report generated last quarter can be reproduced exactly;
- is read on nearly every validation, so read cost is on the `<2s` critical path;
- occasionally needs a hot fix (a wrong requirement) without blocking consultants.

Options: (a) hardcode in TypeScript files; (b) ship JSON files; (c) store in MongoDB collections.

## Decision

Store reference data in dedicated MongoDB collections (`FrameworkRequirement`, `FrameworkMapping`,
`ClimatePathway`, `TransitionLeverTemplate`), each carrying a `version` and `isActive` field. Populate via
an idempotent seed migration `server/migrations/seedComplianceReferenceData.ts` sourced from
`server/lib/*Seed.ts` (mirrors the existing `emissionFactorSeed.ts` pattern). Serve all reads through a
`FrameworkRegistry` service that caches the active version in-process and invalidates on admin write.

Every computed artifact (`ComplianceRun`, `ClimateScenario`, etc.) stores the `refDataVersion` it used.

## Consequences

**Positive**
- Reproducibility: `refDataVersion` + snapshots let any past report be regenerated identically.
- Hot-patchable: fix a requirement by upserting a row; no rebuild/deploy.
- Performance: in-process cache removes the catalogue from the per-request DB path.
- Consistent with the platform's seed convention; queryable/versionable unlike JSON files.

**Negative / costs**
- More moving parts than hardcoding: a seed migration and a cache-invalidation path to maintain.
- Cache adds a (small) correctness surface: must invalidate on reference writes.
- Reference writes must be authorization-gated (platform_admin / consultant_manager).

**Mitigations**
- Seed is idempotent upsert keyed by `(code, version)`; safe to re-run.
- Cache keyed by `(collection, version)`; admin write bumps/invalidates; default reads use latest active.
