# ADR-P1-04: Append-only ComplianceAuditEvent for regulatory immutability

**Status:** Proposed
**Date:** 2026-06-03
**Severity:** High | **Effort:** S–M
**Relates to:** Priority 1 — all three features; "Audit trail (changes tracked)", regulatory compliance

## Context

Sustainability disclosures are subject to assurance/audit. Auditors must be able to see who changed what,
when, and on what basis — and a report must be reproducible exactly as it was issued. Mongoose
`updatedAt` and in-place document mutation lose history and are mutable, so they cannot serve as the
audit record. Feature 2's reconciliation workflow in particular requires a permanent decision trail
(which framework value was treated as authoritative, with justification).

## Decision

Introduce a single append-only collection `ComplianceAuditEvent`. Every mutating engine action
(completeness run, consistency check, conflict reconciliation, scenario create/finalize, financial-impact
compute) appends one event via `ComplianceAuditService`. Each event stores an immutable `snapshot` of the
result/decision plus `actorId/Name`, `refDataVersion`, and timestamp.

No update or delete route is exposed for this collection; immutability is enforced in the service (writes
only) rather than by convention alone. Computed artifacts additionally carry `refDataVersion` and (for
scenarios) a base-emissions snapshot so any report can be regenerated as originally produced.

## Consequences

**Positive**
- Regulatory immutability and a complete who/what/when/why trail for assurance.
- Reconciliation history is first-class and exportable for auditors (Feature 2 deliverable).
- Reproducibility: snapshot + `refDataVersion` regenerate a past report even after reference updates.

**Negative / costs**
- Storage growth proportional to activity (every run logs an event).
- Slight write overhead per engine action.

**Mitigations**
- Events are compact and indexed by `(customerId, year, createdAt)` and `(entityType, entityId)`.
- Plan periodic cold-storage archival in Priority 2; the collection stays the authoritative record.
- Append-only enforced centrally in `ComplianceAuditService` (single writer), reducing misuse risk.
