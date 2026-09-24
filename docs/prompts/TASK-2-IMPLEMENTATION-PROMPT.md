# Task 2: Framework Validator Backend - Implementation Prompt

**Task ID:** Task 2  
**Duration:** 2 weeks (10 days effort)  
**Status:** Ready for implementation (Week 2, starts June 17)  
**Owner:** Backend Developer  
**Dependency:** Task 1 design completed ✓ (APIs frozen Friday June 14)  

---

## 🎯 Mission

Implement the complete backend for the Framework Completeness Validator feature. This includes:
1. MongoDB schemas (FrameworkRequirement, ComplianceRun)
2. Seed data for 4 frameworks (IFRS S1/S2, GRI, ESRS, TCFD)
3. Service layer (CompletenessService, DataPointResolver)
4. Express routes (/api/compliance/*)
5. Integration with existing systems (ProjectDetailPage save flow)

**Definition of Done:** All endpoints working end-to-end, passing integration tests, <2s validation time on typical project.

---

## 📁 File Structure

Create these files in this order:

```
server/
├── models/
│   └── index.ts                          [MODIFY] Add FrameworkRequirement, ComplianceRun schemas
├── services/
│   └── compliance/
│       ├── CompletenessService.ts        [NEW]
│       ├── DataPointResolver.ts          [NEW]
│       ├── FrameworkRegistry.ts          [NEW]
│       └── index.ts                      [NEW] Export all services
├── lib/
│   ├── frameworkRequirementSeed.ts       [NEW] Seed data
│   ├── completenessValidation.ts         [NEW] Helper functions
│   └── ComplianceAuditService.ts         [NEW] Audit logging
├── routes/
│   └── complianceRoute.ts                [NEW] Express routes
└── migrations/
    └── seedFrameworkRequirements.ts      [NEW] Migration script

src/
└── lib/
    ├── complianceApi.ts                  [NEW] Frontend API client
    └── complianceTypes.ts                [NEW] TypeScript types (shared)
```

---

## 🏗️ Implementation Steps (Week 2-3)

### WEEK 2: Core Services & Data Models

#### Step 1: Create MongoDB Schemas (Monday June 17)

**File:** `server/models/index.ts` (MODIFY existing file)

Add to the existing models file:

```typescript
// ============================================================================
// COMPLIANCE & FRAMEWORK MODELS
// ============================================================================

// 1. FrameworkRequirement Schema
const FrameworkRequirementSchema = new mongoose.Schema(
  {
    // Framework identity
    frameworkId: {
      type: String,
      required: true,
      enum: ["ifrs_s2", "ifrs_s1", "gri_305", "gri_308", "gri_306", "esrs_e1", "tcfd"],
      index: true
    },
    frameworkName: {
      type: String,
      required: true
      // e.g., "IFRS S2 (Climate-Related)"
    },
    version: {
      type: String,
      default: "2023"
      // e.g., "2023", "2024"
    },

    // Requirement details
    topicId: {
      type: String,
      required: true,
      index: true
      // e.g., "climate_governance", "emissions_scope1", "water"
    },
    topicName: {
      type: String,
      required: true
      // e.g., "Climate Governance", "Scope 1 Emissions"
    },
    disclosureId: {
      type: String,
      required: true,
      unique: true
      // e.g., "ifrs_s2_g1.1", "gri_305_1", "esrs_e1_6"
    },
    disclosureName: {
      type: String,
      required: true
      // e.g., "Board climate governance", "Direct GHG emissions"
    },

    // Data mapping
    dataPointKeys: [
      {
        type: String,
        required: true
      }
    ],
    // e.g., ["scope1_emissions", "ghg_protocol_s1"]
    // Maps to DataPointResolver keys

    alternateDataKeys: [String],
    // Fallback keys if primary data not available

    // Requirement context
    description: {
      type: String,
      required: true
      // Full disclosure requirement text from standard
    },
    guidance: {
      type: String,
      // Explanation of what's needed, how to provide it
    },

    // Applicability rules
    materiality: {
      type: Boolean,
      default: false
      // Is this required only if material?
    },
    materialityTopic: String,
    // "climate_change", "water_scarcity", etc. - DMA topic ID
    
    conditions: [String],
    // ["has_supply_chain", "revenue_>_1b"]
    // Only required if conditions met

    // Severity & priority
    priority: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "high"
    },
    mandatory: {
      type: Boolean,
      default: true
      // Must be disclosed if framework claimed
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser"
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser"
    },
    legacyFirebaseId: String
  },
  {
    timestamps: true,
    collection: "framework_requirements"
  }
);

// Add virtual id getter (for frontend compatibility)
FrameworkRequirementSchema.virtual("id").get(function () {
  return this._id.toString();
});

// Indexes
FrameworkRequirementSchema.index({ frameworkId: 1, mandatory: 1 });
FrameworkRequirementSchema.index({ topicId: 1 });
FrameworkRequirementSchema.index({ dataPointKeys: 1 });

// 2. ComplianceRun Schema
const ComplianceRunSchema = new mongoose.Schema(
  {
    // Identity
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    frameworkId: {
      type: String,
      required: true,
      enum: ["ifrs_s2", "ifrs_s1", "gri_305", "gri_308", "gri_306", "esrs_e1", "tcfd"]
    },

    // Results
    totalRequirements: {
      type: Number,
      required: true
      // 42 disclosures for IFRS S2
    },
    answeredRequirements: {
      type: Number,
      required: true
      // 35 answered
    },
    completionPercentage: {
      type: Number,
      required: true
      // 83%
    },

    // Gaps (what's missing)
    gaps: [
      {
        disclosureId: String,
        disclosureName: String,
        reason: {
          type: String,
          enum: ["no_data", "insufficient_data", "no_answer", "not_applicable"]
        },
        suggestedDataPoint: String,
        priority: String
      }
    ],

    // Summary
    status: {
      type: String,
      enum: ["complete", "in_progress", "gaps_exist"],
      default: "in_progress"
    },
    criticalGapCount: {
      type: Number,
      default: 0
    },

    // Performance & audit
    validationStartedAt: Date,
    validationCompletedAt: Date,
    validationDurationMs: Number,

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser"
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser"
    },
    legacyFirebaseId: String
  },
  {
    timestamps: true,
    collection: "compliance_runs"
  }
);

ComplianceRunSchema.virtual("id").get(function () {
  return this._id.toString();
});

// Indexes (critical for performance)
ComplianceRunSchema.index({ projectId: 1, frameworkId: 1 });
ComplianceRunSchema.index({ projectId: 1, createdAt: -1 });
ComplianceRunSchema.index({ status: 1 });

// Register models
const FrameworkRequirement = getOrCreateModel(
  "FrameworkRequirement",
  FrameworkRequirementSchema
);
const ComplianceRun = getOrCreateModel("ComplianceRun", ComplianceRunSchema);

// Export at end of file with other models
export { FrameworkRequirement, ComplianceRun, /* ... other models ... */ };
```

---

#### Step 2: Create DataPointResolver Service (Monday-Tuesday June 17-18)

**File:** `server/services/compliance/DataPointResolver.ts`

```typescript
import { Document } from "mongoose";

export interface DataPoint {
  key: string;
  value: number | string | boolean;
  source: string; // "emission_entry" | "answer" | "calculated" | "project"
  sourceId?: string;
  lastUpdated: Date;
}

/**
 * DataPointResolver normalizes data from multiple sources.
 * This is the single source of truth for all data points used by
 * CompletenessService, ConsistencyService, and ScenarioService.
 *
 * Pattern: Abstract away the complexity of fetching from different
 * collections so services only need to ask for a data point by key.
 */
export class DataPointResolver {
  constructor(
    private projectId: string,
    private project: Document,
    private answers: Document[],
    private emissions: Document[],
    private dma: Document[]
  ) {}

  /**
   * Resolve a single data point by key.
   * Returns null if not found.
   */
  async resolve(key: string): Promise<DataPoint | null> {
    switch (key) {
      // ============================================
      // EMISSIONS DATA POINTS (GHG Protocol)
      // ============================================
      case "scope1_emissions":
        return this.resolveScope1Emissions();
      case "scope2_emissions":
        return this.resolveScope2Emissions();
      case "scope3_emissions":
        return this.resolveScope3Emissions();
      case "total_emissions":
        return this.resolveTotalEmissions();
      case "emissions_intensity":
        return this.resolveEmissionsIntensity();

      // ============================================
      // FINANCIAL DATA POINTS
      // ============================================
      case "revenue":
        return this.resolveRevenue();
      case "operating_expense":
        return this.resolveOperatingExpense();

      // ============================================
      // WORKFORCE DATA POINTS
      // ============================================
      case "headcount":
        return this.resolveHeadcount();
      case "employee_turnover_rate":
        return this.resolveEmployeeTurnoverRate();

      // ============================================
      // GOVERNANCE DATA POINTS
      // ============================================
      case "board_size":
        return this.resolveBoardSize();
      case "board_climate_committee":
        return this.resolveBoardClimateCommittee();

      default:
        // Try to find in project answers
        return this.resolveFromAnswers(key);
    }
  }

  private resolveScope1Emissions(): DataPoint | null {
    const emission = this.emissions.find(
      (e) => e.scope === "Scope 1" && e.latest === true
    );
    if (!emission) return null;

    return {
      key: "scope1_emissions",
      value: emission.total || 0,
      source: "emission_entry",
      sourceId: emission._id?.toString(),
      lastUpdated: emission.updatedAt || new Date()
    };
  }

  private resolveScope2Emissions(): DataPoint | null {
    const emission = this.emissions.find(
      (e) => e.scope === "Scope 2" && e.latest === true
    );
    if (!emission) return null;

    return {
      key: "scope2_emissions",
      value: emission.total || 0,
      source: "emission_entry",
      sourceId: emission._id?.toString(),
      lastUpdated: emission.updatedAt || new Date()
    };
  }

  private resolveScope3Emissions(): DataPoint | null {
    const emission = this.emissions.find(
      (e) => e.scope === "Scope 3" && e.latest === true
    );
    if (!emission) return null;

    return {
      key: "scope3_emissions",
      value: emission.total || 0,
      source: "emission_entry",
      sourceId: emission._id?.toString(),
      lastUpdated: emission.updatedAt || new Date()
    };
  }

  private resolveTotalEmissions(): DataPoint | null {
    const s1 = this.resolveScope1Emissions();
    const s2 = this.resolveScope2Emissions();
    const s3 = this.resolveScope3Emissions();

    const total = (s1?.value || 0) + (s2?.value || 0) + (s3?.value || 0);

    if (total === 0) return null;

    return {
      key: "total_emissions",
      value: total,
      source: "calculated",
      lastUpdated: new Date()
    };
  }

  private resolveEmissionsIntensity(): DataPoint | null {
    const total = this.resolveTotalEmissions();
    const revenue = this.resolveRevenue();

    if (!total || !revenue || revenue.value === 0) return null;

    return {
      key: "emissions_intensity",
      value: (total.value / (revenue.value as number)),
      source: "calculated",
      lastUpdated: new Date()
    };
  }

  private resolveRevenue(): DataPoint | null {
    if (!this.project?.financialData?.revenue) return null;

    return {
      key: "revenue",
      value: this.project.financialData.revenue,
      source: "project_financial_data",
      sourceId: this.project._id?.toString(),
      lastUpdated: this.project.updatedAt || new Date()
    };
  }

  private resolveOperatingExpense(): DataPoint | null {
    if (!this.project?.financialData?.operatingExpense) return null;

    return {
      key: "operating_expense",
      value: this.project.financialData.operatingExpense,
      source: "project_financial_data",
      sourceId: this.project._id?.toString(),
      lastUpdated: this.project.updatedAt || new Date()
    };
  }

  private resolveHeadcount(): DataPoint | null {
    if (!this.project?.workforce?.headcount) return null;

    return {
      key: "headcount",
      value: this.project.workforce.headcount,
      source: "project_workforce_data",
      sourceId: this.project._id?.toString(),
      lastUpdated: this.project.updatedAt || new Date()
    };
  }

  private resolveEmployeeTurnoverRate(): DataPoint | null {
    if (!this.project?.workforce?.turnoverRate) return null;

    return {
      key: "employee_turnover_rate",
      value: this.project.workforce.turnoverRate,
      source: "project_workforce_data",
      sourceId: this.project._id?.toString(),
      lastUpdated: this.project.updatedAt || new Date()
    };
  }

  private resolveBoardSize(): DataPoint | null {
    const answer = this.answers.find((a) =>
      a.questionId?.toString().includes("board_size")
    );
    if (!answer?.value) return null;

    return {
      key: "board_size",
      value: parseInt(answer.value as string),
      source: "answer",
      sourceId: answer._id?.toString(),
      lastUpdated: answer.updatedAt || new Date()
    };
  }

  private resolveBoardClimateCommittee(): DataPoint | null {
    const answer = this.answers.find((a) =>
      a.questionId?.toString().includes("board_climate")
    );
    if (!answer?.value) return null;

    return {
      key: "board_climate_committee",
      value: answer.value === "yes" || answer.value === true,
      source: "answer",
      sourceId: answer._id?.toString(),
      lastUpdated: answer.updatedAt || new Date()
    };
  }

  private resolveFromAnswers(key: string): DataPoint | null {
    const answer = this.answers.find((a) =>
      a.questionId?.toString().includes(key)
    );
    if (!answer?.value) return null;

    return {
      key,
      value: answer.value,
      source: "answer",
      sourceId: answer._id?.toString(),
      lastUpdated: answer.updatedAt || new Date()
    };
  }

  /**
   * Check if a specific data point exists (non-null and non-empty)
   */
  async hasDataPoint(key: string): Promise<boolean> {
    const point = await this.resolve(key);
    if (!point) return false;

    // Empty values don't count
    if (typeof point.value === "number" && point.value <= 0) return false;
    if (typeof point.value === "string" && point.value.trim() === "") return false;
    if (typeof point.value === "boolean" && !point.value) return false;

    return true;
  }

  /**
   * Batch resolve multiple data points (more efficient)
   */
  async resolveMany(keys: string[]): Promise<Map<string, DataPoint | null>> {
    const results = new Map<string, DataPoint | null>();
    for (const key of keys) {
      results.set(key, await this.resolve(key));
    }
    return results;
  }
}
```

---

#### Step 3: Create FrameworkRegistry Service (Tuesday June 18)

**File:** `server/services/compliance/FrameworkRegistry.ts`

```typescript
import { FrameworkRequirement } from "../../models";

/**
 * FrameworkRegistry provides cached access to framework requirements.
 * Caches in memory to avoid repeated database queries.
 *
 * Why: CompletenessService may call this many times per validation run.
 * Caching makes it fast.
 */
export class FrameworkRegistry {
  private cache: Map<string, FrameworkRequirement[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all requirements for a framework
   */
  async getFrameworkRequirements(
    frameworkId: string,
    includeOptional: boolean = false
  ): Promise<FrameworkRequirement[]> {
    // Check cache
    const cacheKey = `${frameworkId}_${includeOptional}`;
    if (this.cache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (Date.now() < expiry) {
        return this.cache.get(cacheKey)!;
      }
    }

    // Fetch from database
    const requirements = await FrameworkRequirement.find({
      frameworkId,
      mandatory: includeOptional ? { $in: [true, false] } : true
    });

    // Update cache
    this.cache.set(cacheKey, requirements);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL_MS);

    return requirements;
  }

  /**
   * Get specific requirement by disclosure ID
   */
  async getRequirement(disclosureId: string): Promise<FrameworkRequirement | null> {
    return FrameworkRequirement.findOne({ disclosureId });
  }

  /**
   * Get requirements by topic (e.g., all "emissions" requirements)
   */
  async getRequirementsByTopic(
    frameworkId: string,
    topicId: string
  ): Promise<FrameworkRequirement[]> {
    return FrameworkRequirement.find({ frameworkId, topicId });
  }

  /**
   * Clear cache (call after seeding new frameworks)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
```

---

#### Step 4: Create CompletenessService (Tuesday-Wednesday June 18-19)

**File:** `server/services/compliance/CompletenessService.ts`

```typescript
import { Document } from "mongoose";
import { Project, Answer, EmissionEntry, DMA, ComplianceRun } from "../../models";
import { DataPointResolver } from "./DataPointResolver";
import { FrameworkRegistry } from "./FrameworkRegistry";

export interface Gap {
  disclosureId: string;
  disclosureName: string;
  reason: "no_data" | "insufficient_data" | "not_applicable";
  suggestedDataPoint?: string;
  priority: "critical" | "high" | "medium" | "low";
}

/**
 * CompletenessService validates that a project answers all required
 * disclosures for claimed frameworks.
 *
 * Main flow:
 * 1. Load project data (answers, emissions, DMA, financials)
 * 2. For each framework, load requirements
 * 3. For each requirement, check if data point exists
 * 4. Calculate completion % and gaps
 * 5. Persist results to ComplianceRun
 */
export class CompletenessService {
  constructor(
    private registry: FrameworkRegistry
  ) {}

  /**
   * Validate completeness for a project against claimed frameworks.
   * Async: enqueues computation, returns immediately.
   */
  async validateCompleteness(
    projectId: string,
    frameworkIds: string[],
    userId: string
  ): Promise<{ jobId: string; status: "queued" }> {
    // Enqueue for background processing
    // (This keeps <2s response time)
    process.nextTick(() => {
      this.runValidation(projectId, frameworkIds, userId);
    });

    return { jobId: projectId, status: "queued" };
  }

  /**
   * Internal: Actually run the validation (in background)
   */
  private async runValidation(
    projectId: string,
    frameworkIds: string[],
    userId: string
  ): Promise<void> {
    try {
      const startTime = Date.now();

      // 1. Fetch project data
      const project = await Project.findById(projectId);
      if (!project) throw new Error(`Project ${projectId} not found`);

      const answers = await Answer.find({ projectId }).lean();
      const emissions = await EmissionEntry.find({ projectId }).lean();
      const dma = await DMA.find({ projectId }).lean();

      // 2. Create DataPointResolver
      const resolver = new DataPointResolver(
        projectId,
        project,
        answers,
        emissions,
        dma
      );

      // 3. For each framework, validate
      const runs: Document[] = [];
      for (const frameworkId of frameworkIds) {
        const run = await this.validateFramework(
          projectId,
          frameworkId,
          resolver,
          userId,
          startTime
        );
        runs.push(run);
      }

      // 4. Done
      console.log(
        `Completeness validation finished for project ${projectId} in ${Date.now() - startTime}ms`
      );
    } catch (error) {
      console.error(
        `Completeness validation failed for project ${projectId}:`,
        error
      );
      // Could log to ComplianceAuditEvent for debugging
    }
  }

  /**
   * Validate a single framework
   */
  private async validateFramework(
    projectId: string,
    frameworkId: string,
    resolver: DataPointResolver,
    userId: string,
    startTime: number
  ): Promise<Document> {
    // Load requirements for this framework
    const requirements = await this.registry.getFrameworkRequirements(
      frameworkId,
      false // mandatory only
    );

    // Check each requirement
    const gaps: Gap[] = [];
    let answeredCount = 0;

    for (const req of requirements) {
      // Skip if not applicable
      if (req.materiality && !this.isMaterial(projectId)) {
        continue;
      }

      // Check if data point exists
      let answered = false;
      if (req.dataPointKeys && req.dataPointKeys.length > 0) {
        for (const key of req.dataPointKeys) {
          const hasData = await resolver.hasDataPoint(key);
          if (hasData) {
            answered = true;
            break;
          }
        }
      }

      // Check alternate data points
      if (!answered && req.alternateDataKeys) {
        for (const key of req.alternateDataKeys) {
          const hasData = await resolver.hasDataPoint(key);
          if (hasData) {
            answered = true;
            break;
          }
        }
      }

      if (answered) {
        answeredCount++;
      } else {
        gaps.push({
          disclosureId: req.disclosureId,
          disclosureName: req.disclosureName,
          reason: "no_data",
          suggestedDataPoint: req.dataPointKeys?.[0],
          priority: req.priority
        });
      }
    }

    // Calculate metrics
    const totalRequirements = requirements.length;
    const completionPercentage = (answeredCount / totalRequirements) * 100;
    const status =
      gaps.length === 0 ? "complete" : gaps.length > 0 ? "gaps_exist" : "in_progress";
    const criticalGapCount = gaps.filter((g) => g.priority === "critical").length;

    // Persist result
    const run = await ComplianceRun.create({
      projectId,
      frameworkId,
      totalRequirements,
      answeredRequirements: answeredCount,
      completionPercentage,
      gaps,
      status,
      criticalGapCount,
      validationStartedAt: new Date(startTime),
      validationCompletedAt: new Date(),
      validationDurationMs: Date.now() - startTime,
      createdBy: userId,
      ownerId: userId
    });

    return run;
  }

  /**
   * Helper: Check if topic is material in DMA
   */
  private isMaterial(projectId: string): boolean {
    // For now, assume all frameworks are material
    // In Priority 2, this will check DMA.materialityRating
    return true;
  }

  /**
   * Get stored validation results for a project
   */
  async getComplianceRun(
    projectId: string,
    frameworkId: string
  ): Promise<Document | null> {
    return ComplianceRun.findOne({
      projectId,
      frameworkId,
      // Get most recent
    }).sort({ createdAt: -1 });
  }

  /**
   * Get all validation runs for a project (across frameworks)
   */
  async getComplianceRuns(projectId: string): Promise<Document[]> {
    return ComplianceRun.find({ projectId }).sort({ createdAt: -1 });
  }
}
```

---

#### Step 5: Create Service Index & Exports (Wednesday June 19)

**File:** `server/services/compliance/index.ts`

```typescript
export { CompletenessService } from "./CompletenessService";
export { DataPointResolver } from "./DataPointResolver";
export { FrameworkRegistry } from "./FrameworkRegistry";
```

---

### WEEK 3: Routes, Seeding, Integration

#### Step 6: Create Framework Requirement Seed Data (Wednesday June 19)

**File:** `server/lib/frameworkRequirementSeed.ts`

```typescript
/**
 * Seed data for all frameworks.
 * Run once during app startup or via migration.
 */

export const FRAMEWORK_REQUIREMENTS_SEED = [
  // ============================================
  // IFRS S2 REQUIREMENTS (42 total for MVP)
  // ============================================
  {
    frameworkId: "ifrs_s2",
    frameworkName: "IFRS S2 (Climate-Related)",
    version: "2023",
    topicId: "governance",
    topicName: "Governance",
    disclosureId: "ifrs_s2_g1_1",
    disclosureName: "Board oversight of climate-related risks and opportunities",
    dataPointKeys: ["board_climate_committee"],
    description:
      "Describe board-level governance structure for overseeing climate-related risks and opportunities.",
    guidance:
      "Provide details of board committee responsibilities, committee composition, " +
      "how the board is informed, frequency of discussions, etc.",
    materiality: false,
    priority: "critical",
    mandatory: true
  },

  {
    frameworkId: "ifrs_s2",
    frameworkName: "IFRS S2 (Climate-Related)",
    version: "2023",
    topicId: "governance",
    topicName: "Governance",
    disclosureId: "ifrs_s2_g1_2",
    disclosureName: "Management-level governance structure",
    dataPointKeys: ["governance_structure"],
    description: "Describe the management-level roles and responsibilities for climate matters.",
    guidance: "Explain which executive has responsibility, reporting lines, compensation links, etc.",
    materiality: false,
    priority: "high",
    mandatory: true
  },

  {
    frameworkId: "ifrs_s2",
    frameworkName: "IFRS S2 (Climate-Related)",
    version: "2023",
    topicId: "strategy",
    topicName: "Strategy",
    disclosureId: "ifrs_s2_s1_1",
    disclosureName: "Climate-related risks and opportunities identified",
    dataPointKeys: [],
    // Will be answered in custom questions
    description:
      "Describe climate-related risks and opportunities identified over the short, medium, and long term.",
    guidance: "Consider transition risks (policy, technology, market, reputational) and physical risks.",
    materiality: false,
    priority: "critical",
    mandatory: true
  },

  {
    frameworkId: "ifrs_s2",
    frameworkName: "IFRS S2 (Climate-Related)",
    version: "2023",
    topicId: "emissions",
    topicName: "Emissions",
    disclosureId: "ifrs_s2_m1_1",
    disclosureName: "Scope 1 GHG emissions",
    dataPointKeys: ["scope1_emissions"],
    description: "Disclose absolute Scope 1 GHG emissions (tCO2e) for the reporting period.",
    guidance: "Use GHG Protocol or local standard. Include all direct emissions from operations.",
    materiality: false,
    priority: "critical",
    mandatory: true
  },

  {
    frameworkId: "ifrs_s2",
    frameworkName: "IFRS S2 (Climate-Related)",
    version: "2023",
    topicId: "emissions",
    topicName: "Emissions",
    disclosureId: "ifrs_s2_m1_2",
    disclosureName: "Scope 2 GHG emissions",
    dataPointKeys: ["scope2_emissions"],
    description: "Disclose absolute Scope 2 GHG emissions (tCO2e) for the reporting period.",
    guidance:
      "Include both location-based and market-based if applicable. " +
      "Scope 2 = indirect emissions from purchased electricity, steam, etc.",
    materiality: false,
    priority: "critical",
    mandatory: true
  },

  {
    frameworkId: "ifrs_s2",
    frameworkName: "IFRS S2 (Climate-Related)",
    version: "2023",
    topicId: "emissions",
    topicName: "Emissions",
    disclosureId: "ifrs_s2_m1_3",
    disclosureName: "Emissions intensity",
    dataPointKeys: ["emissions_intensity"],
    description: "Disclose GHG emissions intensity (emissions per unit of revenue or production).",
    guidance: "Normalize by revenue, production volume, or other relevant unit.",
    materiality: false,
    priority: "high",
    mandatory: true
  },

  // ... Add ~36 more requirements for IFRS S2 ...
  // Template for adding more:
  // {
  //   frameworkId: "ifrs_s2",
  //   topicId: "...",
  //   disclosureId: "ifrs_s2_...",
  //   disclosureName: "...",
  //   dataPointKeys: [...],
  //   description: "...",
  //   priority: "...",
  //   mandatory: true
  // },

  // ============================================
  // GRI 305 REQUIREMENTS (Emissions)
  // ============================================
  {
    frameworkId: "gri_305",
    frameworkName: "GRI 305 (Emissions)",
    version: "2023",
    topicId: "emissions",
    topicName: "Emissions",
    disclosureId: "gri_305_1",
    disclosureName: "Direct (Scope 1) GHG emissions",
    dataPointKeys: ["scope1_emissions"],
    description: "Report direct GHG emissions from owned or controlled sources.",
    guidance: "Must use GHG Protocol Scope 1 definition. Report in metric tCO2e.",
    materiality: true,
    materialityTopic: "emissions",
    priority: "critical",
    mandatory: true
  },

  {
    frameworkId: "gri_305",
    frameworkName: "GRI 305 (Emissions)",
    version: "2023",
    topicId: "emissions",
    topicName: "Emissions",
    disclosureId: "gri_305_2",
    disclosureName: "Scope 2 GHG emissions",
    dataPointKeys: ["scope2_emissions"],
    description: "Report indirect GHG emissions from purchased electricity, steam, heating, cooling.",
    guidance: "Report both location-based and market-based. Use GHG Protocol Scope 2 definition.",
    materiality: true,
    materialityTopic: "emissions",
    priority: "critical",
    mandatory: true
  },

  // ... Add ~8 more for GRI 305 ...

  // ============================================
  // ESRS E1 REQUIREMENTS
  // ============================================
  {
    frameworkId: "esrs_e1",
    frameworkName: "ESRS E1 (Climate Change)",
    version: "2023",
    topicId: "climate_mitigation",
    topicName: "Climate Mitigation",
    disclosureId: "esrs_e1_1",
    disclosureName: "GHG emissions (Scope 1, 2, 3)",
    dataPointKeys: ["scope1_emissions", "scope2_emissions", "scope3_emissions"],
    description:
      "Report GHG emissions by scope following GHG Protocol. " +
      "Scope 1 + 2 required; Scope 3 if material.",
    guidance: "Report absolute emissions and intensity. Include base year and targets.",
    materiality: false,
    priority: "critical",
    mandatory: true
  },

  // ... Add ~10 more for ESRS E1 ...

  // ============================================
  // TCFD RECOMMENDATIONS
  // ============================================
  {
    frameworkId: "tcfd",
    frameworkName: "TCFD (Climate-Related Financial Disclosures)",
    version: "2023",
    topicId: "governance",
    topicName: "Governance",
    disclosureId: "tcfd_g1",
    disclosureName: "Board oversight of climate issues",
    dataPointKeys: ["board_climate_committee"],
    description: "Describe board-level governance of climate-related risks and opportunities.",
    guidance: "Explain how governance structure oversees and manages climate issues.",
    materiality: false,
    priority: "high",
    mandatory: true
  }

  // ... Add more TCFD requirements ...
];

// Helper: Import and seed in startup or migration
export async function seedFrameworkRequirements(
  FrameworkRequirement: any
): Promise<void> {
  for (const req of FRAMEWORK_REQUIREMENTS_SEED) {
    // Upsert: Update if exists, create if not
    await FrameworkRequirement.findOneAndUpdate(
      { disclosureId: req.disclosureId },
      req,
      { upsert: true, new: true }
    );
  }
  console.log(`Seeded ${FRAMEWORK_REQUIREMENTS_SEED.length} framework requirements`);
}
```

**Note:** The seed data above is a template. For production, expand with ALL requirements from each framework. Reference:
- IFRS S2: https://www.ifrs.org (42+ requirements)
- GRI 305: https://www.globalreporting.initiative.org (10+ indicators)
- ESRS E1: https://ec.europa.eu/sustainable-finance (12+ requirements)
- TCFD: https://www.fsb-tcfd.org (23+ recommendations)

---

#### Step 7: Create Express Routes (Thursday June 20)

**File:** `server/routes/complianceRoute.ts`

```typescript
import { Router, Request, Response } from "express";
import { resolvePlatformUserFromRequest } from "../lib/requestAuth";
import { FrameworkRequirement, Project, Answer, EmissionEntry, DMA } from "../models";
import { CompletenessService, FrameworkRegistry } from "../services/compliance";

const router = Router();

// ============================================
// GET /api/compliance/framework-requirements
// ============================================
/**
 * Fetch all framework requirements for a given framework.
 * Used by frontend to display what's needed.
 */
router.get("/framework-requirements", async (req: Request, res: Response) => {
  try {
    const { frameworkId, includeOptional } = req.query;

    if (!frameworkId || typeof frameworkId !== "string") {
      return res.status(400).json({
        success: false,
        error: "frameworkId query parameter required"
      });
    }

    const registry = new FrameworkRegistry();
    const requirements = await registry.getFrameworkRequirements(
      frameworkId,
      includeOptional === "true"
    );

    if (requirements.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No requirements found for framework: ${frameworkId}`
      });
    }

    res.json({
      success: true,
      frameworkId,
      frameworkName: requirements[0]?.frameworkName || frameworkId,
      totalCount: requirements.length,
      requirements: requirements.map((req) => ({
        id: req.id,
        topicId: req.topicId,
        topicName: req.topicName,
        disclosureId: req.disclosureId,
        disclosureName: req.disclosureName,
        dataPointKeys: req.dataPointKeys,
        description: req.description,
        guidance: req.guidance,
        priority: req.priority,
        mandatory: req.mandatory
      }))
    });
  } catch (error) {
    console.error("Error fetching framework requirements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch framework requirements"
    });
  }
});

// ============================================
// POST /api/compliance/validate-completeness
// ============================================
/**
 * Enqueue completeness validation for a project.
 * Returns immediately (async validation).
 */
router.post("/validate-completeness", async (req: Request, res: Response) => {
  try {
    const user = await resolvePlatformUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { projectId, frameworkIds } = req.body;

    if (!projectId || !frameworkIds || !Array.isArray(frameworkIds)) {
      return res.status(400).json({
        success: false,
        error: "projectId and frameworkIds[] required"
      });
    }

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found"
      });
    }

    // Enqueue validation (returns immediately, runs async)
    const registry = new FrameworkRegistry();
    const service = new CompletenessService(registry);

    const result = await service.validateCompleteness(
      projectId,
      frameworkIds,
      user._id?.toString()
    );

    res.json({
      success: true,
      projectId,
      status: result.status,
      message: "Validation enqueued. Results will be available shortly."
    });
  } catch (error) {
    console.error("Error validating completeness:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate completeness"
    });
  }
});

// ============================================
// GET /api/compliance/completeness/:projectId/:frameworkId
// ============================================
/**
 * Fetch stored validation results for a project framework.
 */
router.get("/completeness/:projectId/:frameworkId", async (req: Request, res: Response) => {
  try {
    const { projectId, frameworkId } = req.params;

    const registry = new FrameworkRegistry();
    const service = new CompletenessService(registry);

    const run = await service.getComplianceRun(projectId, frameworkId);

    if (!run) {
      return res.status(404).json({
        success: false,
        error: "No validation results found. Run validation first."
      });
    }

    res.json({
      success: true,
      complianceRun: {
        id: run.id,
        projectId: run.projectId,
        frameworkId: run.frameworkId,
        totalRequirements: run.totalRequirements,
        answeredRequirements: run.answeredRequirements,
        completionPercentage: run.completionPercentage,
        status: run.status,
        criticalGapCount: run.criticalGapCount,
        gaps: run.gaps,
        validationCompletedAt: run.validationCompletedAt,
        validationDurationMs: run.validationDurationMs
      }
    });
  } catch (error) {
    console.error("Error fetching compliance results:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch compliance results"
    });
  }
});

export default router;
```

---

#### Step 8: Register Routes in Server (Thursday June 20)

**File:** `server.ts` (MODIFY existing file)

```typescript
// Add after other route registrations:

import complianceRoute from "./routes/complianceRoute";

// ... existing code ...

// Register compliance routes
app.use("/api/compliance", complianceRoute);

// ... rest of middleware ...
```

---

#### Step 9: Seed Framework Data on Startup (Thursday June 20)

**File:** `server.ts` (MODIFY)

```typescript
import { seedFrameworkRequirements } from "./lib/frameworkRequirementSeed";
import { FrameworkRequirement } from "./models";

// Add to your app startup after DB connects:

async function seedData() {
  try {
    console.log("Checking if framework requirements seeded...");
    const count = await FrameworkRequirement.countDocuments();
    if (count === 0) {
      console.log("Seeding framework requirements...");
      await seedFrameworkRequirements(FrameworkRequirement);
      console.log("✓ Framework requirements seeded");
    } else {
      console.log(`✓ Framework requirements already seeded (${count} records)`);
    }
  } catch (error) {
    console.error("Failed to seed framework requirements:", error);
  }
}

// Call during startup
seedData();
```

---

## 🧪 Testing Strategy (Week 3-4)

### Unit Tests

**File:** `server/__tests__/services/compliance/DataPointResolver.test.ts`

```typescript
import { DataPointResolver } from "../../../services/compliance/DataPointResolver";

describe("DataPointResolver", () => {
  let resolver: DataPointResolver;
  let mockProject: any;
  let mockAnswers: any[];
  let mockEmissions: any[];

  beforeEach(() => {
    mockProject = {
      _id: "proj_123",
      financialData: { revenue: 1000000, operatingExpense: 500000 },
      workforce: { headcount: 500, turnoverRate: 0.15 },
      updatedAt: new Date()
    };

    mockEmissions = [
      {
        _id: "em_1",
        projectId: "proj_123",
        scope: "Scope 1",
        total: 5000,
        latest: true,
        updatedAt: new Date()
      },
      {
        _id: "em_2",
        projectId: "proj_123",
        scope: "Scope 2",
        total: 3000,
        latest: true,
        updatedAt: new Date()
      }
    ];

    mockAnswers = [];

    resolver = new DataPointResolver(
      "proj_123",
      mockProject,
      mockAnswers,
      mockEmissions,
      []
    );
  });

  test("resolves scope1_emissions correctly", async () => {
    const point = await resolver.resolve("scope1_emissions");
    expect(point).toBeDefined();
    expect(point?.value).toBe(5000);
    expect(point?.key).toBe("scope1_emissions");
  });

  test("resolves total_emissions by summing scopes", async () => {
    const point = await resolver.resolve("total_emissions");
    expect(point?.value).toBe(8000); // 5000 + 3000
  });

  test("resolves revenue correctly", async () => {
    const point = await resolver.resolve("revenue");
    expect(point?.value).toBe(1000000);
  });

  test("returns null for missing data point", async () => {
    const point = await resolver.resolve("nonexistent_key");
    expect(point).toBeNull();
  });
});
```

### Integration Tests

**File:** `server/__tests__/routes/compliance.test.ts`

```typescript
import request from "supertest";
import app from "../../server";
import { Project, FrameworkRequirement, ComplianceRun } from "../../models";

describe("POST /api/compliance/validate-completeness", () => {
  let projectId: string;
  let token: string;

  beforeEach(async () => {
    // Create test project
    const project = await Project.create({
      name: "Test Company",
      customerId: "cust_123",
      createdBy: "user_123"
    });
    projectId = project._id.toString();

    // Get auth token
    token = "valid_jwt_token"; // Mock token
  });

  test("validates completeness and returns results", async () => {
    const response = await request(app)
      .post("/api/compliance/validate-completeness")
      .set("Authorization", `Bearer ${token}`)
      .send({
        projectId,
        frameworkIds: ["ifrs_s2"]
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe("queued");

    // Wait for async validation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check results were stored
    const run = await ComplianceRun.findOne({ projectId, frameworkId: "ifrs_s2" });
    expect(run).toBeDefined();
    expect(run?.totalRequirements).toBeGreaterThan(0);
  });

  test("returns 400 if frameworkIds missing", async () => {
    const response = await request(app)
      .post("/api/compliance/validate-completeness")
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId });

    expect(response.status).toBe(400);
  });
});
```

---

## ✅ Success Criteria Checklist

### Code Complete
- [ ] All 3 services implemented (DataPointResolver, FrameworkRegistry, CompletenessService)
- [ ] All 3 MongoDB schemas added to models/index.ts
- [ ] Express routes all working (GET requirements, POST validate, GET results)
- [ ] Framework requirement seed data complete (42+ for IFRS S2, 10+ for GRI, 12+ for ESRS, 10+ for TCFD)
- [ ] TypeScript compiles with no errors (`npm run lint`)

### Testing
- [ ] Unit tests for DataPointResolver (all data point types)
- [ ] Unit tests for FrameworkRegistry (caching, retrieval)
- [ ] Unit tests for CompletenessService (gap detection logic)
- [ ] Integration tests for all 3 routes
- [ ] Performance test: Validation <2s on typical 500-question project

### Integration
- [ ] Hook validation into Project save flow (optional for MVP, full in Task 12)
- [ ] Seed data loaded on app startup
- [ ] No console errors when accessing /api/compliance endpoints
- [ ] Frontend can call API and get results

### Documentation
- [ ] Code commented (CompletenessService logic explained)
- [ ] README explaining data flow
- [ ] API docs (request/response examples)
- [ ] How to add new frameworks (documentation for future)

---

## 📋 Implementation Checklist

### Week 2 (Mon June 17 - Fri June 21)

**Monday June 17:**
- [ ] Create FrameworkRequirement + ComplianceRun schemas in models/index.ts
- [ ] Create DataPointResolver service
- [ ] Create FrameworkRegistry service (caching)

**Tuesday June 18:**
- [ ] Finish DataPointResolver (all data point types)
- [ ] Create CompletenessService basic structure
- [ ] Implement gap detection algorithm

**Wednesday June 19:**
- [ ] Finish CompletenessService methods
- [ ] Create service exports (index.ts)
- [ ] Create framework requirement seed data (40+ requirements)

**Thursday June 20:**
- [ ] Create Express routes (3 endpoints)
- [ ] Register routes in server.ts
- [ ] Implement seed data loading on startup
- [ ] Manual testing with cURL/Postman

**Friday June 21:**
- [ ] Integration testing
- [ ] Performance testing (<2s target)
- [ ] Code review (self-review)
- [ ] Ready for Task 3 (Frontend) handoff

### Week 3 (Mon June 24 - Fri June 28)

**Next week:** Testing + bug fixes, then handoff to frontend team

---

## 🔗 Reference

### CLAUDE.md Patterns
- **Service Layer:** "Business logic in `server/services/` (no Express imports)"
- **Models:** "Include common fields (legacyFirebaseId, createdBy, ownerId, timestamps)"
- **Routes:** "Generic CRUD endpoints /api/db/:resource"
- **Error Handling:** "JSON responses with success: true/false"

### Design Document
- `docs/design/TASK-1-FRAMEWORK-COMPLETENESS-DESIGN.md`
  - Section 1: Framework requirements enumeration
  - Section 3: API contracts (exact endpoints/payloads)
  - Section 4: Service layer design
  - Section 7: Reference data seeding

### Related Tasks
- Task 1: Design (completed)
- Task 3: Frontend UI (starts Week 2, depends on your API contracts)
- Task 5, 8, 9: Other services (similar pattern)

---

## 💡 Pro Tips

1. **Start with DataPointResolver** — All other services depend on it
2. **Test each service independently** — Unit tests before routes
3. **Seed data early** — Test with real framework requirements ASAP
4. **Use cURL for quick testing:**
   ```bash
   curl -X POST http://localhost:3010/api/compliance/validate-completeness \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "projectId": "123",
       "frameworkIds": ["ifrs_s2"]
     }'
   ```
5. **Monitor performance** — Add `console.time()` in CompletenessService to track validation time
6. **Immutable data:** Don't update ComplianceRun after creation (append-only pattern for audit trail)

---

**Ready to code? Start with Step 1 on Monday June 17.**

Good luck! 🚀

