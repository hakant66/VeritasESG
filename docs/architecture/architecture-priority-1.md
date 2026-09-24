# GovernanceIQ Priority 1 — Architecture

**Status:** Proposed (for build) | **Date:** 2026-06-03 | **Horizon:** Q2–Q3 2026, 12 weeks
**Scope:** Framework Completeness Validator, Cross-Framework Consistency Checker, Climate Scenario Analysis

This document is the build blueprint for the three Priority 1 features. It is grounded in the existing
codebase conventions (see `CLAUDE.md`, [`architecture.md`](architecture.md), `server/routes/emissionsRoute.ts`,
`server/models/index.ts`) and is intended to be implemented by Backend, Frontend, and QA in parallel.

---

## 1. Overview

The three features form one **compliance engine** layered on top of existing reporting data. They do not
own primary ESG data; they read from existing sources (`EmissionEntry`, `MaterialityTopic`, `Answer`,
`MetricEntry`) and produce derived, versioned compliance artifacts (validation runs, conflict reports,
scenario models).

Two cross-cutting design ideas make the whole thing work and keep it extensible:

1. **Reference data vs. project data separation.** Framework requirements, equivalence mappings, and
   GFANZ pathways are *versioned reference data* (seeded, rarely changing). Validation runs, conflicts,
   and scenarios are *project/customer data* (created constantly, must be auditable). The two have
   different lifecycles, storage strategies, and caching.

2. **A single `ComplianceEngine` orchestrator** that all three features call into. Validation,
   consistency, and scenario alignment all need the same primitives: "resolve the data points for a
   customer+year", "map a data point to a framework requirement", "diff against an expected value".
   Centralizing these primitives is what allows the E1 template to extend to S1/G1/E2–E5 by adding
   *data*, not code.

```
┌─────────────────────────────────────── Browser (React 19 SPA) ───────────────────────────────────────┐
│                                                                                                        │
│  ComplianceDashboard   ConsistencyDashboard   ScenarioBuilder/RoadmapDashboard                         │
│        │                      │                          │                                             │
│        └──────────────┬───────┴──────────────┬───────────┘                                             │
│                       ▼                       ▼                                                         │
│            useComplianceApi()        useClimateApi()        (thin hooks over apiClient, JWT header)     │
└───────────────────────┬────────────────────────────────────────────────────────────────────────────┘
                        │  /api/compliance/*   /api/climate/*
                        ▼
┌──────────────────────────────── Node.js / Express (route modules) ────────────────────────────────────┐
│                                                                                                          │
│  registerComplianceRoutes(app)            registerClimateRoutes(app)         registerHooks(app)          │
│   ├ framework-requirements (ref)           ├ scenarios                        on project/answer/emission  │
│   ├ validate-completeness                  ├ financial-impact                 save → enqueue revalidation │
│   ├ framework-mappings (ref)               ├ sbt-alignment                                                │
│   ├ check-consistency                      └ roadmap                                                      │
│   └ reconciliations                                                                                       │
│                                                                                                          │
│        └──────────────────────────── server/services/ (business logic) ──────────────────────────┐      │
│        ComplianceEngine   CompletenessService   ConsistencyService   ScenarioService   SbtService  │      │
│             └──────────── shared primitives: DataPointResolver, FrameworkRegistry ─────────────────┘      │
└───────────────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                                │ Mongoose
                                                ▼
┌─────────────────────────────────────────── MongoDB (governance) ──────────────────────────────────────┐
│  REFERENCE (seeded, versioned)            PROJECT/CUSTOMER (created, audited)                            │
│  FrameworkRequirement                     ComplianceRun                                                  │
│  FrameworkMapping                         ConsistencyConflict + Reconciliation                           │
│  ClimatePathway                           ClimateScenario / TransitionLever(instance) / FinancialImpact  │
│  TransitionLeverTemplate                  ComplianceAuditEvent (append-only)                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack & Patterns

The platform stack is fixed (React 19 / Express / MongoDB / Mongoose). These are the *new* technical
decisions for this work, each with the alternative considered.

| Decision | Choice | Why | Rejected alternative |
|---|---|---|---|
| Route style | Feature route module `registerComplianceRoutes(app, { jwtSecret })` | Matches `emissionsRoute.ts` / `materialityRoute.ts` exactly; no new pattern for the team to learn | Generic `/api/db/*` CRUD — these features are computed, not CRUD, and need a service layer |
| Business logic location | New `server/services/` layer (ADR-P1-02) | Makes validation/scenario math unit-testable without HTTP; required for the `<2s` perf target and QA parallelization | Logic in route closures (current emissions style) — untestable, blocks QA |
| Reference data storage | Seeded MongoDB collections + in-process cache (ADR-P1-01) | Frameworks rarely change; cache gives `<2s`. Stored in DB (not code) so consultants can patch a requirement without a deploy | Hardcoded TS files — fast but needs a rebuild to fix a requirement; JSON files — no query/version story |
| Validation triggering | Async post-save hook → debounced recompute, results persisted (ADR-P1-03) | Save stays fast; dashboards read precomputed `ComplianceRun`; meets `<2s` *perceived* | Synchronous validation on every save — couples write latency to validation cost; breaks at 100+ projects |
| Audit trail | Append-only `ComplianceAuditEvent` collection (ADR-P1-04) | Regulatory immutability; reconciliation history; never mutate a prior run | Mongoose `updatedAt` only — not immutable, loses history |
| Request validation | `zod` at route boundary (consistent with ADR-05) | Adds zod (already proposed platform-wide); blocks over-posting into computed models | Mongoose validation only — too late, allows bad input into the engine |
| Scenario math | Pure deterministic functions in `server/services/climate/math/`, no external calls | Auditable (±10% requirement), unit-testable, reproducible | LLM/Gemini estimation — non-deterministic, fails auditability |
| Frontend data hooks | Thin `useComplianceApi` / `useClimateApi` over existing `apiClient` | Reuses JWT header injection; no Firestore shim (`db.ts`) for new features | Extending `services/db.ts` shim — that layer is being retired (I-10) |

**Convention compliance:** all new schemas use `createAppSchema` (gets `legacyFirebaseId`,
`createdBy`, `ownerId`, timestamps, virtual `id`). All responses use the existing envelope
`{ success: true, data }` / `{ success: false, error, code }`. All routes `requireAuth` via JWT.
Reference seeds live in `server/lib/*Seed.ts` (mirrors `emissionFactorSeed.ts`).

---

## 3. Project Structure

```
server/
├── routes/
│   ├── complianceRoute.ts          # Features 1 & 2 endpoints (thin; delegates to services)
│   └── climateRoute.ts             # Feature 3 endpoints
├── services/                       # NEW — business logic, no Express/HTTP imports
│   ├── compliance/
│   │   ├── ComplianceEngine.ts     # orchestrator; resolve → validate → consistency
│   │   ├── CompletenessService.ts  # Feature 1: gap detection, % completion
│   │   ├── ConsistencyService.ts   # Feature 2: variance/conflict detection
│   │   ├── DataPointResolver.ts    # shared: customer+year → canonical data points
│   │   └── FrameworkRegistry.ts    # shared: cached reference-data access
│   ├── climate/
│   │   ├── ScenarioService.ts      # Feature 3: pathway + lever modeling
│   │   ├── FinancialImpactService.ts
│   │   ├── SbtService.ts           # SBT/SBTi alignment checks
│   │   └── math/                   # pure deterministic functions (heavily unit-tested)
│   │       ├── pathway.ts          # GFANZ trajectory interpolation
│   │       ├── leverImpact.ts      # transition lever abatement
│   │       └── financial.ts        # stranded assets, physical risk, opportunity NPV
│   └── audit/
│       └── ComplianceAuditService.ts  # append-only event writer (shared by all)
├── lib/
│   ├── frameworkRequirementSeed.ts # IFRS S1/S2, GRI, ESRS, TCFD disclosure catalogue
│   ├── frameworkMappingSeed.ts     # equivalence mappings (GRI 305-1 ↔ IFRS S2 ↔ ESRS E1-6)
│   ├── climatePathwaySeed.ts       # GFANZ 1.5/2/3°C pathways
│   └── transitionLeverSeed.ts      # 30+ lever templates
├── models/index.ts                 # NEW schemas appended here (single models file is the convention)
└── migrations/
    └── seedComplianceReferenceData.ts  # idempotent upsert of all reference seeds

src/
├── pages/admin/
│   ├── ComplianceDashboardPage.tsx     # Feature 1 + 2 landing (per project)
│   └── ClimateScenarioPage.tsx         # Feature 3
├── components/
│   ├── compliance/
│   │   ├── FrameworkCompletenessCard.tsx
│   │   ├── GapReport.tsx
│   │   ├── ComplianceAlertBanner.tsx       # embeds in ProjectDetailPage
│   │   ├── ConsistencyMatrix.tsx
│   │   └── ConflictResolutionModal.tsx
│   └── climate/
│       ├── ScenarioBuilder.tsx
│       ├── TransitionLeverSelector.tsx
│       ├── FinancialImpactDashboard.tsx
│       └── DecarbonizationRoadmap.tsx
├── lib/
│   ├── complianceApi.ts            # typed client over apiClient
│   ├── climateApi.ts
│   └── complianceTypes.ts          # shared TS types (mirror server interfaces)
└── hooks/
    ├── useComplianceApi.ts
    └── useClimateApi.ts
```

---

## 4. Components & Responsibilities

**FrameworkRegistry (shared).** Loads `FrameworkRequirement`, `FrameworkMapping`, `ClimatePathway`,
`TransitionLeverTemplate` from MongoDB once, caches in-process keyed by `(collection, version)`, exposes
typed lookups. Cache invalidated on reference-data write (admin-only). This is the single read path for
all reference data and the main lever for the `<2s` target.

**DataPointResolver (shared).** Given `(customerId, year)`, produces a normalized map of *canonical data
points* (e.g. `scope1_emissions_tco2e`, `scope2_market_tco2e`, `material_topics`, answer values keyed by
question code). Reads from `EmissionEntry`, `MetricEntry`, `MaterialityTopic`, `Answer`. This is the
abstraction that decouples the compliance engine from raw storage and is reused by all three features.

**CompletenessService (Feature 1).** For each claimed framework, walks its `FrameworkRequirement`
entries, checks satisfaction against resolved data points, computes `% complete`, emits gaps with
`recommendation` text and a `suggestedQuestionCodes[]` for auto-population. Writes a `ComplianceRun`.

**ConsistencyService (Feature 2).** Walks `FrameworkMapping` equivalence groups, pulls each member's
value via DataPointResolver, computes variance, flags `> 5%` (configurable) as a `ConsistencyConflict`
with a `probableCauses[]` classification (scope difference / methodology / data quality / unit). Supports
the reconciliation workflow (resolve, annotate, accept-with-justification), all logged.

**ScenarioService + math (Feature 3).** Builds a `ClimateScenario` from a chosen `ClimatePathway` and
selected `TransitionLever` instances; the pure `math/` functions compute the abated trajectory.
FinancialImpactService computes stranded-asset exposure, physical-risk cost, and opportunity value.
SbtService checks the modeled trajectory against SBTi 1.5°C criteria. Produces `DecarbonizationRoadmap`
milestones.

**ComplianceEngine (orchestrator).** Public entry points used by routes and by save hooks:
`runCompleteness(customerId, year, frameworks)`, `runConsistency(...)`, `runAll(...)`. Wraps every run in
a `ComplianceAuditEvent`. This is the only object the route layer talks to for Features 1 & 2.

**Save hooks (integration).** A lightweight post-write hook on emissions/answers/materiality enqueues a
debounced `runAll` for the affected `(customerId, year)`. Results persist; UIs read the latest
`ComplianceRun`. No user-facing latency.

---

## 5. Data Models

All schemas created via `createAppSchema` (so they inherit `createdBy`, `ownerId`, `legacyFirebaseId`,
timestamps, virtual `id`). Keyed primarily on `(customerId, year)` to match the existing emissions/DMA
data model; `projectId` is carried where a run is project-scoped.

### Reference data (seeded, versioned)

```
FrameworkRequirement
  framework        'IFRS_S1'|'IFRS_S2'|'GRI'|'ESRS'|'TCFD'   (enum)
  requirementCode  string   e.g. 'ESRS_E1-6', 'GRI_305-1', 'IFRS_S2_29a'
  topicId          string?  link to ESRS topic ('E1'..'G1') or GRI series — enables E1→S1/G1 extension
  title            { en, tr }
  description      { en, tr }
  category         'E'|'S'|'G'|'governance'|'strategy'|'risk'|'metrics'  (cross-framework pillar)
  dataPointKeys    [string]  canonical keys that satisfy this requirement (resolved by DataPointResolver)
  satisfactionRule 'any'|'all'|'expression'   how dataPointKeys combine
  ruleExpression   string?   optional safe expression for complex rules
  mandatory        boolean
  recommendation   { en, tr }   shown in gap report when unmet
  suggestedQuestionCodes [string]  for auto-population
  version          string   reference-data version (e.g. 'ESRS-2024.1')
  isActive         boolean
  index: { framework:1, version:1, isActive:1 }, { framework:1, requirementCode:1, version:1 } unique

FrameworkMapping  (equivalence group across frameworks)
  mappingCode      string   e.g. 'SCOPE_1_EMISSIONS'
  pillar           'E'|'S'|'G'
  members          [{ framework, requirementCode, dataPointKey, unit, normalizationFactor? }]
  varianceThresholdPct number  default 5
  notes            { en, tr }
  version          string
  isActive         boolean
  index: { mappingCode:1, version:1 } unique, { 'members.dataPointKey':1 }

ClimatePathway  (GFANZ)
  pathwayCode      '1.5C'|'2C'|'3C_PLUS'   (enum)
  name             { en, tr }
  source           string   'GFANZ', 'NGFS', 'IEA NZE'
  baseYear         number
  targetYear       number
  trajectory       [{ year, reductionPctVsBase }]   global benchmark curve
  sbtAligned       boolean
  version          string
  index: { pathwayCode:1, version:1 } unique

TransitionLeverTemplate  (catalogue of 30+ levers)
  leverCode        string   'RENEWABLE_PPA', 'FLEET_EV', 'PROCESS_EFFICIENCY'...
  name             { en, tr }
  category         'energy'|'transport'|'process'|'supply_chain'|'offsets'
  appliesToScopes  [ 'SCOPE_1'|'SCOPE_2'|'SCOPE_3' ]
  abatementModel   { type:'pct'|'absolute'|'curve', params }
  capexPerTonne    number?    indicative
  opexDeltaPerYear number?
  maxAbatementPct  number
  version          string
```

### Project / customer data (created, audited)

```
ComplianceRun  (one latest per customer+year+framework-set; history kept via audit events)
  customerId, year, projectId?
  trigger          'manual'|'save_hook'|'scheduled'
  frameworks       [ enum ]
  completeness     [{ framework, requiredCount, satisfiedCount, completionPct,
                      gaps:[{ requirementCode, title, recommendation, suggestedQuestionCodes }] }]
  status           'PASS'|'GAPS'|'ERROR'
  computedAt       Date
  durationMs       number      (perf telemetry vs <2s SLO)
  refDataVersion   string
  index: { customerId:1, year:1, computedAt:-1 }, { projectId:1, computedAt:-1 }

ConsistencyConflict
  customerId, year, projectId?
  mappingCode
  members          [{ framework, requirementCode, dataPointKey, value, normalizedValue, unit }]
  variancePct      number
  thresholdPct     number
  probableCauses   [ 'scope_difference'|'methodology'|'data_quality'|'unit_mismatch'|'timing' ]
  status           'OPEN'|'RECONCILED'|'ACCEPTED'|'DISMISSED'
  computedAt       Date
  index: { customerId:1, year:1, status:1 }, { mappingCode:1 }

Reconciliation  (workflow events on a conflict — also mirrored to audit log)
  conflictId       (FK)
  action           'annotate'|'resolve'|'accept'|'dismiss'|'reopen'
  justification    string
  authoritativeMember string?   which framework value is treated as correct
  actorId, actorName
  createdAt
  index: { conflictId:1, createdAt:1 }

ClimateScenario
  customerId, year, projectId?
  name
  pathwayCode      (FK to ClimatePathway)
  baseYearEmissions { scope1, scope2, scope3 }   (snapshot from emissions at creation — reproducibility)
  horizonYear
  selectedLevers   [{ leverCode, startYear, rampYears, intensityPct, overrides? }]
  modeledTrajectory [{ year, scope1, scope2, scope3, total, reductionPctVsBase }]   (computed, persisted)
  sbtResult        { aligned:boolean, requiredAnnualPct, modeledAnnualPct, gap }
  status           'DRAFT'|'FINALIZED'
  refDataVersion
  index: { customerId:1, year:1 }, { projectId:1 }

FinancialImpact  (1:1 with a scenario)
  scenarioId       (FK)
  strandedAssets   [{ assetClass, exposureValue, impairmentPct, year }]
  physicalRisk     [{ riskType:'acute'|'chronic', annualCost, year }]
  opportunities    [{ name, annualValue, year }]
  netNpv           number
  discountRatePct  number
  computedAt

ComplianceAuditEvent  (APPEND-ONLY — never updated/deleted)
  domain           'completeness'|'consistency'|'scenario'|'reconciliation'
  entityType, entityId
  customerId, year, projectId?
  action           string
  actorId, actorName
  snapshot         Mixed     (immutable copy of the result/decision at this moment)
  refDataVersion
  createdAt
  index: { customerId:1, year:1, createdAt:-1 }, { entityType:1, entityId:1, createdAt:1 }
```

### Relationships

```
Customer 1───* EmissionEntry / MaterialityTopic / Answer   (existing — read by DataPointResolver)
                       │
                       ▼ (resolve at customer+year)
ComplianceEngine ──writes──> ComplianceRun, ConsistencyConflict, ClimateScenario
ConsistencyConflict 1───* Reconciliation
ClimateScenario     1───1 FinancialImpact
FrameworkRequirement *───* FrameworkMapping (via requirementCode)   [reference]
ClimateScenario     *───1 ClimatePathway, *───* TransitionLeverTemplate   [reference]
(everything mutating) ──appends──> ComplianceAuditEvent
```

---

## 6. API Contracts

All under JWT auth. Envelope: `{ success, data }` / `{ success, error, code }`. Versions of reference
data are resolved server-side (latest active) unless `?version=` is passed.

### Compliance (Features 1 & 2) — `registerComplianceRoutes`

```
# Reference (read-mostly; admin writes gated to platform_admin/consultant_manager)
GET    /api/compliance/framework-requirements?framework=ESRS&version=
         → { frameworks:[...], requirements:[FrameworkRequirement] }
GET    /api/compliance/framework-mappings?pillar=E
         → { mappings:[FrameworkMapping] }

# Feature 1 — Completeness
POST   /api/compliance/validate-completeness
         body { customerId, year, projectId?, frameworks:[...] }
         → { run: ComplianceRun }                 # synchronous compute, <2s
GET    /api/compliance/runs/latest?customerId=&year=&projectId=
         → { run: ComplianceRun | null }          # reads precomputed (save-hook path)
GET    /api/compliance/runs?customerId=&year=&limit=
         → { runs:[ComplianceRun] }               # history

# Feature 2 — Consistency
POST   /api/compliance/check-consistency
         body { customerId, year, projectId? }
         → { conflicts:[ConsistencyConflict], checkedMappings:number }
GET    /api/compliance/conflicts?customerId=&year=&status=OPEN
         → { conflicts:[ConsistencyConflict] }
POST   /api/compliance/conflicts/:id/reconcile
         body { action, justification, authoritativeMember? }
         → { conflict: ConsistencyConflict, reconciliation: Reconciliation }
GET    /api/compliance/conflicts/:id/history
         → { reconciliations:[Reconciliation] }
GET    /api/compliance/conflicts/export?customerId=&year=&format=pdf|xlsx   # auditor report
```

### Climate (Feature 3) — `registerClimateRoutes`

```
GET    /api/climate/pathways                       → { pathways:[ClimatePathway] }
GET    /api/climate/transition-levers?scope=SCOPE_1 → { levers:[TransitionLeverTemplate] }

POST   /api/climate/scenarios
         body { customerId, year, name, pathwayCode, horizonYear, selectedLevers:[...] }
         → { scenario: ClimateScenario }           # snapshots base emissions, computes trajectory
GET    /api/climate/scenarios?customerId=&year=     → { scenarios:[ClimateScenario] }
GET    /api/climate/scenarios/:id                   → { scenario, financialImpact }
PATCH  /api/climate/scenarios/:id                   → recompute trajectory (DRAFT only)
POST   /api/climate/scenarios/:id/finalize          → status FINALIZED + audit event

POST   /api/climate/scenarios/:id/financial-impact
         body { discountRatePct, assumptions }      → { financialImpact: FinancialImpact }
GET    /api/climate/scenarios/:id/sbt-alignment     → { sbtResult }
GET    /api/climate/scenarios/:id/roadmap?format=json|pdf|xlsx → { milestones:[...] } | file
```

### External-system API

Reuse the existing API-key-gated `/api/v1/customer/*` surface (see `server.ts:1417`) by adding read-only
`/api/v1/customer/compliance/runs/latest` and `/api/v1/customer/climate/scenarios`. These return the same
precomputed artifacts, so external systems get audited, reproducible data without touching the engine.

---

## 7. Integration Patterns (how the features interact)

1. **Emissions → Consistency → Completeness.** `DataPointResolver` is the single junction. Emissions data
   feeds `scope1/2/3_emissions_tco2e` canonical keys. ConsistencyService compares those against the
   GRI/IFRS/ESRS members of the `SCOPE_1_EMISSIONS` mapping. CompletenessService marks the corresponding
   `FrameworkRequirement`s satisfied. One resolver call serves both → no duplicate reads, helps `<2s`.

2. **DMA → Completeness → Climate.** Approved `MaterialityTopic` set determines which frameworks/topics
   are *in scope*. If E1 is material, the E1 climate requirements become mandatory, and `ClimateScenario`
   creation is offered from the DMA page (`DMAPage` → `ClimateScenarioPage` deep link).

3. **Climate → Completeness.** A FINALIZED `ClimateScenario` with a valid SBT result satisfies the
   IFRS S2 / ESRS E1 "transition plan / targets" requirements. ScenarioService emits the canonical keys
   `has_transition_plan`, `sbt_aligned` that CompletenessService consumes.

4. **Save hook fan-out.** Writing emissions/answers/materiality enqueues `ComplianceEngine.runAll`. The
   `ComplianceAlertBanner` in `ProjectDetailPage` polls/reads the latest `ComplianceRun`, so any data
   change surfaces gaps and conflicts without a manual trigger.

5. **Audit everywhere.** Every engine run and every reconciliation/scenario decision appends a
   `ComplianceAuditEvent`. This is the shared compliance/regulatory backbone for all three features.

---

## 8. Non-Functional Requirements

**Performance (`<2s` validation).**
- Reference data served from `FrameworkRegistry` in-process cache (no per-request DB read of catalogue).
- `DataPointResolver` does at most one batched query per source collection per `(customerId, year)`,
  using existing compound indexes (`customerId:1, year:1, scope:1`).
- Save-hook path makes validation *precomputed*; dashboards read one `ComplianceRun` doc.
- New indexes listed per-model in §5. Target: completeness run p95 < 800ms, consistency < 600ms at
  100+ projects. Load test in Phase 4 (Task 13–15) against seeded 200-project dataset.

**Scalability (100+ projects).** Stateless services; reference cache is per-process and cheap. Runs are
keyed and indexed by `(customerId, year, computedAt)`; history is append-only and can be TTL-archived
later if needed. No N+1: resolver batches.

**Security.** All routes `requireAuth`; reference-data writes gated to `platform_admin` /
`consultant_manager`; row-level scoping by `customerId` (aligns with ADR-03 direction). zod validation at
boundaries blocks over-posting into computed models. No secrets in scenario math (deterministic, offline).

**Auditability / immutability.** `ComplianceAuditEvent` is append-only (no update/delete route; enforced
in service, not just convention). Each run/scenario stores `refDataVersion` and a `snapshot`, so a report
can always be reproduced exactly as generated, even after reference data updates.

**Observability.** Each run logs `durationMs`, `refDataVersion`, source counts. `[COMPLIANCE]` /
`[CLIMATE]` log prefixes (mirrors `[EMISSIONS]`). Expose `/api/health` unchanged; add per-feature run
counters for the post-deploy monitoring dashboard (Task 17).

**Error handling.** Engine never throws into the save path (fire-and-forget hook, mirrors
`autoCalculateEmissionForMetric`). Synchronous API calls return `{ success:false, code }`. Partial data
(e.g. missing Scope 3) produces gaps/warnings, never a crash.

---

## 9. Critical Design Decisions (trade-offs)

See ADRs in `docs/adr/` (ADR-P1-01 .. ADR-P1-04) for full context/consequences. Summary:

- **Reference data in DB + cache, not in code (ADR-P1-01).** Trade-off: slightly more infra (seed
  migration, cache invalidation) for the ability to patch a requirement without a deploy and to version
  frameworks for reproducibility. Chosen because regulatory catalogues change on their own schedule.
- **Service layer for this feature set (ADR-P1-02).** Trade-off: introduces a layer the current codebase
  doesn't have, slight upfront cost. Chosen because the math/validation must be unit-testable (QA
  parallelization, `<2s` confidence, ±10% auditability) — impossible inside route closures.
- **Async precompute + persisted runs (ADR-P1-03).** Trade-off: dashboards can show data seconds stale,
  and we store run history. Chosen because synchronous validation on every save does not scale to 100+
  projects and couples write latency to validation cost.
- **Append-only audit (ADR-P1-04).** Trade-off: storage growth and no in-place edit. Chosen because
  regulatory immutability and reconciliation history are hard requirements.
- **Canonical data-point abstraction (DataPointResolver + `dataPointKeys`).** Trade-off: an indirection
  layer between frameworks and storage. This is the single most important extensibility decision: adding
  S1/G1/E2–E5 (Priority 2) is *adding seed rows*, not writing new services. E1 is just the first
  framework topic populated.

---

## 10. Implementation Phasing (maps to the 18 tasks)

**Phase 1 — Research & Design (Weeks 1–2): Tasks 1, 4, 7**
- Finalize the *reference-data catalogues* as the design deliverable: requirement list per framework
  (Task 1), equivalence mapping table (Task 4), GFANZ pathways + 30+ levers (Task 7).
- Lock the canonical `dataPointKeys` vocabulary — this is the contract between all three features and the
  resolver. Backend cannot start without it.
- Spike the scenario math early (highest-risk per the task list).
- *Parallelizable:* Product owns all three catalogues; Backend writes the schema skeletons + seed file
  shells so Frontend can mock against them.

**Phase 2 — Backend (Weeks 3–6): Tasks 2, 5, 8, 9**
- Wk3: schemas in `models/index.ts`, `seedComplianceReferenceData.ts`, `FrameworkRegistry`,
  `DataPointResolver` (the shared core — unblocks everything).
- Wk3–4: `CompletenessService` + `complianceRoute` Feature-1 endpoints (Task 2).
- Wk4–5: `ConsistencyService` + reconciliation endpoints (Task 5).
- Wk5–6: `ScenarioService` + `math/` (Task 8), `FinancialImpactService` + `SbtService` (Task 9).
- *Parallelizable:* once resolver lands (wk3), Features 1/2/3 backends proceed independently.

**Phase 3 — Frontend (Weeks 5–8): Tasks 3, 6, 10, 11**
- Built against the typed `complianceApi`/`climateApi` clients; can start on mocks in wk5 (overlaps
  backend) since API contracts in §6 are frozen.
- Task 3: ComplianceDashboard, GapReport, AlertBanner. Task 6: ConsistencyMatrix, ConflictResolutionModal.
- Task 10: ScenarioBuilder + TransitionLeverSelector. Task 11: FinancialImpactDashboard + Roadmap.

**Phase 4 — Integration & Testing (Weeks 8–10): Tasks 12, 13, 14, 15**
- Task 12: wire save hooks, embed AlertBanner in `ProjectDetailPage`, deep links from `EmissionsPage` /
  `DMAPage`, pre-populate scenario base emissions.
- Tasks 13–15: QA runs against the service layer (unit) + API (integration) + UI; load test 200-project
  seed for the `<2s` SLO. Because logic is in services, QA can write unit tests in parallel from Wk6.

**Phase 5 — Docs & Deploy (Weeks 10–12): Tasks 16, 17, 18**
- Task 16 docs. Task 17 feature-flag gated rollout (10→50→100%); flags `FEATURE_COMPLIANCE_VALIDATOR`,
  `FEATURE_CONSISTENCY_CHECKER`, `FEATURE_CLIMATE_SCENARIO` so each feature ships independently. Task 18
  monitoring + Priority 2 handoff.

---

## 11. Risks & Architectural Mitigations

| Risk | Mitigation (architectural) |
|---|---|
| Scenario math complexity / accuracy (±10%) | Pure deterministic functions in `math/`, isolated and unit-tested from Wk1 spike; `refDataVersion` + base-emissions snapshot make every result reproducible for external validation |
| Framework mappings incomplete → false positives (<5% FP target) | Mappings are versioned *data*, patchable without deploy; per-mapping `varianceThresholdPct` and `probableCauses` reduce false flags; reconciliation workflow records overrides |
| Performance degradation at scale | Reference cache + batched resolver + precomputed runs + listed indexes; load test gate in Phase 4 against 200-project seed before deploy |
| Standards change mid-build | DB-stored, versioned reference data: ship a new `version` and re-seed; existing runs keep their `refDataVersion` |
| Regulatory audit challenge | Append-only `ComplianceAuditEvent` with immutable snapshots; conflict reconciliation history exportable for auditors |
| Team coupling / blocking | `dataPointKeys` contract + frozen API §6 + service layer let Backend/Frontend/QA proceed in parallel after Wk3; feature flags decouple release |
| Extending to Priority 2 (S1/G1) | New topics = new seed rows referencing existing `topicId`; no service changes — the E1 template *is* the S1/G1 template |

---

## 12. References
- Task list: [`PRIORITY_1_TASK_LIST.md`](../delivery/priority-1/PRIORITY_1_TASK_LIST.md)
- Workflow: [`COMPLETE_SYSTEM_WORKFLOW.md`](../guides/COMPLETE_SYSTEM_WORKFLOW.md), [`PLATFORM_WORKFLOW_GUIDE.md`](../guides/PLATFORM_WORKFLOW_GUIDE.md)
- Existing patterns: `server/routes/emissionsRoute.ts`, `server/routes/materialityRoute.ts`,
  `server/models/index.ts`, `server/lib/emissionFactorSeed.ts`
- Platform architecture review & ADRs: [`architecture.md`](architecture.md), [`adr/`](../adr/)
- ADRs for this work: [`adr/ADR-P1-01..04`](../adr/ADR-P1-01-reference-data-storage.md)
