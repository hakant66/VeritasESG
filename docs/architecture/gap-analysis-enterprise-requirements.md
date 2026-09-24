# Gap Analysis: GovernanceIQ vs. Enterprise Sustainability Data Infrastructure Requirements

**Date:** 2026-05-31  
**Scope:** CSRD/ESRS · IFRS S1/S2 · EU Taxonomy  
**Method:** Business-domain analysis (functional/regulatory) + Technical architecture analysis (systems/data model), conducted against the current codebase without code changes.

---

## Executive Summary

GovernanceIQ today is a **consultancy engagement-management and structured survey-collection platform**. It is architecturally a questionnaire tool, not a regulatory data-infrastructure engine. The target requirements describe a fundamentally different system: a single-ingestion measurement platform with versioned emission-factor-driven calculations, a cross-framework semantic graph, an immutable lineage-bearing compliance ledger, and machine-readable iXBRL output.

**Five of the eight requirement domains are Critical gaps** requiring greenfield builds. Three domains have meaningful partial foundations. The existing survey/workflow/auth/CRM half of the platform is evolvable; the measurement → calculation → framework-mapping → ledger → digital-reporting half must be built from scratch on a different substrate.

### Summary Scorecard

| Domain | Gap Severity | Effort | Reusable Foundation |
|---|---|---|---|
| Single-Ingestion Multi-Output Pipeline | **Critical** | XL | Partial — survey flow skeleton |
| Immutable Audit Trail & Lineage | **High** | L | Partial — AuditLog, AnswerVersion |
| Dynamic Framework Cross-Mapping Engine | **Critical** | XL | Minimal — flat tags only |
| CSRD / ESRS (DMA + topic schema) | **High** | L–XL | Moderate — materiality scores, DMA axes |
| IFRS S1 & S2 (GHG + risk + scenarios) | **Critical** | XL | Minimal — static field stubs |
| EU Taxonomy (3-tier engine + GL) | **Critical** | XL | Minimal — NACE code only |
| System Components (ingestion/rules/ledger) | **High** | XL | Partial — presentation layer, auditor role |
| Digital Output (iXBRL / XBRL) | **Critical** | L–XL | None |

---

## 1. Current Platform Capabilities

GovernanceIQ today does five things well:

1. **Client and engagement management.** Maintains a directory of customer organisations (`Customer`, `Branch`, `Contact`) and runs reporting projects (`Project`) against them from reusable templates (`Template` → `TemplatePage` → `Question`). Routes: `CustomersPage`, `ProjectsPage`, `ProjectDetailPage`, `CustomerSectorsPage`.

2. **Structured qualitative data collection.** Collects free-text, integer, and decimal answers to template-derived questions grouped by page/domain. Branch-based question multiplication (`soruCogaltma: 'sube_bazinda'`) fans one template question out to N branches.

3. **Assignment and task workflow.** Assigns questions to internal users or external contacts via magic-link tokens (`Assignment`, `onBehalfResponse.ts`), with deadlines, email notifications, and a cross-project Tasks view.

4. **Lightweight review and audit.** Answer versioning (`AnswerVersion`), per-question comments (`CommentMessage`), submission-actor tracking, a project activity log, and a global `AuditLog`. Page-level narrative drafting with `pending → drafted → approved` status.

5. **AI knowledge support.** Gemini-powered knowledge-base chat (`KnowledgeChatPage`) and AI-assisted report drafting for consultants.

**Important proto-ESG data already modelled** (but manually entered, not calculated): `esgSummary` on `Customer` holds `scope1/2/3EmissionsTco2e`, `electricityMwh`, `naturalGasMwh`, water, waste, diversity ratios. `materialityAssessment.scores` models two DMA axes (financialImpact, impactSeverity, probability, stakeholderConcern). NACE/SASB codes, CSRD scope thresholds, and `reportingFrameworkKeys` exist as flat fields. These are the most relevant reusable foundations.

---

## 2. Capability Gaps by Domain

### 2.1 Single-Ingestion, Multi-Output Data Pipeline — Critical

**Requirement:** Raw metrics (utility bills, fuel receipts, HR diversity metrics, GL CapEx/OpEx) collected once and automatically distributed to ESRS, IFRS S1/S2, and EU Taxonomy mathematical models.

| | State |
|---|---|
| **Exists today** | One collection point: template questions → answers. `esgSummary` holds raw-ish metric numbers. Branch fan-out (`soruCogaltma`) is a primitive "one input, many instances" pattern. |
| **Missing** | Any concept of a raw metric entity captured once and routed to multiple framework outputs. Answers are 1:1 with a single question on a single project. No metric-level data model, no automated multi-framework distribution. All `esgSummary` values are typed in by hand, never derived from a calculation pipeline. |
| **Severity** | **Critical** — this is the central architectural premise of the target; it is entirely absent. |
| **Effort** | **XL** |

### 2.2 Immutable Audit Trail and Value Lineage — High

**Requirement:** Every disclosure value must have a deterministic, bi-directional lineage trace back to its raw source, explicitly tracking the version of the AI calculation engine or emission-factor library applied.

| | State |
|---|---|
| **Exists today** | Strong *activity* auditing: `AnswerVersion` change history, `AuditLog`, `submissionActors`/`onBehalfOfUserId`, `workflowStatusLog`, `reviewComments`. Records who changed an answer and when. |
| **Missing** | Bi-directional *data lineage* (output value → raw source input → factor-library version). Immutable/WORM store — all Mongo records are mutable via `PATCH`/`PUT` on `/api/db/:resource`. No "signed-off snapshot" concept. `AnswerVersion` is append-style history but freely deletable through the generic API. |
| **Severity** | **High** — solid audit *activity* foundations exist, but they record user actions, not value derivation/lineage, and the storage layer is not tamper-evident. |
| **Effort** | **L** |

### 2.3 Dynamic Framework Cross-Mapping Engine — Critical

**Requirement:** A metadata-driven graph resolving overlapping data fields between CSRD/ESRS, IFRS S1/S2, and EU Taxonomy (e.g., GHG accounting across ESRS E1, IFRS S2, EU Taxonomy DNSH).

| | State |
|---|---|
| **Exists today** | Flat tagging: `Domain` model with category enum `esg\|sasb_issb\|gri\|other`, `domainIds: string[]` on questions, `reportingFrameworkKeys` on customers, free-text `thematicGroup` and `raporYeri` on questions. |
| **Missing** | A metadata-driven graph resolving semantic overlaps. Tags are unstructured strings, not a relationship model. No engine knows that ESRS E1 GHG ≈ IFRS S2 metric ≈ Taxonomy DNSH input. Storage is MongoDB document store — no graph engine, no structured framework ontology. |
| **Severity** | **Critical** — no cross-framework semantic layer exists at all. |
| **Effort** | **XL** |

### 2.4 CSRD / ESRS — High

**Requirement:** Interactive DMA workflow; DMA-driven conditional data collection schema limited to material ESRS topics (E1–E5, S1–S4, G1); multi-user approval workflow with quantitative targets and version control.

| | State |
|---|---|
| **Exists today** | Richest partial coverage. `materialityAssessment.scores` already stores `financialImpact`, `impactSeverity`, `probability`, `stakeholderConcern` per topic — a genuine seed of Double Materiality (models/index.ts:257–265). CSRD scope thresholds (`csrdScopeEmployeeCount/Turnover/Assets`, `isPublicInterestEntity`) exist. Questions support mandatory flags, qualitative text + numeric answers, page-level `pending/drafted/approved` workflow, multi-user assignment and version control. |
| **Missing** | An interactive DMA workflow engine (impact vs. financial scoring with thresholds, justification text, outputs driving schema). No conditional schema generation — material topics do not drive which fields appear; templates are static. No ESRS topic taxonomy (E1–E5, S1–S4, G1) as first-class structured objects. Approval workflow is page-level draft status, not a topic-level multi-stage sign-off with quantitative targets. |
| **Severity** | **High** — strongest existing foundation, but DMA-driven dynamic schema is the core missing mechanic. |
| **Effort** | **L–XL** |

### 2.5 IFRS S1 & S2 — Critical

**Requirement:** GHG-Protocol Scope 1/2/3 emissions accounting with versioned emission-factor libraries; climate-risk objects linked to financial statements; quantitative scenario analysis (1.5°C vs. 3°C pathways).

| | State |
|---|---|
| **Exists today** | Static emission *values* stored on Customer (`scope1/2/3EmissionsTco2e`, `electricityMwh`, `naturalGasMwh`, `fuelMwh`, `renewableEnergyPercent`). `climateRiskInRegister` and `businessResilienceAssessment` as free-text notes. Basic financial fields (EBITDA, equity, CapEx forecast). |
| **Missing** | GHG-Protocol emissions accounting (activity data × emission factor → Scope 1/2/3 — values are entered, not computed). No emission-factor library (DEFRA/Ecoinvent) with date-scoping or versioning. No climate-risk data model linked to financial statements. No scenario analysis (1.5°C vs. 3°C) or asset-revaluation tooling. |
| **Severity** | **Critical** — only static placeholders exist; the entire calculation and risk-modelling machinery is absent. |
| **Effort** | **XL** |

### 2.6 EU Taxonomy — Critical

**Requirement:** Three-tiered calculation module (Eligibility → Substantial Contribution → DNSH); GL integration to auto-calculate Turnover/CapEx/OpEx alignment percentages; Minimum Safeguards checklist.

| | State |
|---|---|
| **Exists today** | `naceCode`/`naceDescription` (relevant to activity eligibility); flat financial figures (`annualTurnoverMeur`, `totalAssetsMeur`, `sustainabilityCapexForecastMeur`) as manually entered numbers. |
| **Missing** | The three-tier engine (Eligibility → SC → DNSH). No GL integration. No EU Taxonomy activity catalogue or technical screening criteria. No Minimum Safeguards checklist (human rights, anti-corruption). No automated Turnover/CapEx/OpEx alignment percentage calculation. |
| **Severity** | **Critical** — effectively greenfield apart from a NACE code field. |
| **Effort** | **XL** |

### 2.7 System Components — High

**Requirement:** Ingestion tier (REST APIs, webhooks, async CSV/XLSX processors, ERP/GL connectors); processing/rules engine (graph-DB schema-mapping layer, calculations worker); compliance ledger (WORM + cryptographic signing); presentation layer (auditor drill-down portal, XBRL/JSON gateway).

| | State |
|---|---|
| **Exists today** | **Presentation tier** is the most mature: React SPA, role-based dashboards, an auditor role and `auditorGuard`, API-key-gated customer data API (`/api/v1/customer/*`), synchronous XLSX import/export. |
| **Missing** | **Ingestion tier:** no webhooks, no async file processors at scale (XLSX is synchronous browser-side), no ERP/GL connectors (SAP/Oracle/Workday). **Rules engine:** no calculation worker service, no graph-DB schema-mapping layer, no queue tier (no BullMQ/Redis in package.json). **Compliance ledger:** no WORM/immutable snapshot store, no cryptographic signing. **Multi-tenancy:** no row-level auth enforcement on `/api/db/*` (Critical — architecture.md I-1/I-2). Auditor role exists but the drill-down portal (disclosure → source lineage) does not. |
| **Severity** | **High** — presentation layer is genuinely reusable; ingestion, rules engine, and ledger are absent. |
| **Effort** | **XL** |

### 2.8 Digital Output (iXBRL / XBRL) — Critical

**Requirement:** Tag, format, and export all reports as machine-readable inline XBRL (iXBRL) adhering to EFRAG (ESRS) and IFRS Foundation digital taxonomies.

| | State |
|---|---|
| **Exists today** | PDF/Markdown export of narrative drafts (`exportMarkdownPreviewPdf`, `exportSubmissionsZip`), XLSX export via `xlsx` package. |
| **Missing** | iXBRL/XBRL tagging and export against EFRAG/IFRS Foundation digital taxonomies. No concept of taxonomy-tagged data points. No machine-readable digital-reporting gateway. |
| **Severity** | **Critical** — zero digital regulatory-filing output capability. |
| **Effort** | **L–XL** |

---

## 3. Technical Architecture Gaps

### 3.1 Current Architecture

- **Single-process Node.js monolith.** All ~25 routes in one `startServer()` closure in `server.ts` (1,620 lines). Express serves the React SPA, API, migrations, and email from one process.
- **Generic CRUD-over-Mongoose API.** `mongoApi.ts` exposes `/api/db/:resource` over 22 Mongoose models with flat field-whitelist filtering. No join, graph, or calculation layer.
- **MongoDB document store only.** 24 Mongoose schemas (`server/models/index.ts`). No relational DB, no graph DB, no OLAP store, no separate immutable store.
- **No row-level tenant enforcement.** `GET /api/db/*` handlers read no `Authorization` header (architecture.md I-2). Writes stamp `createdBy` only — no role/customerId enforcement (I-1).
- **No async/queue/worker tier.** No Redis, BullMQ, or worker process in `package.json`. Bulk import is offline CLI scripts only.
- **Mutable audit log.** `AuditLog` and `AnswerVersion` are ordinary writable Mongoose collections — no WORM, no hash chaining, no signing.
- **ESG data is a flat blob.** Sustainability figures live as untyped numbers inside `esgSummary` on Customer (`models/index.ts:268-296`) — captured, never computed, with no lineage.
- **Export is XLSX/PDF only.** No XBRL/iXBRL, no structured machine-readable disclosure output.

### 3.2 Data Model Gaps

The model in `server/models/index.ts` is missing the entire measurement / calculation / lineage spine.

**Missing entities:**

| Entity | Purpose | Current substitute |
|---|---|---|
| `OperationalMetric` | Canonical metric definition (e.g. `MWh_Electricity_Consumed`) with unit, datatype | Ad-hoc fields inside `esgSummary` |
| `MetricObservation` / `RawDataPoint` | Immutable raw measured value with timestamp, source, tenant | None — raw and derived data conflated in `esgSummary` |
| `EmissionFactor` + `EmissionFactorLibrary` | Versioned, time-scoped factor sets (DEFRA/Ecoinvent) | None |
| `Calculation` / `CalculationSnapshot` | Computed result linking inputs + factor version + formula version | None |
| `FrameworkNode` / `DisclosureRequirement` | Structured ESRS/IFRS/Taxonomy disclosure nodes | `domainIds: string[]` + 4-value enum + free-text `raporYeri` |
| `MetricFrameworkMapping` | Graph edge: one metric → many framework outputs | Inexpressible — flat `domainIds` array |
| `TaxonomyActivity` | EU Taxonomy activity codes, SC/DNSH criteria | None |
| `ComplianceSnapshot` | Signed, WORM disclosure snapshot | None |
| `Tenant` (first-class) | Tenant-level keys, encryption config, framework config root | `Customer` doubles as tenant with no dedicated config root |

**Missing relationships:**

- Bi-directional lineage edges: `Calculation → RawDataPoint`, `Calculation → EmissionFactor.version`, `DisclosureValue → Calculation`.
- Metric → multi-framework graph edges (relational joins explicitly insufficient by requirement; neither the edges nor a graph engine exist).

**Missing immutability patterns:**

- All schemas use `timestamps: true` with mutable updates (`createAppSchema`, `models/index.ts:10-31`). No append-only/WORM, no hash chaining, no tamper-protection beyond `passwordHash`.
- `AnswerVersion` is the only history-style table and is freely mutable/deletable through the generic API.

### 3.3 Infrastructure Gaps

| Area | Current | Required | Gap |
|---|---|---|---|
| Compute topology | Single Node process, all routes in `server.ts` | Service boundaries (ingestion / calc worker / API / ledger) | Fully coupled; no decomposition |
| Async/queue | None | BullMQ + Redis Streams or cloud queue | No worker tier; migrations are fire-and-forget |
| Graph database | MongoDB only | Neo4j or Postgres AGE / pgRouting | No graph engine |
| Caching / session | None (stateless JWT) | Shared Redis cache for horizontal scale | No shared state layer |
| Datastore split | One mutable `governance` Mongo db | Immutable raw store + processed store + compliance ledger | Single mutable store for all tiers |
| Deployment | `docker-compose.yml` single app + Mongo + MinIO | Multi-region, horizontally scalable | Single-region, single-instance |
| Object storage | S3/MinIO for images only (`server/lib/s3Storage.ts`) | Bulk evidence + raw file ingestion at enterprise scale | Limited to profile images |

### 3.4 Security and Compliance Gaps

| Issue | Description | Severity |
|---|---|---|
| No row-level tenant enforcement | Reads on `/api/db/*` skip auth entirely; writes only stamp `createdBy` (architecture.md I-1/I-2) | **Critical** |
| No encryption at rest | No field-level encryption, no per-tenant keys, no KMS integration | **High** |
| No cryptographic signing | Audit records in `AuditLog` are fully mutable through the generic API; no hash chain | **High** |
| No request validation | Raw `req.body` flows to Mongoose; over-posting of internal fields is possible (I-3) | **High** |
| JWT in localStorage, no CSRF | XSS-exfiltratable session token; CSP not yet fully enabled (I-4) | **High** |
| WORM compliance ledger absent | A regulatory assurance requirement that the current mutable AuditLog cannot satisfy | **Critical** |

### 3.5 Migration Path Assessment

**Evolve (build on existing code):**

| Component | Path |
|---|---|
| Auth/identity (`requestAuth.ts`, JWT, `PlatformUser`) | Keep; add row-level enforcement (ADR-03) and HttpOnly cookies (ADR-04) |
| Tenant/customer/project/assignment CRM | Keep as the "data collection / questionnaire" bounded context |
| Generic Mongo API (`mongoApi.ts`) | Keep for survey/CRUD resources only after adding auth + validation; do not extend to calculation or ledger resources |
| Route extraction pattern (ADR-01) | Mechanical path to service boundaries via `registerXRoutes` |
| S3 storage, email (Brevo), Gemini drafting | Reusable as supporting services |
| `esgSummary` numeric fields | Migration source to backfill new `OperationalMetric`/`MetricObservation` records |
| `materialityAssessment.scores` | Foundation for the DMA workflow engine |
| Auditor role and `auditorGuard` | Foundation for the auditor drill-down portal |

**Greenfield (must be built new):**

| Component | Why greenfield |
|---|---|
| Calculations worker service + emission-factor libraries + queue tier | No foundation exists |
| Cross-framework metadata graph + graph DB | No graph engine; model is incompatible with relational pattern |
| Compliance ledger (WORM + signing + lineage) | Incompatible with mutable Mongoose; requires dedicated append-only store |
| Immutable raw data store | Separate datastore from processed results; Mongo mutable doc pattern wrong substrate |
| XBRL/iXBRL extraction gateway | No foundation |
| Webhook + ERP/GL connector layer | No foundation |
| Auditor drill-down portal (disclosure → source lineage) | Role exists; backend lineage and frontend drill-down do not |
| DMA workflow engine + conditional schema generator | DMA scoring exists as fields; workflow and conditional schema logic do not |
| IFRS S1/S2 risk modelling + scenario analysis | No foundation |
| EU Taxonomy three-tier engine + GL integration | No foundation |

---

## 4. New Domain Concepts Required

The following regulatory/domain concepts do not exist at all in the current platform:

| Concept | Notes |
|---|---|
| **Raw operational metric entity** (`MWh_Electricity_Consumed`) | Single source datum, framework-agnostic; the pivot of single-ingestion |
| **Emission Factor Library** (DEFRA, Ecoinvent) with date-scoping and versioning | None exists; emissions are hand-entered |
| **GHG calculation engine** (activity data × factor → Scope 1/2/3) | Replaces static `scope1/2/3EmissionsTco2e` values |
| **Framework cross-mapping graph** (ESRS ↔ IFRS ↔ Taxonomy data-point ontology) | Replaces flat `domainIds` string tags |
| **Double Materiality Assessment workflow** (impact + financial, thresholds, justification, conditional schema) | `materialityAssessment.scores` is a data seed, not a workflow |
| **ESRS topic taxonomy** (E1–E5, S1–S4, G1) as structured objects | Currently only free-text `thematicGroup` / `Domain` |
| **Climate risk objects** (physical/transition) linked to financial statements | Only free-text `climateRiskInRegister` today |
| **Scenario analysis engine** (1.5°C vs. 3°C → asset valuation impact) | Absent |
| **EU Taxonomy three-tier engine** + activity catalogue + technical screening criteria | Absent |
| **Minimum Safeguards checklist** (human rights, anti-corruption) | Absent |
| **GL / ERP connector** for Turnover/CapEx/OpEx auto-alignment | Manual XLSX and flat financial fields only |
| **Data lineage graph** (value → source, with engine/factor version stamps) | Audit logs track actions, not derivation |
| **Immutable compliance ledger / WORM snapshot** (signed-off disclosures) | Mongo records are mutable |
| **iXBRL/XBRL tagging + export gateway** (EFRAG / IFRS Foundation taxonomies) | Only PDF/Markdown/XLSX |
| **Ingestion tier** (REST/webhook intake, async file processors) | Manual entry / XLSX only |
| **Hard multi-tenant row-level isolation** | Logical separation only; flagged Critical in architecture.md I-1/I-2 |

---

## 5. Recommended Technology Stack Additions

| Gap | Recommended Addition | Rationale |
|---|---|---|
| Async job queue + worker tier | **BullMQ + Redis** | Decouple calculations/ingestion from request path; retries/DLQ; mature Node-native |
| Calculation pipeline | **Separate Node worker service** consuming BullMQ | Matches "calculations worker service (separate async process)" requirement |
| Cross-framework metadata graph | **Neo4j** (or **PostgreSQL + Apache AGE**) | Native graph for metric → multi-framework edges; AGE if single-Postgres footprint preferred |
| Immutable raw + processed split | **PostgreSQL** (append-only tables, `REVOKE UPDATE/DELETE`) or event store | Relational integrity + true immutability that Mongo mutable docs cannot guarantee |
| Compliance ledger + WORM + signing | **Hash-chained append-only table + Node `crypto` signing** (or AWS QLDB) | WORM + cryptographic snapshots for CSRD assurance |
| Tenant encryption at rest | **AWS KMS / HashiCorp Vault** + field-level encryption (per-tenant DEKs) | Enterprise multi-tenant encryption requirement |
| Row-level tenant isolation | **CASL** (or custom policy middleware) + Postgres RLS where relational | Enforce I-1/I-2 — prerequisite for any enterprise deployment |
| Request validation | **zod** (already proposed in ADR-05) | Schema validation at every route boundary; reuse for OpenAPI generation |
| Webhooks + ERP/GL connectors | **Svix** (webhook delivery) + **Airbyte / Singer taps** (SAP/Oracle/Workday) | Off-the-shelf connectors vs. building from scratch |
| Async bulk CSV/XLSX | Worker-side **fast-csv** / streaming **exceljs** behind BullMQ | Move XLSX off synchronous browser path (`services/excel.ts`) |
| Emission-factor libraries | **Versioned Postgres tables** + DEFRA/Ecoinvent dataset ingestion pipeline | Time-scoped, pinnable factor versions for reproducibility |
| iXBRL / XBRL gateway | **Arelle** (Python microservice) or **XBRL.js** mapped to EFRAG/IFRS taxonomies | Generate machine-readable iXBRL disclosure output |
| API gateway | **Kong / AWS API Gateway** in front of services | Rate limiting, key management, third-party integration surface |
| Auth hardening | HttpOnly cookies + CSRF (double-submit pattern) per ADR-04 | Remove localStorage XSS exposure (I-4) |
| Observability | **OpenTelemetry + pino** structured logging | Distributed tracing once decomposed into services |

---

## 6. Existing Strengths: Reusable Foundations

Despite the breadth of gaps, the following existing capabilities meaningfully de-risk the build:

1. **Engagement and workflow shell.** Customer → project → page → question → assignment → answer → review is a solid backbone for structured collection, including ESRS data-owner workflows.
2. **Magic-link external contact collection.** The token-gated, no-login contact response flow maps directly to distributed data-owner collection (e.g., a facility manager submitting a utility bill reading).
3. **Materiality scoring seed.** `materialityAssessment.scores` (financialImpact, impactSeverity, probability, stakeholderConcern) already models both DMA axes — a genuine head start for the DMA engine.
4. **Proto-ESG field coverage.** `esgSummary` (energy, emissions, water, waste, social ratios), NACE/SASB classification, CSRD scope thresholds, and `reportingFrameworkKeys` show the domain has been partially modelled and provide a migration source.
5. **Audit and versioning primitives.** `AnswerVersion`, `AuditLog`, `submissionActors`, `workflowStatusLog` are a credible base to extend toward value-level lineage.
6. **Auditor role and read-only mode.** Platform + project roles including `auditor` with `auditorGuard` align directly with the target's auditor inspection portal requirement.
7. **Multilingual template engine.** Bilingual fields (`baslik`, `soru`, `aciklama`, `ornekYanit`) and template→project cloning support localised, framework-specific disclosure schemas.
8. **Role/permission framework.** Six platform roles with project-level role override give a mature access-control substrate for the multi-tenant enterprise model.

---

## 7. Effort Summary

| # | Domain / Gap | Severity | Effort |
|---|---|---|---|
| 2.1 | Single-ingestion multi-output pipeline | **Critical** | **XL** |
| 2.2 | Immutable audit trail and value lineage | **High** | **L** |
| 2.3 | Dynamic framework cross-mapping engine | **Critical** | **XL** |
| 2.4 | CSRD/ESRS: DMA workflow + conditional schema + topic taxonomy | **High** | **L–XL** |
| 2.5 | IFRS S1/S2: GHG engine + factor library + risk linkage + scenario analysis | **Critical** | **XL** |
| 2.6 | EU Taxonomy: three-tier engine + GL integration + Minimum Safeguards | **Critical** | **XL** |
| 2.7 | System components: ingestion + rules worker + compliance ledger + multi-tenancy | **High** | **XL** |
| 2.8 | iXBRL / XBRL tagging and digital output gateway | **Critical** | **L–XL** |
| — | **Prerequisite: row-level auth enforcement** (I-1/I-2) | **Critical** | **S** |
| — | **Quick extension: DMA workflow on existing `materialityAssessment.scores`** | **High** | **M** |

---

## 8. Bottom Line

GovernanceIQ is a **survey-collection and engagement-workflow platform** with surprisingly mature ESG-adjacent data fields and audit primitives. The target requires three things the platform fundamentally lacks:

1. A **raw-metric data layer** that captures measurements once at source.
2. A **calculation and cross-framework mapping engine** that derives disclosure values from those metrics using versioned emission-factor libraries.
3. An **immutable, lineage-bearing, machine-readable (iXBRL) compliance ledger** that produces verifiable regulatory output.

The existing survey/workflow/auth/CRM half is evolvable and meaningfully de-risks the CSRD/ESRS data-collection and the auditor-portal portions. The ingestion pipeline, calculation worker, emission-factor library, EU Taxonomy engine, compliance ledger, cross-framework graph, and XBRL output layer represent essentially greenfield builds on a different technical substrate.

**The single highest-priority prerequisite** — regardless of build scope — is closing the Critical multi-tenancy auth gaps (architecture.md I-1/I-2) before any enterprise deployment.

---

*Cross-references: [architecture.md](architecture.md) — current architectural issues and ADRs | [tech-stack-architecture.md](tech-stack-architecture.md) — current technical stack | [test plan](../qa/test-plan.md) — test coverage plan*
