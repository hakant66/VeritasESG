# Week 1 Design Kickoff - Priority 1 Implementation

**Status:** 🚀 DESIGN PHASE BEGINS  
**Week:** June 10-14, 2026  
**Teams:** 3 parallel design teams  
**Deliverable:** Design review Friday June 14 with API contracts frozen  

---

## 🎯 Mission This Week

Three parallel design teams will specify the complete architecture for Priority 1 features:
1. **Team A:** Framework Completeness Validator design
2. **Team B:** Cross-Framework Consistency Checker design
3. **Team C:** Climate Scenario Analysis module design

By Friday June 14, all three teams present designs and **lock API contracts** that enable backend/frontend teams to work independently starting Week 2.

---

## 📋 Team Assignments

### Team A: Framework Completeness Validator

**Lead:** [Product Manager / Design Lead]  
**Duration:** 1 week (3 days effort)  
**Focus:** Ensuring companies answer all required disclosures

**Deliverables:**
- ✓ Framework requirements enumeration (IFRS S1/S2, GRI, ESRS, TCFD)
- ✓ MongoDB schema design (FrameworkRequirement, ComplianceRun)
- ✓ API contract specification (3 endpoints)
- ✓ Service layer design (CompletenessService, DataPointResolver)
- ✓ UI/UX design (ComplianceDashboard, GapReport, AlertBanner)

**Document:** `docs/design/TASK-1-FRAMEWORK-COMPLETENESS-DESIGN.md` (Committed)

**Daily Standup:**
- Mon: Framework enumeration research (IFRS S1/S2, GRI)
- Tue: Schema design + API contracts  
- Wed: Service layer + DataPointResolver design  
- Thu: UI/UX mockups + review prep
- Fri: Design review presentation

---

### Team B: Cross-Framework Consistency Checker

**Lead:** [Product Manager / Design Lead]  
**Duration:** 1 week (3 days effort)  
**Focus:** Detecting contradictions across frameworks

**Deliverables:**
- ✓ Framework equivalence mappings (GRI 305-1 ↔ IFRS S2 Scope 1, etc.)
- ✓ MongoDB schema design (FrameworkMapping, ConsistencyConflict)
- ✓ API contract specification (4 endpoints)
- ✓ Service layer design (ConsistencyService, variance detection)
- ✓ UI/UX design (ConsistencyDashboard, ConflictResolutionModal)

**Document:** `docs/design/TASK-4-CONSISTENCY-CHECKER-DESIGN.md` (Committed)

**Daily Standup:**
- Mon: Framework mapping research (Scope 1/2/3 equivalence)
- Tue: Schema design + API contracts
- Wed: Variance detection algorithm + reconciliation logic
- Thu: UI/UX mockups + review prep  
- Fri: Design review presentation

---

### Team C: Climate Scenario Analysis

**Lead:** [Product Manager / Design Lead]  
**Duration:** 1.5 weeks (5 days effort)  
**Focus:** GFANZ-aligned decarbonization modeling

**Deliverables:**
- ✓ GFANZ pathway research (1.5°C, 2°C, 3°C+ targets)
- ✓ Transition levers enumeration (30+ strategies)
- ✓ MongoDB schema design (ClimateScenario, TransitionLeverTemplate)
- ✓ API contract specification (4 endpoints)
- ✓ Service layer design (ScenarioService, ScenarioCalculator, SbtService)
- ✓ UI/UX design (ScenarioBuilder, FinancialImpactDashboard, Roadmap)

**Document:** `docs/design/TASK-7-CLIMATE-SCENARIO-DESIGN.md` (Committed)

**Daily Standup:**
- Mon: GFANZ pathway research + transition lever enumeration
- Tue: Schema design + API contracts
- Wed: Calculation algorithms (pathway projection, financial impact)
- Thu: SBT alignment + UI/UX mockups + review prep
- Fri: Design review presentation

---

## 📅 Schedule

### Week 1: Design Phase (June 10-14)

| Day | Team A | Team B | Team C | Shared |
|-----|--------|--------|--------|--------|
| **Mon 10** | Framework enum | Mapping research | GFANZ research | ← All teams start |
| **Tue 11** | Schema + APIs | Schema + APIs | Schema + APIs | Parallel |
| **Wed 12** | Services design | Variance logic | Calc algorithms | Parallel |
| **Thu 13** | UI/UX mockups | UI/UX mockups | UI/UX mockups | Parallel |
| **Fri 14** | **DESIGN REVIEW** | **DESIGN REVIEW** | **DESIGN REVIEW** | 9:00-11:00 AM |

### Friday June 14 Design Review (2 hours)

**Attendees:** All design team leads, Product, Tech Lead, QA Manager, Architect

**Agenda:**
- 9:00-9:15: Team A presentation (Framework Completeness)
- 9:15-9:30: Team A Q&A
- 9:30-9:45: Team B presentation (Consistency Checker)
- 9:45-10:00: Team B Q&A
- 10:00-10:15: Team C presentation (Climate Scenario)
- 10:15-10:30: Team C Q&A
- 10:30-10:50: Decision gate (schemas approved? APIs final? Ready for backend?)
- 10:50-11:00: Assignments for Week 2 backend teams

**Deliverables from Review:**
- ✅ All schemas approved by Tech Lead
- ✅ All APIs locked (no changes after Friday)
- ✅ Team assignments for Week 2 confirmed
- ✅ Backend/Frontend parallelization enabled

---

## 🔗 Design Documents (All Committed)

### Framework Completeness (Team A)
**File:** `docs/design/TASK-1-FRAMEWORK-COMPLETENESS-DESIGN.md`

- Section 1: Framework Requirements Enumeration (IFRS S1/S2, GRI, ESRS, TCFD)
- Section 2: MongoDB Schema Design (FrameworkRequirement, ComplianceRun)
- Section 3: API Contract (/api/compliance/*)
- Section 4: Service Layer (CompletenessService, DataPointResolver)
- Section 5: UI/UX Design (ComplianceDashboard, GapReport, AlertBanner)
- Section 6: Integration Points (with ProjectDetailPage, EmissionsPage, DMAPage)
- Section 7: Reference Data Seeding
- Section 8: Timeline & Success Criteria

### Consistency Checker (Team B)
**File:** `docs/design/TASK-4-CONSISTENCY-CHECKER-DESIGN.md`

- Section 1: Framework Equivalence Mappings
- Section 2: MongoDB Schema Design (FrameworkMapping, ConsistencyConflict)
- Section 3: API Contract (/api/compliance/*)
- Section 4: Service Layer (ConsistencyService, variance detection)
- Section 5: UI/UX Design (ConsistencyDashboard, ConflictResolutionModal)
- Section 6: Integration Points
- Section 7: Reference Data Seeding
- Section 8: Timeline & Success Criteria

### Climate Scenario (Team C)
**File:** `docs/design/TASK-7-CLIMATE-SCENARIO-DESIGN.md`

- Section 1: GFANZ Pathways Research
- Section 2: Transition Levers (30+ strategies with impact ranges)
- Section 3: MongoDB Schema Design (ClimateScenario, TransitionLeverTemplate)
- Section 4: API Contract (/api/climate/*)
- Section 5: Service Layer (ScenarioService, ScenarioCalculator, SbtService)
- Section 6: UI/UX Design (ScenarioBuilder, FinancialImpactDashboard, Roadmap)
- Section 7: Reference Data Seeding
- Section 8: Timeline & Success Criteria

---

## 🎓 References & Standards

### Framework Documentation
- **IFRS S1/S2:** https://www.ifrs.org/issued-standards/ifrs-s1-s2/
- **GRI Standards:** https://www.globalreporting.initiative.org/
- **ESRS:** https://ec.europa.eu/sustainable-finance/
- **TCFD:** https://www.fsb-tcfd.org/
- **GFANZ:** https://www.gfanzero.com/publications/

### Internal References
- `docs/guides/COMPLETE_SYSTEM_WORKFLOW.md` (Gap analysis context)
- `PRIORITY_1_TASK_LIST.md` (Overall 18-task roadmap)
- `PRIORITY_1_ARCHITECTURE_REVIEW.md` (Stakeholder review structure)
- `docs/architecture/architecture-priority-1.md` (System architecture blueprint)

---

## 💡 Key Design Principles

### 1. Shared Foundation
All three features rely on a shared **DataPointResolver** that normalizes data from:
- `EmissionEntry` → GHG emissions (Scope 1/2/3)
- `Answer` → Custom project disclosures
- `DMA` → Materiality context
- `Project` → Financial, workforce, facility data

**Why:** Ensures all three features read from the same source of truth. Adding E2/S1/G1 in Priority 2 is just extending DataPointResolver, not rewriting features.

### 2. Extensibility Through Seeds
Reference data (frameworks, mappings, levers, pathways) are stored as seeded MongoDB collections, not hardcoded TypeScript enums.

**Why:** Adding a new framework or lever = inserting a seed row, not recompiling the app. Customers can override/customize without code changes.

### 3. Async Validation
Completeness and Consistency checks run in background (enqueue → return immediately → compute → persist).

**Why:** Meets <2s performance target. Validation doesn't block user save operations.

### 4. Immutable Audit Trail
All compliance decisions logged to ComplianceAuditEvent (insert-only, never update).

**Why:** Regulatory compliance. Auditors can trace every validation run, conflict resolution, and scenario approval.

---

## 🚦 Blockers & Dependencies

### No Critical Blockers
- GFANZ data publicly available ✓
- GRI/IFRS/ESRS standards published ✓
- All team members have design doc access ✓
- No external dependencies blocking design ✓

### Watch Out For
1. **Framework interpretation ambiguity** — If IFRS/GRI seem to conflict on definition, document it + escalate to Product
2. **Calculation complexity** — If financial impact math gets complex, spike early + get external math validation by Thursday
3. **Data source gaps** — If DataPointResolver can't find a needed data point, flag for architecture review

---

## 📊 Success Metrics

### Team A (Framework Completeness)
- ✅ All 4 frameworks enumerated (42+ requirements total)
- ✅ Schemas support future E2/S1/G1 extensions
- ✅ APIs locked Friday 5:00 PM
- ✅ Design review presentation clear & complete

### Team B (Consistency Checker)
- ✅ All equivalent indicators mapped (Scope 1, 2, 3, intensity)
- ✅ Variance thresholds validated against standards
- ✅ APIs locked Friday 5:00 PM
- ✅ Design review presentation clear & complete

### Team C (Climate Scenario)
- ✅ GFANZ pathways researched & verified
- ✅ 30+ transition levers enumerated with realistic ranges
- ✅ Calculation algorithms sound (financial, pathway projections)
- ✅ APIs locked Friday 5:00 PM
- ✅ Design review presentation clear & complete

### Overall
- ✅ All design documents complete & committed
- ✅ All MongoDB schemas approved
- ✅ All API contracts frozen
- ✅ Design review passed
- ✅ Backend/Frontend teams ready to parallelize Week 2

---

## 🎬 Week 2 Handoff (Starts Monday June 17)

If design review passes Friday:

### Backend Implementation (Tasks 2, 5, 8, 9)
- Implement routes + services from locked API contracts
- Build CompletenessService, ConsistencyService, ScenarioService
- No API changes (contracts are locked)
- Can start immediately Monday without waiting for frontend

### Frontend Implementation (Tasks 3, 6, 10, 11)
- Build React components from locked API contracts
- Mock APIs in tests (backend may not be ready yet)
- No API changes needed
- Can start immediately Monday without waiting for backend

### QA Planning (Tasks 13-15 prep)
- Set up test data (sample customers, projects, emissions)
- Define test scenarios per feature
- Prepare test environments

---

## 📞 Communication

### Daily Standups
- **Time:** 10:00 AM UTC (adjust as needed)
- **Format:** 15 minutes per team
  - Yesterday: What was accomplished
  - Today: What's planned
  - Blockers: Any issues?
- **Location:** Zoom / Conference Room (TBD)

### Escalation
- **Design issues:** Escalate to Product/Architect immediately
- **Calculation complexity:** Flag by Wednesday
- **Standards ambiguity:** Document + escalate by Thursday

### Information Sharing
- All design docs committed to `main` branch
- Weekly push to GitHub (already done)
- Slack #priority-1-design channel (create if needed)

---

## ✅ Checklist for Teams

### Before Starting (Monday AM)
- [ ] Read all 3 design documents
- [ ] Understand shared DataPointResolver concept
- [ ] Confirm team lead assignments
- [ ] Schedule daily standups
- [ ] Identify any baseline research needed

### Daily (Mon-Thu)
- [ ] Attend standup (10:00 AM)
- [ ] Log progress on Jira/Linear (if using)
- [ ] Flag any blockers immediately
- [ ] Review other teams' progress (stay in sync)

### Friday AM (Before Design Review)
- [ ] Finalize presentation slides
- [ ] Do final review of design doc
- [ ] Prepare demo/mockups (if any)
- [ ] Dry-run presentation

### Friday PM (After Design Review)
- [ ] Incorporate feedback from review
- [ ] Update design docs with approvals
- [ ] Confirm API contracts final
- [ ] Hand off to Week 2 backend teams

---

## 📝 Documentation Standards

For all design decisions made this week:

1. **Document in the design file** (don't create new files)
2. **Include rationale** (why this design?)
3. **Link to standards** (which GRI/IFRS requirement?)
4. **Note trade-offs** (what was rejected and why?)
5. **Estimate effort** (how hard is it to build?)

Example:
```
## Variance Threshold Decision (Team B)

**Decision:** Set threshold at 5% for Scope 1, 10% for Scope 3

**Rationale:** 
- GHG Protocol allows ±5% rounding error
- Scope 3 data inherently less precise (±10%)
- >5% variance on Scope 1 = material reporting issue

**Standards Ref:** GHG Protocol Scope Guidance, Section 4.2

**Trade-offs:**
- Could use 3% (tighter, more conflicts, more resolution work)
- Could use 8% (looser, risks missing real issues)

**Effort to Implement:** Low (hardcoded threshold in service layer)
```

---

## 🎯 Design Review Grading Criteria

Arch/Product will grade each team on:

| Criteria | Weight | What We're Looking For |
|----------|--------|---|
| Completeness | 25% | All frameworks enumerated? All levers identified? |
| Accuracy | 25% | Standards correctly interpreted? Calculations sound? |
| Extensibility | 20% | Can Priority 2 (S1/G1/E2-E5) reuse this architecture? |
| API Design | 20% | Endpoints logical? Payloads sensible? Parallelizable? |
| Clarity | 10% | Is the design easy to understand? Well-documented? |

**Target:** All teams score >85% (A/B grade)

---

## 🚀 Ready?

All design documents committed. Three teams assigned. Architecture reviewed. Let's build Priority 1.

**Kickoff:** Monday June 10, 10:00 AM UTC  
**Design Review:** Friday June 14, 9:00-11:00 AM UTC  
**Backend Starts:** Monday June 17  

Let's go! 🎬

---

## Q&A

**Q: What if we disagree with the design document during the week?**  
A: Document your alternative in the design file with rationale, present both options at design review Friday, let Product/Arch decide.

**Q: What if a team finishes early?**  
A: Help other teams, do deeper research on standards, create spike experiments for complex algorithms, but don't start implementation (that's Week 2).

**Q: What if we find a blocker mid-week?**  
A: Escalate immediately (don't wait until Friday). Arch is available for clarification.

**Q: What's the definition of "API contracts locked"?**  
A: No changes to endpoint URLs, HTTP methods, request/response schemas after Friday 5:00 PM. Backend dev must build exactly to spec. Frontend can mock and build in parallel.

