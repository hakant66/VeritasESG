# Task 4: Cross-Framework Consistency Checker - Design Document

**Status:** In Progress (Week 1)  
**Due:** Friday, June 14, 2026 (Design Review)  
**Owner:** Design Team B  

---

## Overview

The Cross-Framework Consistency Checker detects and reconciles contradictions when companies report under multiple frameworks (e.g., both IFRS S2 and GRI 305).

**Problem:** Same metric, different values across frameworks
- GRI 305-1 (Scope 1) = 1,000 tCO₂e
- IFRS S2 Scope 1 = 950 tCO₂e
- **Gap:** 50 tCO₂e (5% variance) — Why the difference?

**Solution:** Map equivalent indicators, flag variance, guide reconciliation.

---

## 1. Framework Equivalence Mappings

### Conceptual Map: Emissions (Most Critical)

```
IFRS S2 Scope 1
    ↕ (Should be identical)
GRI 305-1 (Direct GHG emissions)
    ↕ (Nearly identical)
TCFD Scope 1
    ↕ (Methodology differences possible)
ESRS E1-6 (Energy-intensive operations)
```

**Why Differences Occur:**
1. **Boundary Definition** — Which operations included (consolidated vs. equity stake)?
2. **Methodology** — GRI uses GHGP, IFRS allows local standards
3. **Scope of Data** — Partial year vs. full year; estimated vs. measured
4. **Recalculation Conventions** — Base year restatement rules differ
5. **Rounding** — Cumulative small rounding errors across many sources

### Detailed Mapping Table

| IFRS S2 | GRI 305 | ESRS E1 | TCFD | Variance Threshold | Common Issues |
|---------|---------|---------|------|-------------------|---|
| Scope 1 | 305-1 | E1-6 (subset) | Scope 1 | <5% | Equity stake consolidation, leased facilities |
| Scope 2 (Location-based) | 305-2 | E1-6 (subset) | Scope 2 | <3% | Electricity grid mix updates |
| Scope 2 (Market-based) | 305-2 (alt) | — | — | <5% | Green power contracts timing |
| Scope 3 Category 1 | 305-3 (subset) | — | — | <10% | Supplier data quality, tier 1 definition |
| Scope 3 Category 4 | 305-3 (subset) | — | — | <15% | Downstream transport routes unknown |
| Intensity (per revenue) | 305-4 | E1-4 | — | <8% | Revenue definition (adjusted, reported) |

---

## 2. MongoDB Schema Design

### FrameworkMapping Schema

```typescript
interface FrameworkMapping {
  _id: ObjectId;
  
  // Mapping identity
  mappingId: string;             // "emissions_scope1_all_frameworks"
  mappingName: string;           // "Scope 1 Emissions Across All Frameworks"
  
  // Equivalent indicators
  frameworks: {
    frameworkId: string;         // "ifrs_s2" | "gri_305" | "esrs_e1" | "tcfd"
    indicatorId: string;         // "ifrs_s2_m1.1" | "gri_305_1" | etc.
    indicatorName: string;       // "Scope 1 GHG Emissions"
    dataPointKey: string;        // "scope1_emissions"
  }[];
  
  // Equivalence rules
  equivalenceLevel: "exact" | "near" | "partial";
  // exact: should be identical (Scope 1 across frameworks)
  // near: should be within tolerance (Scope 2 location vs. market)
  // partial: overlapping but not identical (Scope 3 subsets)
  
  varianceThresholdPercent: number;  // 5% for Scope 1, 10% for Scope 3
  varianceReasonGuide: string[];     // Common causes of variance
  // ["Equity stake consolidation", "Leased facility scope", ...]
  
  // Reconciliation rules
  reconciliationLogic: {
    priority: string[];            // Which framework is "source of truth"
    // ["ifrs_s2", "gri_305", "tcfd"] — IFRS S2 takes priority if conflict
    fallbackLogic: "average" | "maximum" | "minimum" | "manual";
    // How to resolve if variance exceeds threshold
  };
  
  // Audit & maintenance
  createdBy: ObjectId;
  ownerId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  legacyFirebaseId?: string;
  
  // Virtual
  id: string;
}

// Indexes
db.FrameworkMapping.createIndex({ mappingId: 1 })
db.FrameworkMapping.createIndex({ "frameworks.frameworkId": 1 })
```

### ConsistencyConflict Schema

```typescript
interface ConsistencyConflict {
  _id: ObjectId;
  
  // Identity
  projectId: ObjectId;
  mappingId: string;             // Which mapping detected this conflict
  
  // Conflict details
  framework1: {
    frameworkId: string;
    indicatorId: string;
    value: number;
    unit: string;                // "tCO2e"
    source: string;              // "emission_entry" | "answer" | "calculated"
    sourceId?: ObjectId;
    lastUpdated: Date;
  };
  
  framework2: {
    frameworkId: string;
    indicatorId: string;
    value: number;
    unit: string;
    source: string;
    sourceId?: ObjectId;
    lastUpdated: Date;
  };
  
  // Analysis
  variance: {
    absoluteDifference: number;   // 50 tCO2e
    percentageDifference: number; // 5.3%
    exceedsThreshold: boolean;
  };
  
  // Likely cause(s)
  likelyCauses: {
    cause: string;
    probability: "high" | "medium" | "low";
    explanation: string;
  }[];
  
  // Reconciliation
  status: "unresolved" | "reconciled" | "exception_approved";
  resolution?: {
    selectedValue: number;
    selectedFramework: string;
    reason: string;
    resolvedBy: ObjectId;
    resolvedAt: Date;
    auditNote: string;
  };
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  legacyFirebaseId?: string;
  
  // Virtual
  id: string;
}

// Indexes
db.ConsistencyConflict.createIndex({ projectId: 1, status: 1 })
db.ConsistencyConflict.createIndex({ projectId: 1, mappingId: 1 })
db.ConsistencyConflict.createIndex({ status: 1, exceedsThreshold: 1 })
```

---

## 3. API Contract

### GET /api/compliance/framework-mappings

**Purpose:** Fetch all framework equivalence mappings.

**Query Parameters:**
```
GET /api/compliance/framework-mappings?topic=emissions
```

**Response:**
```json
{
  "success": true,
  "mappings": [
    {
      "id": "emissions_scope1",
      "mappingName": "Scope 1 Emissions",
      "equivalenceLevel": "exact",
      "varianceThresholdPercent": 5,
      "frameworks": [
        { "frameworkId": "ifrs_s2", "indicatorId": "ifrs_s2_m1.1", "indicatorName": "Scope 1" },
        { "frameworkId": "gri_305", "indicatorId": "gri_305_1", "indicatorName": "Direct GHG Emissions" },
        { "frameworkId": "tcfd", "indicatorId": "tcfd_m1", "indicatorName": "Scope 1" }
      ],
      "varianceReasonGuide": [
        "Equity stake consolidation (subsidiaries)",
        "Leased facility scope (lessee vs lessor)",
        "Excluded materials or operations"
      ],
      "reconciliationLogic": {
        "priority": ["ifrs_s2", "gri_305", "tcfd"],
        "fallbackLogic": "average"
      }
    },
    ...
  ]
}
```

---

### POST /api/compliance/check-consistency

**Purpose:** Run consistency check for a project across claimed frameworks.

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
  "checkStartedAt": "2026-06-10T14:30:00Z",
  "status": "in_progress",
  "summary": {
    "mappingsChecked": 8,
    "conflictsFound": 2,
    "conflictsUnresolved": 1,
    "conflictsReconciled": 1
  },
  "conflicts": [
    {
      "id": "conflict_001",
      "mappingName": "Scope 1 Emissions",
      "framework1": {
        "frameworkId": "ifrs_s2",
        "value": 1000,
        "unit": "tCO2e"
      },
      "framework2": {
        "frameworkId": "gri_305",
        "value": 950,
        "unit": "tCO2e"
      },
      "variance": {
        "percentageDifference": 5.3,
        "exceedsThreshold": false
      },
      "likelyCauses": [
        {
          "cause": "Equity stake consolidation",
          "probability": "medium",
          "explanation": "Subsidiary X included in IFRS but not GRI scope"
        }
      ],
      "status": "unresolved",
      "actions": [
        { "action": "view_explanation", "url": "..." },
        { "action": "mark_as_reviewed", "url": "..." },
        { "action": "resolve_manually", "url": "..." }
      ]
    },
    ...
  ]
}
```

---

### PATCH /api/compliance/conflicts/:conflictId/resolve

**Purpose:** Reconcile a conflict with user's resolution.

**Request Body:**
```json
{
  "selectedFramework": "ifrs_s2",
  "selectedValue": 1000,
  "reason": "GRI scope excludes subsidiary per contract, IFRS consolidation is correct",
  "auditNote": "Verified with finance team 2026-06-10"
}
```

**Response:**
```json
{
  "success": true,
  "conflict": {
    "id": "conflict_001",
    "status": "reconciled",
    "resolution": {
      "selectedValue": 1000,
      "selectedFramework": "ifrs_s2",
      "reason": "...",
      "resolvedBy": "user_123",
      "resolvedAt": "2026-06-10T15:00:00Z"
    }
  }
}
```

---

## 4. Service Layer Design

### ConsistencyService

```typescript
class ConsistencyService {
  
  // Main consistency check
  async checkConsistency(
    projectId: string,
    frameworkIds: string[]
  ): Promise<ConsistencyCheckResult> {
    // 1. Fetch all mappings
    const mappings = await FrameworkMapping.find();
    
    // 2. Fetch project data (answers, emissions)
    const answers = await Answer.find({ projectId });
    const emissions = await EmissionEntry.find({ projectId });
    
    // 3. For each mapping, check if all frameworks are present
    const conflicts: ConsistencyConflict[] = [];
    
    for (const mapping of mappings) {
      const relevantFrameworks = mapping.frameworks
        .map(f => f.frameworkId)
        .filter(f => frameworkIds.includes(f));
      
      // Skip if <2 frameworks claimed for this metric
      if (relevantFrameworks.length < 2) continue;
      
      // Get values for each framework
      const values = await Promise.all(
        relevantFrameworks.map(fw =>
          this.resolveDataPoint(projectId, mapping, fw, answers, emissions)
        )
      );
      
      // Compare values pairwise
      for (let i = 0; i < values.length - 1; i++) {
        for (let j = i + 1; j < values.length; j++) {
          const conflict = this.compareValues(
            mapping,
            values[i],
            values[j]
          );
          
          if (conflict && conflict.variance.exceedsThreshold) {
            const stored = await ConsistencyConflict.create(conflict);
            conflicts.push(stored);
          }
        }
      }
    }
    
    return {
      projectId,
      conflicts,
      summary: {
        mappingsChecked: mappings.length,
        conflictsFound: conflicts.length,
        conflictsUnresolved: conflicts.filter(c => c.status === "unresolved").length
      }
    };
  }
  
  private compareValues(
    mapping: FrameworkMapping,
    value1: DataPoint,
    value2: DataPoint
  ): ConsistencyConflict | null {
    const variance = {
      absoluteDifference: Math.abs(value1.value - value2.value),
      percentageDifference: (Math.abs(value1.value - value2.value) / value1.value) * 100,
      exceedsThreshold: false
    };
    
    variance.exceedsThreshold = variance.percentageDifference > mapping.varianceThresholdPercent;
    
    if (!variance.exceedsThreshold && variance.percentageDifference < mapping.varianceThresholdPercent) {
      return null; // Within tolerance
    }
    
    const likelyCauses = this.inferCauses(mapping, variance);
    
    return {
      projectId: value1.projectId,
      mappingId: mapping.mappingId,
      framework1: { ...value1, frameworkId: value1.source },
      framework2: { ...value2, frameworkId: value2.source },
      variance,
      likelyCauses,
      status: "unresolved"
    };
  }
  
  private inferCauses(
    mapping: FrameworkMapping,
    variance: any
  ): LikelyCause[] {
    const causes: LikelyCause[] = [];
    
    for (const reason of mapping.varianceReasonGuide) {
      causes.push({
        cause: reason,
        probability: this.estimateProbability(reason, variance),
        explanation: this.explainCause(reason)
      });
    }
    
    return causes.sort((a, b) => 
      this.probabilityToNumber(b.probability) - this.probabilityToNumber(a.probability)
    );
  }
  
  private estimateProbability(
    reason: string,
    variance: any
  ): "high" | "medium" | "low" {
    // Heuristic: if variance is 5%, subsidiaries/consolidation is likely
    // Could be enhanced with ML/LLM in future
    if (variance.percentageDifference < 3) return "low";
    if (variance.percentageDifference < 8) return "medium";
    return "high";
  }
  
  private explainCause(reason: string): string {
    const explanations: Record<string, string> = {
      "Equity stake consolidation": "If you have subsidiaries, IFRS S2 consolidates them differently than GRI. Check your consolidation scope.",
      "Leased facility scope": "IFRS and GRI handle leased facilities differently (lessee vs lessor). Verify your lease classification.",
      // ... more
    };
    return explanations[reason] || "";
  }
}
```

---

## 5. UI/UX Design

### ConsistencyDashboard Component

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  Consistency Check Dashboard                          │
├──────────────────────────────────────────────────────┤
│                                                        │
│  Status: ✓ Checked on 2026-06-10 at 14:30           │
│  Last 8 mappings checked | 2 conflicts found         │
│                                                        │
│  ┌─ CONFLICTS (2) ────────────────────────────────┐  │
│  │ ✓ Scope 1 Emissions (5% variance)              │  │
│  │   IFRS S2: 1,000 tCO2e vs GRI 305: 950 tCO2e   │  │
│  │   Status: Unresolved | [View] [Resolve]        │  │
│  │                                                │  │
│  │ ✓ Intensity (Revenue) (8% variance)            │  │
│  │   IFRS: 2.1 tCO2e/€M vs GRI: 1.93 tCO2e/€M    │  │
│  │   Status: Reconciled on 2026-06-09              │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  [Re-check] [Export Audit Trail] [Suspend Reporting] │
└──────────────────────────────────────────────────────┘
```

### ConflictResolutionModal

**Opened when user clicks [Resolve]:**

```
┌────────────────────────────────────────────┐
│ Resolve: Scope 1 Emissions Conflict        │
├────────────────────────────────────────────┤
│                                            │
│ IFRS S2:        1,000 tCO2e (Jun 10)       │
│ GRI 305:          950 tCO2e (Jun 9)        │
│ Difference:       50 tCO2e (5.3%)          │
│                                            │
│ ┌─ Likely Causes ──────────────────────┐  │
│ │ □ Equity stake consolidation [Info]  │  │
│ │ □ Leased facility scope [Info]       │  │
│ │ □ Excluded materials [Info]          │  │
│ └────────────────────────────────────────┘  │
│                                            │
│ Which value should we use?                │
│ ◉ IFRS S2: 1,000 tCO2e (recommended)      │
│ ○ GRI 305: 950 tCO2e                      │
│ ○ Average: 975 tCO2e                      │
│ ○ Manual: [Input box]                     │
│                                            │
│ Why? (audit note)                         │
│ ┌──────────────────────────────────────┐  │
│ │ Subsidiary X is consolidated under   │  │
│ │ IFRS S2 per equity stake >50%, but    │  │
│ │ GRI 305 excludes it per contract.     │  │
│ │                                       │  │
│ │ IFRS value is authoritative for       │  │
│ │ financial reporting.                  │  │
│ └──────────────────────────────────────┘  │
│                                            │
│        [Cancel]  [Save & Close]           │
└────────────────────────────────────────────┘
```

### Conflict Details View

**When user clicks [View] on a conflict:**

```
Scope 1 Emissions Variance Analysis
═════════════════════════════════════════════

FRAMEWORKS INVOLVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Framework: IFRS S2
  Indicator: Scope 1 GHG Emissions (M1.1)
  Value: 1,000 tCO2e
  Data Source: EmissionEntry (Jun 10, 2026)
  [View Source]

Framework: GRI 305
  Indicator: Direct GHG Emissions (305-1)
  Value: 950 tCO2e
  Data Source: Project Question #42 (Jun 9, 2026)
  [View Source]

VARIANCE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Absolute Difference:   50 tCO2e
Percentage Variance:   5.3%
Threshold:             5.0%
Status:                ⚠️ EXCEEDS THRESHOLD

LIKELY CAUSES (Ranked by Probability)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🔴 HIGH: Equity Stake Consolidation
   IFRS S2 includes subsidiaries >50% equity stake.
   GRI 305 uses operational control (may exclude).
   → Check: Do you have subsidiaries with 50-99% stake?
      [Show Org Chart]

2. 🟡 MEDIUM: Leased Facilities Boundary
   IFRS: Consolidates all leases (ASC 842).
   GRI: Uses lessee/lessor distinction.
   → Check: Do you have significant leased sites?
      [Show Sites List]

3. 🟡 MEDIUM: Data Quality / Timing
   IFRS data is 1 day fresher (Jun 10 vs Jun 9).
   → Check: Did you update emissions on Jun 10?
      [View Audit Log]

RESOLUTION OPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Resolve Now] → Opens ConflictResolutionModal
[Document Exception] → Note conflict, proceed anyway
[Request Data Audit] → Flag for Finance team review
[Suspend Both] → Pause reporting until resolved

AUDIT TRAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Conflict Detected:  2026-06-10 14:30 by system
Updated:            [View history]
```

---

## 6. Integration Points

### With ProjectDetailPage

Display conflict banner:
```typescript
// In ProjectDetailPage
const conflicts = await getUnresolvedConflicts(projectId);
if (conflicts.length > 0) {
  showBanner("⚠️ Consistency conflicts detected. All must be resolved before reporting.");
}
```

### With ComplianceDashboard

Link between features:
```
Completeness Check ──[Uses data from]──> Consistency Check
                     [Detects gaps]      [Detects conflicts]
```

### With Audit Trail

Log all resolutions to ComplianceAuditEvent:
```typescript
await ComplianceAuditService.logConflictResolution({
  projectId,
  conflictId,
  frameworkIds,
  selectedValue,
  reason,
  resolvedBy
});
```

---

## 7. Reference Data Seeding

**File:** `server/lib/frameworkMappingSeed.ts`

```typescript
export const FRAMEWORK_MAPPING_SEED = [
  {
    mappingId: "emissions_scope1",
    mappingName: "Scope 1 GHG Emissions",
    equivalenceLevel: "exact",
    frameworks: [
      { frameworkId: "ifrs_s2", indicatorId: "ifrs_s2_m1.1", dataPointKey: "scope1_emissions" },
      { frameworkId: "gri_305", indicatorId: "gri_305_1", dataPointKey: "scope1_emissions" },
      { frameworkId: "tcfd", indicatorId: "tcfd_m1", dataPointKey: "scope1_emissions" }
    ],
    varianceThresholdPercent: 5,
    varianceReasonGuide: [
      "Equity stake consolidation",
      "Leased facility scope",
      "Data quality / timing differences"
    ],
    reconciliationLogic: {
      priority: ["ifrs_s2", "gri_305", "tcfd"],
      fallbackLogic: "average"
    }
  },
  // ... Scope 2, Scope 3, Intensity, etc.
];
```

---

## 8. Timeline & Deliverables

| Milestone | Date | Deliverable |
|-----------|------|-------------|
| Mappings enumeration | Wed June 12 | Equivalence matrix (all frameworks) |
| Schema design | Thu June 12 | Mongoose schemas approved |
| API contracts | Thu June 13 | API spec frozen |
| Variance detection logic | Fri June 14 | Service layer POC |
| **Design Review** | **Fri June 14** | **Design Team B presents** |

---

## 9. Success Criteria

- ✅ 100% of equivalent indicators mapped (Scope 1, 2, 3, intensity)
- ✅ Variance thresholds realistic and validated
- ✅ Likely-cause inference logic testable
- ✅ Conflict resolution audit trail immutable
- ✅ False positive rate <5% in testing
- ✅ Consistency check completes in <2 seconds

---

## Next Steps (Week 2)

**Backend Dev (Task 5):** Implement ConsistencyService + routes  
**Frontend Dev (Task 6):** Build ConsistencyDashboard + ConflictResolutionModal  
**Both:** Lock API contracts Friday design review

---

**Design Lead Sign-Off:**

- [ ] Mappings complete and accurate
- [ ] Variance thresholds validated
- [ ] API contracts final
- [ ] Design review passed
- [ ] Team ready to implement

