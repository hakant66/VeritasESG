# Task 1: Framework Completeness Validator - Design Document

**Status:** In Progress (Week 1)  
**Due:** Friday, June 14, 2026 (Design Review)  
**Owner:** Design Team A  

---

## Overview

The Framework Completeness Validator ensures companies answer all required disclosures for the sustainability frameworks they claim to follow (IFRS S1/S2, GRI, ESRS, TCFD).

**Key Insight:** One project may report under multiple frameworks. The validator must:
1. Identify which frameworks the company claims
2. Map required disclosures per framework
3. Check which are answered in project data
4. Flag gaps with explanations
5. Suggest auto-population from existing data

---

## 1. Framework Requirements Enumeration

### Scope 1: IFRS S2 (Climate-Related Disclosures)

IFRS S2 requires disclosure of climate-related financial impacts under Governance (G), Strategy (S), Risk Management (RM), and Metrics & Targets (M&T).

**Key Disclosures Required:**

| Topic | Disclosure | Data Point | Status |
|-------|-----------|-----------|--------|
| Governance | Board oversight of climate | Governance structure | Map to DMA |
| Strategy | Climate resilience scenarios | 1.5°C, 2°C, 3°C pathways | Climate Scenario feature |
| Strategy | Transition plan | Decarbonization roadmap | Climate Scenario feature |
| Risk Mgmt | Risk identification process | Risk assessment framework | Map to custom fields |
| Metrics & Targets | GHG emissions (S1+S2) | Scope 1, 2 totals | EmissionEntry |
| Metrics & Targets | Emissions intensity | Emissions / revenue | EmissionEntry |
| Metrics & Targets | SBT alignment | Science-based target % | Climate Scenario feature |
| Metrics & Targets | Transition finance | Green capex, % of total | Custom field |

**Data Sources:**
- `EmissionEntry` → Scope 1, 2, intensity
- `DMA` → Materiality topics (maps to governance)
- `ClimateScenario` (new) → Pathways, targets, roadmap
- `Answer` (project questions) → Custom disclosures

### Scope 2: IFRS S1 (General Sustainability)

IFRS S1 covers human capital, supply chain resilience, pollution, resource scarcity, and customer/product responsibility.

**Key Disclosures (Scope: Subset for Phase 1):**

| Topic | Disclosure | Data Point | Status |
|-------|-----------|-----------|--------|
| Human Capital | Headcount, turnover, pay equity | Workforce metrics | Custom fields |
| Supply Chain | Supply chain governance | Supplier % audited | Custom fields |
| Stakeholder Engagement | Engagement process | Consultation frequency | Map to DMA |

*Note: Full IFRS S1 coverage deferred to Priority 2*

### Scope 3: GRI Standards (Global Reporting Initiative)

GRI is modular: companies report on material topics only.

**GRI 300 (Environmental):**
- **GRI 305 (Emissions)** → Scope 1/2/3 (matches IFRS S2 + more)
- **GRI 308 (Supplier Environmental Assessment)** → Supply chain
- **GRI 306 (Waste)** → Waste disposal, hazardous waste
- **GRI 303 (Water & Effluents)** → Water consumption, discharge

**GRI 400 (Social):**
- **GRI 401 (Employment)** → Headcount, pay, turnover
- **GRI 403 (Occupational Health & Safety)** → Incident rate, lost time
- **GRI 404 (Training & Development)** → Training hours, % trained
- **GRI 413 (Local Communities)** → Community impact, grievance mechanisms

**Data Sources:**
- `EmissionEntry` → GRI 305
- `Answer` fields → GRI 308, 306, 303, 401, 403, 404, 413

### Scope 4: ESRS (European Sustainability Reporting Standards)

ESRS double materiality assessment determines which standards apply.

**E1 (Climate Change):**
- Mitigation targets (S1+S2 pathway)
- Adaptation risks and resilience
- Climate impact on financial performance

**E2-E5:** (Deferred to Priority 2)

**S1-S4:** (Deferred to Priority 2)

**G1:** (Deferred to Priority 2)

**Data Sources:**
- Similar to IFRS S2 + DMA double materiality

### Scope 5: TCFD (Task Force on Climate-Related Financial Disclosures)

TCFD is a framework for climate disclosure, similar to IFRS S2 but less prescriptive.

**Pillars:**
1. **Governance** → Same as IFRS S2
2. **Strategy** → 1.5°C scenario analysis
3. **Risk Management** → Climate risk assessment
4. **Metrics & Targets** → GHG emissions, intensity, SBT alignment

---

## 2. MongoDB Schema Design

### FrameworkRequirement Schema

```typescript
interface FrameworkRequirement {
  _id: ObjectId;
  
  // Framework identity
  frameworkId: string;           // "ifrs_s2" | "ifrs_s1" | "gri_305" | "esrs_e1" | "tcfd"
  frameworkName: string;         // "IFRS S2" | "GRI 305: Emissions" | etc.
  version: string;               // "2023" | "2024"
  
  // Requirement details
  topicId: string;               // "climate_mitigation" | "emissions_scope1" | etc.
  topicName: string;             // Human-readable topic
  disclosureId: string;          // "ifrs_s2_g1.1" | "gri_305_a1" | etc.
  disclosureName: string;        // "Board climate governance" | etc.
  
  // Data mapping
  dataPointKeys: string[];       // ["scope1_emissions", "scope2_emissions"] - maps to DataPoint
  alternateDataKeys?: string[];  // Fallback data points if primary unavailable
  
  // Requirement context
  description: string;           // Full disclosure requirement text
  guidance: string;              // Explanation of what's needed
  
  // Applicability rules
  materiality: boolean;          // Is this required only if material?
  materialityTopic?: string;     // DMA topic ID if conditional
  conditions?: string[];         // ["has_supply_chain", "revenue_>_1b"]
  
  // Severity & priority
  priority: "critical" | "high" | "medium" | "low";
  mandatory: boolean;            // Must be disclosed if framework claimed
  
  // Versioning & audit
  createdBy: ObjectId;           // PlatformUser
  ownerId: ObjectId;             // PlatformUser
  createdAt: Date;
  updatedAt: Date;
  legacyFirebaseId?: string;
  
  // Virtual
  id: string;                    // Maps _id.toString()
}

// Indexes
db.FrameworkRequirement.createIndex({ frameworkId: 1 })
db.FrameworkRequirement.createIndex({ topicId: 1 })
db.FrameworkRequirement.createIndex({ dataPointKeys: 1 })
```

### ComplianceRun Schema

```typescript
interface ComplianceRun {
  _id: ObjectId;
  
  // Identity
  projectId: ObjectId;           // Which project was validated
  frameworkId: string;           // "ifrs_s2" | "gri_305" | etc.
  
  // Results
  totalRequirements: number;     // 42 disclosures for IFRS S2
  answeredRequirements: number;  // 35 answered
  completionPercentage: number;  // 83%
  
  // Gaps (what's missing)
  gaps: {
    disclosureId: string;
    disclosureName: string;
    reason: "no_data" | "insufficient_data" | "no_answer";
    suggestedDataPoint?: string;
    priority: "critical" | "high" | "medium" | "low";
  }[];
  
  // Summary
  status: "complete" | "in_progress" | "gaps_exist";
  criticalGapCount: number;
  
  // Performance & audit
  validationStartedAt: Date;
  validationCompletedAt: Date;
  validationDurationMs: number;
  
  // Audit trail
  createdBy: ObjectId;           // User/system that triggered validation
  ownerId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  legacyFirebaseId?: string;
  
  // Virtual
  id: string;
}

// Indexes
db.ComplianceRun.createIndex({ projectId: 1, frameworkId: 1 })
db.ComplianceRun.createIndex({ projectId: 1, createdAt: -1 })
db.ComplianceRun.createIndex({ status: 1 })
```

---

## 3. API Contract

### GET /api/compliance/framework-requirements

**Purpose:** Fetch all framework requirements for a given framework.

**Query Parameters:**
```
GET /api/compliance/framework-requirements?frameworkId=ifrs_s2&includeOptional=false
```

**Response:**
```json
{
  "success": true,
  "frameworkId": "ifrs_s2",
  "frameworkName": "IFRS S2 (Climate-Related)",
  "version": "2023",
  "totalCount": 42,
  "requirements": [
    {
      "id": "ifrs_s2_g1_1",
      "topicId": "governance",
      "topicName": "Governance",
      "disclosureId": "ifrs_s2_g1.1",
      "disclosureName": "Board oversight of climate-related risks and opportunities",
      "dataPointKeys": ["governance_structure", "board_climate_committee"],
      "description": "...",
      "guidance": "...",
      "priority": "critical",
      "mandatory": true
    },
    ...
  ]
}
```

**Status Codes:**
- 200 OK
- 400 Bad Request (invalid frameworkId)
- 401 Unauthorized

---

### POST /api/compliance/validate-completeness

**Purpose:** Run completeness validation for a project against a framework.

**Request Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "frameworkIds": ["ifrs_s2", "gri_305"],
  "userId": "current-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "projectId": "507f1f77bcf86cd799439011",
  "runs": [
    {
      "id": "compliance_run_001",
      "frameworkId": "ifrs_s2",
      "frameworkName": "IFRS S2",
      "totalRequirements": 42,
      "answeredRequirements": 35,
      "completionPercentage": 83,
      "status": "in_progress",
      "criticalGapCount": 3,
      "validationDurationMs": 1243,
      "gaps": [
        {
          "disclosureId": "ifrs_s2_m1.1",
          "disclosureName": "Scope 1 GHG emissions",
          "reason": "no_data",
          "suggestedDataPoint": "scope1_emissions",
          "priority": "critical"
        },
        ...
      ]
    },
    ...
  ]
}
```

**Status Codes:**
- 200 OK (validation enqueued, results will be in ComplianceRun)
- 400 Bad Request (invalid projectId or frameworkIds)
- 401 Unauthorized
- 404 Not Found (project doesn't exist)

**Async Behavior:**
- Save returns immediately with `status: "in_progress"`
- Validation runs in background
- Results persist to ComplianceRun
- Frontend polls or subscribes for updates

---

### GET /api/compliance/completeness/:projectId/:frameworkId

**Purpose:** Fetch stored completeness validation results for a project.

**Response:**
```json
{
  "success": true,
  "complianceRun": {
    "id": "compliance_run_001",
    "projectId": "507f1f77bcf86cd799439011",
    "frameworkId": "ifrs_s2",
    "completionPercentage": 83,
    "gaps": [...],
    "validationCompletedAt": "2026-06-10T14:30:00Z"
  }
}
```

---

## 4. Service Layer Design

### CompletenessService

```typescript
class CompletenessService {
  
  // Main validation logic
  async validateCompleteness(
    projectId: string,
    frameworkIds: string[]
  ): Promise<ComplianceRun[]> {
    // 1. Fetch project data (answers, emissions, materiality)
    const project = await Project.findById(projectId);
    const answers = await Answer.find({ projectId });
    const emissions = await EmissionEntry.find({ projectId });
    const dma = await DMA.find({ projectId }).lean();
    
    // 2. For each framework, load requirements
    const runs: ComplianceRun[] = [];
    for (const frameworkId of frameworkIds) {
      const requirements = await FrameworkRequirement.find({
        frameworkId,
        mandatory: true
      });
      
      // 3. Check each requirement against project data
      const gaps = this.findGaps(requirements, project, answers, emissions, dma);
      
      // 4. Calculate metrics
      const run: ComplianceRun = {
        projectId,
        frameworkId,
        totalRequirements: requirements.length,
        answeredRequirements: requirements.length - gaps.length,
        completionPercentage: ((requirements.length - gaps.length) / requirements.length) * 100,
        gaps,
        status: gaps.length === 0 ? "complete" : "gaps_exist",
        criticalGapCount: gaps.filter(g => g.priority === "critical").length,
        validationStartedAt: new Date(),
        validationCompletedAt: new Date(),
        validationDurationMs: Date.now() - startTime
      };
      
      // 5. Persist result
      await ComplianceRun.create(run);
      runs.push(run);
    }
    
    return runs;
  }
  
  // Gap detection logic
  private findGaps(
    requirements: FrameworkRequirement[],
    project: Project,
    answers: Answer[],
    emissions: EmissionEntry[],
    dma: DMA[]
  ): Gap[] {
    const gaps: Gap[] = [];
    
    for (const req of requirements) {
      // Skip if not applicable
      if (req.materiality && !this.isMaterial(dma, req.materialityTopic)) {
        continue;
      }
      
      // Check primary data points
      let answered = false;
      for (const key of req.dataPointKeys) {
        if (this.hasDataPoint(project, answers, emissions, key)) {
          answered = true;
          break;
        }
      }
      
      // Check alternate data points
      if (!answered && req.alternateDataKeys) {
        for (const key of req.alternateDataKeys) {
          if (this.hasDataPoint(project, answers, emissions, key)) {
            answered = true;
            break;
          }
        }
      }
      
      if (!answered) {
        gaps.push({
          disclosureId: req.disclosureId,
          disclosureName: req.disclosureName,
          reason: "no_data",
          suggestedDataPoint: req.dataPointKeys[0],
          priority: req.priority
        });
      }
    }
    
    return gaps;
  }
  
  private hasDataPoint(
    project: Project,
    answers: Answer[],
    emissions: EmissionEntry[],
    key: string
  ): boolean {
    // Example logic for common data points
    switch (key) {
      case "scope1_emissions":
        return emissions.some(e => e.scope === "Scope 1" && e.value > 0);
      case "scope2_emissions":
        return emissions.some(e => e.scope === "Scope 2" && e.value > 0);
      case "revenue":
        return project.financialData?.revenue > 0;
      case "headcount":
        return project.workforce?.headcount > 0;
      default:
        // Check if answered in project questions
        return answers.some(a => a.questionId.toString().includes(key));
    }
  }
  
  private isMaterial(dma: DMA[], topicId: string): boolean {
    return dma.some(d => d.topic === topicId && d.materialityRating === "material");
  }
}
```

### DataPointResolver (Shared)

```typescript
class DataPointResolver {
  
  async resolveDataPoint(
    projectId: string,
    dataPointKey: string
  ): Promise<DataPoint> {
    // Maps abstract "scope1_emissions" → actual project data
    // Returns: { key, value, source, lastUpdated }
    
    switch (dataPointKey) {
      case "scope1_emissions":
        const s1 = await EmissionEntry.findOne({
          projectId,
          scope: "Scope 1",
          latest: true
        });
        return {
          key: "scope1_emissions",
          value: s1?.total || 0,
          source: "emission_entry",
          sourceId: s1?._id,
          lastUpdated: s1?.updatedAt
        };
      
      case "scope2_emissions":
        // Similar logic
        break;
      
      case "revenue":
        const project = await Project.findById(projectId);
        return {
          key: "revenue",
          value: project?.financialData?.revenue || 0,
          source: "project_financial_data",
          sourceId: project?._id,
          lastUpdated: project?.updatedAt
        };
      
      // ... more data points
    }
  }
}
```

---

## 5. UI/UX Design

### ComplianceDashboard Component

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Compliance Dashboard                                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Framework Selection: [IFRS S2] [GRI 305] [ESRS E1]    │
│                                                           │
│  ┌─── IFRS S2 Status ────────────────────────────────┐  │
│  │                                                    │  │
│  │  Completeness: 83% ███████░░                       │  │
│  │  35 of 42 required disclosures answered           │  │
│  │  3 critical gaps | 4 high gaps | 2 medium gaps   │  │
│  │                                                    │  │
│  │  [View Gaps] [Auto-populate Missing] [Export Report]│  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─── GRI 305 Status ─────────────────────────────────┐  │
│  │ Completeness: 100% █████████                       │  │
│  │ All emissions indicators answered                  │  │
│  │                                                    │  │
│  │ [View Details]                                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**States:**
1. **Loading** → Spinner, "Running validation..."
2. **Complete** → Green checkmark, % shown
3. **Gaps Exist** → Orange warning, gap count, drill-down
4. **Error** → Red error message, retry button

### GapReport Component

**Hierarchy:**
```
Gaps by Priority
├─ CRITICAL (Must fix before reporting) [3]
│  ├─ Scope 1 GHG emissions
│  │  └─ Suggested data: EmissionEntry.scope1Total
│  │     Action: [Link to Emissions Page]
│  └─ Scope 3 emissions (optional but recommended)
├─ HIGH (Should address) [4]
└─ MEDIUM (Nice to have) [2]
```

**Per-Gap Card:**
```
┌─────────────────────────────────────┐
│ Scope 1 GHG Emissions        [CRITICAL]│
├─────────────────────────────────────┤
│ IFRS S2 Requirement M1.1              │
│                                      │
│ Description: Company must disclose   │
│ absolute Scope 1 emissions in the    │
│ reporting period.                    │
│                                      │
│ Status: Not answered                 │
│ Suggested data: scope1_emissions     │
│                                      │
│ [Go to Emissions Page] [Dismiss]     │
└─────────────────────────────────────┘
```

### AlertBanner Component

**Placement:** Top of ProjectDetailPage

```
⚠️  COMPLIANCE ALERT
Your project has 3 critical gaps against IFRS S2.
[View Dashboard] [Auto-populate] [Dismiss]
```

---

## 6. Integration Points

### With ProjectDetailPage

When project is saved → Enqueue validation
```typescript
// In ProjectDetailPage.tsx save handler
await enqueueComplianceValidation(projectId, claimedFrameworks);
// Returns immediately with validation queued
```

### With EmissionsPage

Link missing disclosures to data entry:
```
Gap: "Scope 1 GHG emissions not found"
Action Button: [Go to Emissions Page]
```

### With DMAPage

Show materiality context:
```
"Climate change is marked MATERIAL in your DMA.
IFRS S2 requires full climate disclosure."
```

---

## 7. Reference Data Seeding

**File:** `server/lib/frameworkRequirementSeed.ts`

```typescript
export const FRAMEWORK_REQUIREMENTS_SEED = [
  {
    frameworkId: "ifrs_s2",
    frameworkName: "IFRS S2 (Climate-Related)",
    version: "2023",
    topicId: "emissions",
    topicName: "Emissions",
    disclosureId: "ifrs_s2_m1.1",
    disclosureName: "Scope 1 GHG emissions",
    dataPointKeys: ["scope1_emissions"],
    description: "...",
    guidance: "...",
    priority: "critical",
    mandatory: true
  },
  // ... 41 more for IFRS S2
  
  // GRI 305 requirements (similar structure)
  // ESRS E1 requirements
  // TCFD requirements
];
```

**Migration:** `npm run migrate:seed-framework-requirements`

---

## 8. Timeline & Deliverables

| Milestone | Date | Deliverable |
|-----------|------|-------------|
| Requirements enumeration | Wed June 12 | Framework spec document (this) |
| Schema design | Thu June 12 | Mongoose schemas approved |
| API contracts | Thu June 13 | API spec frozen |
| Service implementation spike | Fri June 14 | CompletenessService proof-of-concept |
| **Design Review** | **Fri June 14** | **All 3 teams present designs** |

**Design Review Agenda (30 min):**
1. Framework enumeration completeness (5 min)
2. Schema design sound? (5 min)
3. API contracts locked? (5 min)
4. Service layer testable? (5 min)
5. Questions & concerns (5 min)

---

## 9. Success Criteria

- ✅ All 4 frameworks (IFRS S1/S2, GRI, ESRS, TCFD) enumerated
- ✅ MongoDB schemas support future extensibility (E2-G1 in Priority 2)
- ✅ API contracts locked for backend/frontend parallelization
- ✅ CompletenessService logic testable without HTTP
- ✅ Gap detection handles materiality conditions
- ✅ Validation completes in <2 seconds for typical project

---

## Next Steps (Week 2)

**Backend Dev (Task 2):** Implement CompletenessService + routes  
**Frontend Dev (Task 3):** Build ComplianceDashboard + GapReport components  
**Both:** Lock API contracts Friday design review

---

**Design Lead Sign-Off:**

- [ ] Framework enumeration complete and accurate
- [ ] Schemas extensible to Priority 2
- [ ] API contracts final
- [ ] Design review passed
- [ ] Team ready to implement

