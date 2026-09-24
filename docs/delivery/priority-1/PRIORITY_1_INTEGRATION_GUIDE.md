# Priority 1 Integration Guide - Architecture → Execution

## Overview

This document bridges the **architectural design** (from software-architect) with the **18-task execution plan** (PRIORITY_1_TASK_LIST.md). It shows:

1. How the three features work together
2. Which tasks build which components
3. How teams can work in parallel
4. Critical decision points and sign-offs
5. Integration touch-points with existing systems

**Status:** Ready for team kickoff  
**Architect:** Software Architect Agent  
**Date:** June 3, 2026  
**Phase:** Weeks 1-12 (Q2-Q3 2026)

---

## 1. The Core Architecture: One Engine, Three Features

### The Mental Model

```
Priority 1 = Compliance Engine (does computed compliance work)
            ├─ Framework Completeness Validator (Feature 1)
            ├─ Cross-Framework Consistency Checker (Feature 2)
            └─ Climate Scenario Analysis (Feature 3)
            
Built on:
            ├─ Shared: DataPointResolver (reads EmissionEntry, Answer, MaterialityTopic)
            ├─ Shared: FrameworkRegistry (cached reference data)
            ├─ Shared: ComplianceAuditService (append-only audit trail)
            └─ Integrated with: ProjectDetailPage, EmissionsPage, DMAPage
```

### Why This Design?

**Problem:** Three features need to validate the same data from different angles
- Feature 1 needs answers to specific questions
- Feature 2 needs to compare Scope 1 emissions across frameworks
- Feature 3 needs emissions history to model scenarios

**Solution:** Single `DataPointResolver` that normalizes all data sources once, then all features read from it
- Saves reads (1 database call per customer/year, not 3)
- Keeps logic testable (service layer, no HTTP)
- Enables async precompute: save project → enqueue validate → return immediately
- Extensible: adding E2/S1/G1 is adding data rows, not code changes

**Impact on Tasks:**
- Task 1: Design the `dataPointKeys` vocabulary
- Task 2, 5, 8-9: Build services that read from resolver
- Task 3, 6, 10-11: Build UIs that query the services
- Task 12: Wire save hooks to enqueue revalidation

---

## 2. Design Decisions & Task Implications

### Decision 1: Feature Route Module (Not Generic CRUD)

**Design:** Each feature is a `registerXRoute(app, { jwtSecret })` module, not `/api/db/*`

**Why:** Features are computed, not CRUD. Need business logic layer.

**Tasks Affected:**
- Task 2: Build `server/routes/complianceRoute.ts` with thin route closures
- Task 5: Build `server/routes/complianceRoute.ts` (2nd feature endpoints)
- Task 8-9: Build `server/routes/climateRoute.ts`
- **Task 12:** Hook routes into express in `server.ts`

**Code Pattern** (mirrors `emissionsRoute.ts`, `materialityRoute.ts`):
```typescript
// server/routes/complianceRoute.ts
export function registerComplianceRoutes(app: Express, options: { jwtSecret: string }) {
  const requireAuth = (req, res, next) => { /* JWT validation */ };
  const withMongo = async (res, run) => { /* Connect, handle errors */ };
  
  app.post('/api/compliance/validate-completeness', requireAuth, (req, res) =>
    withMongo(res, async () => {
      const { customerId, year, frameworks } = req.body;
      const run = await complianceEngine.runCompleteness(customerId, year, frameworks);
      res.json({ success: true, data: run });
    })
  );
}
```

---

### Decision 2: Service Layer (Not Route Closures)

**Design:** Business logic lives in `server/services/`, no Express imports. Routes are thin.

**Why:** Enables:
- Unit testing without HTTP
- QA to test services from Week 6 (before routes done)
- Backend to refactor without breaking routes
- Reuse: `ComplianceEngine.runAll()` called both by routes AND save hooks

**Tasks Affected:**
- Task 1: Design service interfaces (What does CompletenessService expose?)
- Task 2: Build `server/services/compliance/CompletenessService.ts`
- Task 5: Build `server/services/compliance/ConsistencyService.ts`
- Task 8-9: Build `server/services/climate/{ScenarioService, FinancialImpactService, SbtService}.ts`
- **Task 13-15:** QA writes unit tests on services directly

**Service Interface** (example):
```typescript
// server/services/compliance/CompletenessService.ts
export class CompletenessService {
  async run(
    customerId: string,
    year: number,
    frameworks: Framework[],
    resolver: DataPointResolver,
    registry: FrameworkRegistry
  ): Promise<ComplianceRun> {
    const dataPoints = await resolver.resolve(customerId, year);
    const gaps: Gap[] = [];
    
    for (const framework of frameworks) {
      const requirements = registry.getRequirements(framework);
      for (const req of requirements) {
        const satisfied = dataPoints.has(req.dataPointKey);
        if (!satisfied) {
          gaps.push({
            requirement: req,
            recommendation: req.suggestedQuestion,
          });
        }
      }
    }
    
    return new ComplianceRun({
      customerId, year,
      framework: frameworks[0], // or aggregate
      completeness: (requirements.length - gaps.length) / requirements.length * 100,
      gaps,
      createdAt: new Date(),
      createdBy: /* from JWT */,
    });
  }
}
```

---

### Decision 3: Reference Data as Seeded Collections (Not Hardcoded)

**Design:** `FrameworkRequirement`, `FrameworkMapping`, `ClimatePathway`, `TransitionLeverTemplate` are MongoDB collections, seeded at deploy time.

**Why:**
- Consultants can patch a requirement without a rebuild (Admin UI or direct edit)
- Framework versions tracked (`refDataVersion` field)
- Extensible: Adding E2 module is `db.insertMany(e2Requirements)`, not code change
- Testable: Seeding is reproducible, requirements are data not config

**Tasks Affected:**
- Task 1: Define the requirement schema (What fields does FrameworkRequirement have?)
- Task 2: Build seeds (`server/lib/frameworkRequirementSeed.ts`, `frameworkMappingSeed.ts`)
- Task 2: Create migration (`server/migrations/seedComplianceReferenceData.ts`)
- **Task 12:** Run migration at deploy time

**Seed Pattern** (mirrors `emissionFactorSeed.ts`):
```typescript
// server/lib/frameworkRequirementSeed.ts
export const FRAMEWORK_REQUIREMENT_SEED = [
  {
    framework: 'IFRS_S2',
    requirementCode: 'S2_29a',
    description: 'GHG emissions: Scope 1, 2, Scope 3 categories 1–15',
    dataPointKeys: ['scope1_emissions', 'scope2_market_emissions', 'scope3_emissions'],
    mandatory: true,
    suggestedQuestion: 'What are your Scope 1, 2, 3 emissions?',
    verificationNotes: 'ISO 14064-1 / GHG Protocol',
  },
  // ... 100+ more requirements
];

// Migration
async function seedComplianceReferenceData() {
  const collection = db.collection('FrameworkRequirement');
  for (const doc of FRAMEWORK_REQUIREMENT_SEED) {
    await collection.updateOne(
      { framework: doc.framework, requirementCode: doc.requirementCode },
      { $set: doc },
      { upsert: true }
    );
  }
}
```

---

### Decision 4: Async Precompute Validation (Not Synchronous)

**Design:** Save operation enqueues a validation recompute; results persist in `ComplianceRun`; UIs read the latest run (async polling or webhook).

**Why:**
- Save stays fast (<500ms)
- Validation can take 2 seconds (acceptable for background job, not for request)
- At 100+ projects, validation cost adds up; precompute spreads it out
- Debouncing: Multiple saves in 100ms window = 1 validation run (not N)

**Tasks Affected:**
- Task 1: Design the debounce strategy (Group saves by customer/year within 100ms window)
- Task 2: Build `ComplianceEngine.runAll()` (orchestrates all three validators)
- Task 2: Add post-save hooks in `server.ts` that enqueue revalidation
- Task 3: Build polling/websocket handler in frontend
- **Task 12:** Integrate hooks into existing emission/answer/materiality save paths

**Save Hook Pattern:**
```typescript
// server.ts (existing save routes)
app.post('/api/db/answers', requireAuth, async (req, res) => {
  // ... existing save logic
  const answer = await Answer.create(req.body);
  
  // NEW: enqueue compliance revalidation
  enqueueComplianceValidation(answer.customerId, answer.projectYear);
  
  res.json({ success: true, data: answer });
});

// server/lib/complianceQueue.ts
const validationQueue = new Map<string, NodeJS.Timeout>(); // key = customerId:year

function enqueueComplianceValidation(customerId: string, year: number) {
  const key = `${customerId}:${year}`;
  
  // Clear existing timeout for this customer/year
  if (validationQueue.has(key)) clearTimeout(validationQueue.get(key));
  
  // Enqueue new validation (debounced 100ms)
  const timeoutId = setTimeout(async () => {
    const run = await complianceEngine.runAll(customerId, year);
    validationQueue.delete(key);
  }, 100);
  
  validationQueue.set(key, timeoutId);
}
```

---

### Decision 5: Append-Only Audit Trail

**Design:** `ComplianceAuditEvent` collection, never updated, only inserted. Every validation run, conflict resolution, scenario save creates events.

**Why:**
- Regulatory immutability (ESRS/CSRD requires audit trail)
- Reconciliation history (Did consultant change their answer? When? Why?)
- Debugging (What calculation ran? What data went in?)

**Tasks Affected:**
- Task 1: Design `ComplianceAuditEvent` schema
- Task 2: Build `ComplianceAuditService.logEvent()`
- Task 5: Call audit service after conflict reconciliation
- Task 8: Call audit service after scenario save
- **Task 13-15:** Test that all writes are logged

**Audit Service Pattern:**
```typescript
// server/services/audit/ComplianceAuditService.ts
export class ComplianceAuditService {
  async logEvent(event: {
    type: 'completeness_run' | 'consistency_check' | 'conflict_reconciled' | 'scenario_created';
    customerId: string;
    year: number;
    actor: string; // userId from JWT
    details: any;
    resultingRunId?: string;
  }) {
    const doc = new ComplianceAuditEvent({
      type: event.type,
      customerId: event.customerId,
      year: event.year,
      actor: event.actor,
      details: event.details,
      timestamp: new Date(),
      resultingRunId: event.resultingRunId,
    });
    await doc.save(); // Append only, never update
    return doc;
  }
}
```

---

## 3. Parallelization Strategy: Backend, Frontend, QA Independent

### Timeline

```
WEEK 1-2: Research & Design (Tasks 1, 4, 7)
  ├─ Task 1: Framework Completeness Validator design
  │   └ Deliverable: dataPointKeys vocabulary + FrameworkRequirement schema
  ├─ Task 4: Consistency Checker design
  │   └ Deliverable: FrameworkMapping schema + conflict detection algorithm
  ├─ Task 7: Climate Scenario design
  │   └ Deliverable: GFANZ pathways + financial impact model
  └─ **GATE:** Product/Architecture team reviews & approves all schemas

WEEK 3: Shared Infrastructure (Task 2, 5, 8)
  ├─ Task 2: Build DataPointResolver + FrameworkRegistry + CompletenessService
  ├─ Task 5: Build ConsistencyService (reads resolver, outputs conflicts)
  ├─ Task 8: Build ScenarioService + math functions
  └─ **GATE:** All three services pass unit tests, routes callable via cURL

WEEK 4-6: Feature Backends (Tasks 2, 5, 8-9) + Frontend Mocks (Task 3, 6, 10-11)
  ├─ Backend continues (finalize routes, hooks, seeds)
  ├─ Frontend: Build components against mocked API responses
  │   └ No need to wait for backend (API contracts locked in Week 2)
  ├─ QA: Begin unit tests on services (don't wait for routes)
  └─ **GATE:** All three routes callable from frontend

WEEK 6-8: Frontend Integration (Tasks 3, 6, 10-11)
  ├─ Task 3: Wire ComplianceDashboard to real backend
  ├─ Task 6: Wire ConsistencyDashboard to real backend
  ├─ Tasks 10-11: Wire ScenarioBuilder + Roadmap to real backend
  └─ **GATE:** All UIs working end-to-end

WEEK 8-10: Integration & Testing (Tasks 12, 13-15)
  ├─ Task 12: Hook compliance validation into save flows
  ├─ Tasks 13-15: Comprehensive testing (integration, performance, edge cases)
  └─ **GATE:** All tests passing, <2s validation time confirmed

WEEK 10-12: Documentation & Deployment (Tasks 16-17)
  ├─ Task 16: User guides, API docs, training
  ├─ Task 17: Staging → Production
  └─ **GATE:** Features live, team trained
```

### Independence Model

**Backend can work independently because:**
- API contracts frozen in Week 2 (what endpoints exist, what they accept, what they return)
- Services unit-testable without routes
- Save hooks don't block other features (independent enqueue)

**Frontend can work independently because:**
- Mock API responses = backend contract
- UI components don't need real data immediately
- Integration is mechanical (swap mock for real API client)

**QA can work independently because:**
- Service unit tests don't require Express
- Integration tests run in Week 8-10 after features connected
- Performance testing is a separate track (load testing tool on staging)

---

## 4. Critical Integration Points

### Integration 1: DataPointResolver Reads Existing Data

**Current Models Used:**
- `EmissionEntry` (from EmissionsPage)
- `Answer` (from ProjectDetailPage)
- `MaterialityTopic` (from DMAPage)
- `MetricEntry` (future: S1/G1 modules)

**DataPointResolver Mapping:**
```typescript
// Given (customerId, year):
// 1. Find all EmissionEntry with customerId, year
//    → Extract scope1_emissions, scope2_market_emissions, scope3_emissions
// 2. Find all Answer for projectYear=year, customerId=...
//    → Extract answer.value keyed by question.code (e.g., 'headcount', 'women_in_leadership')
// 3. Find MaterialityTopic for customerId, year
//    → Extract materialTopics array (e.g., ['E1', 'S1', 'G1'])
// 4. Return canonical map: { scope1_emissions: 500, headcount: 1200, ... }
```

**Task 2 Implementation:** DataPointResolver must read these 4 collections. If schema changes, resolver must adapt.

---

### Integration 2: Save Hooks Enqueue Validation

**Current Save Flows:**
1. EmissionsPage saves EmissionEntry → POST `/api/emissions/entry`
2. ProjectDetailPage saves Answer → POST `/api/db/answers`
3. DMAPage saves MaterialityTopic → POST `/api/materiality/score`

**New Hook:** After each save, enqueue `complianceEngine.runAll(customerId, year)`

**Task 12 Implementation:**
```typescript
// server.ts (register hook)
app.post('/api/emissions/entry', ...existingHandler, (req, res) => {
  // After existing save logic:
  enqueueComplianceValidation(req.body.customerId, req.body.year);
});
```

---

### Integration 3: UI Displays Compliance Status

**ComplianceDashboardPage (Task 3):**
- Embeds in ProjectDetailPage as a new tab (alongside "Forms", "Audit", "Plan")
- Or embeds as banner on "Overview" tab
- Shows latest `ComplianceRun` for selected project

**Alert Banner (Task 3):**
- If completeness < 80%, show warning on ProjectDetailPage overview
- "⚠️ 18 required disclosures missing. View compliance dashboard."
- Clickable → opens ComplianceDashboard

**ClimateScenarioPage (Task 10):**
- New page at `/projects/:projectId/climate`
- Pre-populates baseline with current EmissionEntry data
- Allows building scenarios

---

### Integration 4: DMAPage Suggests Climate Analysis

**Current:** DMAPage shows materiality assessment and template recommendations

**New:** After DMA approved with E1 material:
- Show link to "Climate Scenario Analysis"
- "Based on your E1 materiality, model your climate pathways."
- Opens ClimateScenarioPage with E1 auto-selected

---

## 5. Task-to-Architecture Mapping

| Task | Builds | Relies On | Unblocks |
|------|--------|-----------|----------|
| 1 | dataPointKeys vocab | - | 2, 4, 7 |
| 2 | DataPointResolver, FrameworkRegistry, CompletenessService, route | 1 | 3, 12, 13 |
| 3 | ComplianceDashboard, AlertBanner | 2 | 12 |
| 4 | Framework mapping algo | - | 5 |
| 5 | ConsistencyService, route | 2, 4 | 6, 12, 14 |
| 6 | ConsistencyDashboard, ConflictModal | 5 | 12 |
| 7 | GFANZ pathways, financial model spec | - | 8, 9 |
| 8 | ScenarioService, math functions, route | 2, 7 | 9, 10 |
| 9 | FinancialImpactService, SbtService | 8 | 10, 12 |
| 10 | ScenarioBuilder, TransitionLeverSelector | 8-9 | 11, 12 |
| 11 | FinancialDashboard, Roadmap | 10 | 12 |
| 12 | Integration (hooks + UI wiring) | 2-3, 5-6, 8-11 | 13, 14, 15 |
| 13 | Unit tests (completeness) | 2 | - |
| 14 | Unit tests (consistency) | 5 | - |
| 15 | Unit tests (scenario) + perf tests | 8-11 | - |
| 16 | Documentation | 2-11 | 17 |
| 17 | Deployment + training | 16 | - |

---

## 6. Code Conventions & Team Patterns

### Mongoose Schema (All Follow `createAppSchema`)

```typescript
// server/models/index.ts — append new schemas here
const complianceRunSchema = createAppSchema({
  customerId: { type: String, required: true, index: true },
  year: { type: Number, required: true },
  framework: { type: String, enum: ['IFRS_S1', 'IFRS_S2', 'GRI', 'ESRS', 'TCFD'] },
  completeness: { type: Number, min: 0, max: 100 }, // %
  gaps: [{
    requirementCode: String,
    recommendation: String,
    suggestedQuestionCodes: [String],
  }],
});

export const ComplianceRunModel = getOrCreateModel('ComplianceRun', complianceRunSchema);
```

### API Response Envelope (Consistent)

```typescript
// Success
res.json({ success: true, data: complianceRun });

// Error
res.status(400).json({ success: false, error: 'customerId required', code: 'compliance/invalid-input' });
```

### React Hooks Pattern

```typescript
// src/hooks/useComplianceApi.ts
export function useComplianceApi() {
  return {
    validateCompleteness: async (customerId, year, frameworks) => {
      return apiClient('/api/compliance/validate-completeness', {
        method: 'POST',
        body: JSON.stringify({ customerId, year, frameworks }),
      });
    },
    getFrameworkMappings: async () => {
      return apiClient('/api/compliance/framework-mappings');
    },
  };
}
```

---

## 7. Rollout & Feature Flags

### Week 11: Staging Deployment

All three features behind feature flags (can disable if issues):

```typescript
// server/lib/features.ts
const FEATURES = {
  COMPLIANCE_VALIDATOR: process.env.ENABLE_COMPLIANCE_VALIDATOR === 'true',
  CONSISTENCY_CHECKER: process.env.ENABLE_CONSISTENCY_CHECKER === 'true',
  CLIMATE_SCENARIOS: process.env.ENABLE_CLIMATE_SCENARIOS === 'true',
};

// Route usage
app.post('/api/compliance/validate', (req, res) => {
  if (!FEATURES.COMPLIANCE_VALIDATOR) {
    return res.status(404).json({ success: false, error: 'Feature not enabled' });
  }
  // ...
});
```

### Week 12: Production Rollout

- Deploy with all flags OFF (features invisible)
- Enable COMPLIANCE_VALIDATOR (10% of projects → 50% → 100% over 48h)
- Once stable, enable CONSISTENCY_CHECKER (same ramp)
- Once stable, enable CLIMATE_SCENARIOS

**Monitoring:**
- Error rate per feature (Should be <1%)
- Validation time distribution (P95 < 2s)
- API latency (POST /api/compliance/validate-completeness)

---

## 8. Success Criteria & Handoff

### Definition of Done for Each Task

**Design (Tasks 1, 4, 7):**
- ✅ Schema documents reviewed by architect & product
- ✅ dataPointKeys vocabulary final (no changes after Week 2)
- ✅ API contracts written (OpenAPI or similar)

**Backend (Tasks 2, 5, 8-9):**
- ✅ Services unit-tested (Jest, >80% coverage)
- ✅ Seed data loaded (Migration runs successfully)
- ✅ Routes callable via cURL (curl tests in test suite)
- ✅ Performance target met (<2s validation)

**Frontend (Tasks 3, 6, 10-11):**
- ✅ Components render without errors
- ✅ Hooked to real API (no mocks)
- ✅ UX/design match wireframes (from Week 1)
- ✅ Responsive on desktop + mobile

**Integration (Task 12):**
- ✅ Save hooks enqueue validation (observable in audit log)
- ✅ ComplianceDashboard reflects latest ComplianceRun
- ✅ No blocking validation delays (async)

**Testing (Tasks 13-15):**
- ✅ All unit tests passing (services)
- ✅ All integration tests passing (routes + data)
- ✅ All UI tests passing (components)
- ✅ Performance tests confirm <2s
- ✅ Edge cases covered (100+ scenarios)

**Documentation (Task 16):**
- ✅ User guides written (Markdown)
- ✅ API documentation complete (OpenAPI)
- ✅ Video tutorials recorded (3-5 min each)
- ✅ Troubleshooting FAQ populated
- ✅ Team trained (all attendees can operate features)

**Deployment (Task 17):**
- ✅ Staging tested 24h
- ✅ Monitoring dashboards active
- ✅ Feature flags working
- ✅ Production deployment successful
- ✅ Gradual rollout on track (10% → 50% → 100%)

---

## 9. Risk Mitigation by Design

### Risk: Validation Takes >2 Seconds at 100+ Projects

**Mitigation:** Async precompute (Decision 4)
- Validation doesn't block saves
- Debouncing prevents N validations for N saves
- Monitoring: Track P95 latency, alert if >2s

---

### Risk: DataPointResolver Misses Data Source

**Mitigation:** Clear abstraction (architecture principle)
- Resolver is unit-tested with all data sources
- When new source added (Priority 2: S1 metrics), resolver updated first
- Service tests ensure resolver works

---

### Risk: Framework Requirements Incomplete

**Mitigation:** Seed-based (Decision 3)
- Requirement rows are auditable (can see when added)
- Can patch without rebuild
- Staging validation: Run all requirements, count them

---

### Risk: Team Doesn't Meet <2s Performance Target

**Mitigation:** Perf testing in Week 8-10 (Task 15)
- Load test with 100 concurrent validations
- If slow, profile → optimize (cache hit rate, query count, etc.)
- Fallback: Increase debounce window (trades latency for throughput)

---

## 10. Handoff to Priority 2

Once Priority 1 deployed (Week 12):

1. **Data Model is Stable:** No breaking changes to `DataPointResolver`, `ComplianceRun`, etc.
2. **Extensibility Proven:** E1 validation works; S1 validation is same code + new seed rows
3. **Team Has Pattern:** Build service → build route → build UI → integrate → test
4. **Monitoring Active:** Can detect performance degradation as new modules added

**Priority 2 (Q3-Q4 2026):**
- S1 Workforce Metrics Module (same pattern as E1)
- G1 Governance Module
- E2/E3/E4/E5 Environmental Modules (phased)

Each new module:
1. Design `dataPointKeys` for new topic (existing resolver reads new data)
2. Build service (CompletenessService reused, only add topic-specific logic)
3. Build UI (same dashboard pattern)
4. Seed framework requirements for new topic
5. Test & deploy

---

## 11. References

- **Architecture Document:** `docs/architecture/architecture-priority-1.md`
- **ADRs:**
  - `docs/adr/ADR-P1-01-reference-data-storage.md`
  - `docs/adr/ADR-P1-02-service-layer.md`
  - `docs/adr/ADR-P1-03-async-precompute-validation.md`
  - `docs/adr/ADR-P1-04-append-only-audit-trail.md`
- **Task List:** `PRIORITY_1_TASK_LIST.md`
- **System Workflow:** `docs/guides/COMPLETE_SYSTEM_WORKFLOW.md` (Sections 6-7: Gaps & Roadmap)
- **Platform Guide:** `docs/guides/PLATFORM_WORKFLOW_GUIDE.md`

---

## 12. Approval Sign-Off

- [ ] **Architecture Review:** Software Architect (approved above)
- [ ] **Product Owner:** Validates design meets compliance requirements
- [ ] **Tech Lead:** Confirms team capacity and risk mitigation
- [ ] **QA Manager:** Agrees testing strategy and coverage targets

**Ready for kickoff?** Once all signed, teams can proceed with Week 1 design tasks.

---

**Document Status:** Final (Ready for Implementation)  
**Last Updated:** June 3, 2026  
**Next Review:** After Week 2 (design gate before coding starts)

