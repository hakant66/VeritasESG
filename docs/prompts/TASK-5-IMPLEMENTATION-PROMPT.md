# Task 5: Cross-Framework Consistency Checker - Backend Implementation Prompt

**Task ID:** Task 5  
**Duration:** 2 weeks (10 days effort)  
**Status:** Ready for implementation (Week 2, starts June 17)  
**Owner:** Backend Developer  
**Dependency:** Task 4 design completed ✓ (APIs frozen)  
**Builds on:** Task 2 (DataPointResolver, FrameworkRegistry)  
**Parallel with:** Task 2, 3, 6, 8-11 (no blocking)

---

## 🎯 Mission

Implement the complete backend for the Cross-Framework Consistency Checker feature. This includes:
1. MongoDB schemas (FrameworkMapping, ConsistencyConflict)
2. Service layer (ConsistencyService, variance detection)
3. Seed data (framework equivalence mappings)
4. Express routes (/api/compliance/framework-mappings, /api/compliance/check-consistency)
5. Integration with existing systems

**Definition of Done:** All endpoints working, conflict detection accurate, audit trail immutable, tests passing.

---

## 📁 File Structure

Create these files in this order:

```
server/
├── models/
│   └── index.ts                              [MODIFY] Add FrameworkMapping, ConsistencyConflict
├── services/
│   └── compliance/
│       ├── ConsistencyService.ts             [NEW]
│       ├── ConsistencyValidator.ts           [NEW]
│       └── index.ts                          [MODIFY] Export new service
├── lib/
│   ├── frameworkMappingSeed.ts               [NEW] Seed data
│   └── ComplianceAuditService.ts             [NEW] Audit logging
└── routes/
    └── complianceRoute.ts                    [MODIFY] Add consistency endpoints

src/
└── lib/
    └── consistencyTypes.ts                   [NEW] TypeScript types (shared)
```

---

## 🏗️ Implementation Steps (Week 2-3)

### WEEK 2: Schemas, Seeds, Service Layer

#### Step 1: Add TypeScript Types to Models (Monday June 17)

**File:** `server/models/index.ts` (ADD THESE AFTER ComplianceRun)

```typescript
// ============================================
// FRAMEWORK MAPPING & CONSISTENCY MODELS
// ============================================

// FrameworkMapping Schema
export interface FrameworkMappingDocument extends BaseMongoDocument {
  mappingId: string;
  mappingName: string;
  equivalenceLevel: 'exact' | 'near' | 'partial';
  varianceThresholdPercent: number;
  varianceReasonGuide: string[];
  frameworks: Array<{
    frameworkId: string;
    indicatorId: string;
    indicatorName: string;
    dataPointKey: string;
  }>;
  reconciliationLogic: {
    priority: string[];
    fallbackLogic: 'average' | 'maximum' | 'minimum' | 'manual';
  };
}

const frameworkMappingSchema = createAppSchema({
  mappingId: { type: String, required: true, unique: true, index: true },
  mappingName: { type: String, required: true },
  equivalenceLevel: {
    type: String,
    enum: ['exact', 'near', 'partial'],
    required: true,
  },
  varianceThresholdPercent: { type: Number, required: true },
  varianceReasonGuide: [String],
  frameworks: [
    {
      frameworkId: String,
      indicatorId: String,
      indicatorName: String,
      dataPointKey: String,
    },
  ],
  reconciliationLogic: {
    priority: [String],
    fallbackLogic: { type: String, enum: ['average', 'maximum', 'minimum', 'manual'] },
  },
});

frameworkMappingSchema.index({ mappingId: 1 });
frameworkMappingSchema.index({ 'frameworks.frameworkId': 1 });

export const FrameworkMappingModel = getOrCreateModel(
  'FrameworkMapping',
  frameworkMappingSchema
);

// ConsistencyConflict Schema
export interface ConsistencyConflictDocument extends BaseMongoDocument {
  projectId: string;
  mappingId: string;
  framework1: {
    frameworkId: string;
    indicatorId: string;
    value: number;
    unit: string;
    source: string;
    sourceId?: string;
    lastUpdated: Date;
  };
  framework2: {
    frameworkId: string;
    indicatorId: string;
    value: number;
    unit: string;
    source: string;
    sourceId?: string;
    lastUpdated: Date;
  };
  variance: {
    absoluteDifference: number;
    percentageDifference: number;
    exceedsThreshold: boolean;
  };
  likelyCauses: Array<{
    cause: string;
    probability: 'high' | 'medium' | 'low';
    explanation: string;
  }>;
  status: 'unresolved' | 'reconciled' | 'exception_approved';
  resolution?: {
    selectedValue: number;
    selectedFramework: string;
    reason: string;
    resolvedBy: string;
    resolvedAt: Date;
    auditNote: string;
  };
}

const consistencyConflictSchema = createAppSchema({
  projectId: { type: String, required: true, index: true },
  mappingId: { type: String, required: true },
  framework1: {
    frameworkId: String,
    indicatorId: String,
    value: Number,
    unit: String,
    source: String,
    sourceId: String,
    lastUpdated: Date,
  },
  framework2: {
    frameworkId: String,
    indicatorId: String,
    value: Number,
    unit: String,
    source: String,
    sourceId: String,
    lastUpdated: Date,
  },
  variance: {
    absoluteDifference: Number,
    percentageDifference: Number,
    exceedsThreshold: Boolean,
  },
  likelyCauses: [
    {
      cause: String,
      probability: { type: String, enum: ['high', 'medium', 'low'] },
      explanation: String,
    },
  ],
  status: {
    type: String,
    enum: ['unresolved', 'reconciled', 'exception_approved'],
    default: 'unresolved',
  },
  resolution: {
    selectedValue: Number,
    selectedFramework: String,
    reason: String,
    resolvedBy: String,
    resolvedAt: Date,
    auditNote: String,
  },
});

consistencyConflictSchema.index({ projectId: 1, status: 1 });
consistencyConflictSchema.index({ projectId: 1, mappingId: 1 });
consistencyConflictSchema.index({ status: 1, 'variance.exceedsThreshold': 1 });

export const ConsistencyConflictModel = getOrCreateModel(
  'ConsistencyConflict',
  consistencyConflictSchema
);
```

Then add to mongoModels export:
```typescript
FrameworkMappingModel,
ConsistencyConflictModel,
```

---

#### Step 2: Create Framework Mapping Seed Data (Monday-Tuesday June 17-18)

**File:** `server/lib/frameworkMappingSeed.ts`

```typescript
/**
 * Seed data for framework mappings (equivalence relationships)
 */

export const FRAMEWORK_MAPPING_SEED = [
  {
    mappingId: 'emissions_scope1',
    mappingName: 'Scope 1 GHG Emissions Across Frameworks',
    equivalenceLevel: 'exact',
    varianceThresholdPercent: 5,
    varianceReasonGuide: [
      'Equity stake consolidation (subsidiaries >50%)',
      'Leased facility scope (lessee vs lessor)',
      'Excluded materials or operations',
      'Data quality / timing differences',
    ],
    frameworks: [
      {
        frameworkId: 'ifrs_s2',
        indicatorId: 'ifrs_s2_m1_1',
        indicatorName: 'Scope 1 GHG Emissions',
        dataPointKey: 'scope1_emissions',
      },
      {
        frameworkId: 'gri_305',
        indicatorId: 'gri_305_1',
        indicatorName: 'Direct GHG Emissions',
        dataPointKey: 'scope1_emissions',
      },
      {
        frameworkId: 'tcfd',
        indicatorId: 'tcfd_m1',
        indicatorName: 'Scope 1 Emissions',
        dataPointKey: 'scope1_emissions',
      },
      {
        frameworkId: 'esrs_e1',
        indicatorId: 'esrs_e1_1',
        indicatorName: 'Scope 1 Emissions',
        dataPointKey: 'scope1_emissions',
      },
    ],
    reconciliationLogic: {
      priority: ['ifrs_s2', 'gri_305', 'tcfd', 'esrs_e1'],
      fallbackLogic: 'average',
    },
  },

  {
    mappingId: 'emissions_scope2',
    mappingName: 'Scope 2 GHG Emissions Across Frameworks',
    equivalenceLevel: 'near',
    varianceThresholdPercent: 8,
    varianceReasonGuide: [
      'Location-based vs market-based methodology',
      'Electricity grid mix changes',
      'Green power contract timing',
      'Renewable energy credits expiry',
    ],
    frameworks: [
      {
        frameworkId: 'ifrs_s2',
        indicatorId: 'ifrs_s2_m1_2',
        indicatorName: 'Scope 2 GHG Emissions',
        dataPointKey: 'scope2_emissions',
      },
      {
        frameworkId: 'gri_305',
        indicatorId: 'gri_305_2',
        indicatorName: 'Indirect GHG Emissions',
        dataPointKey: 'scope2_emissions',
      },
      {
        frameworkId: 'tcfd',
        indicatorId: 'tcfd_m1',
        indicatorName: 'Scope 2 Emissions',
        dataPointKey: 'scope2_emissions',
      },
    ],
    reconciliationLogic: {
      priority: ['ifrs_s2', 'gri_305', 'tcfd'],
      fallbackLogic: 'average',
    },
  },

  {
    mappingId: 'emissions_intensity',
    mappingName: 'Emissions Intensity (per Revenue)',
    equivalenceLevel: 'near',
    varianceThresholdPercent: 8,
    varianceReasonGuide: [
      'Revenue definition (adjusted vs reported)',
      'Currency conversion differences',
      'Reporting period alignment',
      'Organic growth vs acquisition impacts',
    ],
    frameworks: [
      {
        frameworkId: 'ifrs_s2',
        indicatorId: 'ifrs_s2_m1_3',
        indicatorName: 'Emissions Intensity',
        dataPointKey: 'emissions_intensity',
      },
      {
        frameworkId: 'gri_305',
        indicatorId: 'gri_305_4',
        indicatorName: 'GHG Emissions Intensity',
        dataPointKey: 'emissions_intensity',
      },
    ],
    reconciliationLogic: {
      priority: ['ifrs_s2', 'gri_305'],
      fallbackLogic: 'average',
    },
  },
];

export async function seedFrameworkMappings(
  FrameworkMappingModel: any
): Promise<void> {
  try {
    const count = await FrameworkMappingModel.countDocuments();
    if (count > 0) {
      console.log(`✓ Framework mappings already seeded (${count} records). Skipping seed.`);
      return;
    }

    console.log('Seeding framework mappings...');
    for (const mapping of FRAMEWORK_MAPPING_SEED) {
      await FrameworkMappingModel.findOneAndUpdate(
        { mappingId: mapping.mappingId },
        mapping,
        { upsert: true, new: true }
      );
    }
    console.log(`✓ Seeded ${FRAMEWORK_MAPPING_SEED.length} framework mappings`);
  } catch (error) {
    console.error('Failed to seed framework mappings:', error);
    throw error;
  }
}
```

---

#### Step 3: Create ConsistencyValidator Helper (Tuesday June 18)

**File:** `server/services/compliance/ConsistencyValidator.ts`

```typescript
/**
 * Helper functions for variance detection and cause inference
 */

export interface VarianceAnalysis {
  absoluteDifference: number;
  percentageDifference: number;
  exceedsThreshold: boolean;
}

export function calculateVariance(
  value1: number,
  value2: number,
  thresholdPercent: number
): VarianceAnalysis {
  if (value1 === 0 && value2 === 0) {
    return {
      absoluteDifference: 0,
      percentageDifference: 0,
      exceedsThreshold: false,
    };
  }

  const baseValue = Math.max(value1, value2);
  const absoluteDifference = Math.abs(value1 - value2);
  const percentageDifference = (absoluteDifference / baseValue) * 100;

  return {
    absoluteDifference,
    percentageDifference,
    exceedsThreshold: percentageDifference > thresholdPercent,
  };
}

export interface LikelyCause {
  cause: string;
  probability: 'high' | 'medium' | 'low';
  explanation: string;
}

export function inferCauses(
  varianceReasonGuide: string[],
  variancePercent: number
): LikelyCause[] {
  const causes: LikelyCause[] = [];

  // Heuristic: If variance is small, less likely to be major structural issues
  for (const reason of varianceReasonGuide) {
    let probability: 'high' | 'medium' | 'low';

    // Simple heuristic: larger variance = higher probability of major causes
    if (variancePercent > 15) {
      probability = 'high';
    } else if (variancePercent > 8) {
      probability = 'medium';
    } else {
      probability = 'low';
    }

    causes.push({
      cause: reason,
      probability,
      explanation: getExplanation(reason),
    });
  }

  return causes.sort((a, b) => {
    const priorityMap = { high: 3, medium: 2, low: 1 };
    return priorityMap[b.probability] - priorityMap[a.probability];
  });
}

function getExplanation(cause: string): string {
  const explanations: Record<string, string> = {
    'Equity stake consolidation (subsidiaries >50%)':
      'IFRS S2 consolidates subsidiaries with >50% equity stake. GRI may use operational control instead. Check your consolidation scope and ownership structure.',
    'Leased facility scope (lessee vs lessor)':
      'IFRS and GRI handle leases differently. IFRS consolidates all leases (ASC 842). GRI uses lessee/lessor distinction. Verify your lease classification and operating vs finance lease split.',
    'Excluded materials or operations':
      'Different frameworks may exclude certain materials or operations. Scope boundaries vary—check what\'s included in each framework\'s definition.',
    'Data quality / timing differences':
      'One framework may have fresher data or higher precision. Check audit logs for when each value was updated.',
    'Location-based vs market-based methodology':
      'Scope 2 has two methodologies. Ensure you\'re comparing like-for-like (both location-based or both market-based).',
    'Electricity grid mix changes':
      'Grid emission factors change yearly. A year-end update can shift calculations significantly.',
    'Green power contract timing':
      'RECs and green power contracts may expire. Timing differences in contract years can cause variance.',
    'Revenue definition (adjusted vs reported)':
      'IFRS may use adjusted revenue while GRI uses reported. Check your revenue definitions.',
    'Currency conversion differences':
      'If reporting in multiple currencies, conversion rates matter. Ensure consistent FX treatment.',
    'Reporting period alignment':
      'Check that both values are for the same period (calendar year, fiscal year, etc).',
    'Organic growth vs acquisition impacts':
      'Acquisitions change the scope. Ensure both frameworks include/exclude M&A the same way.',
  };

  return (
    explanations[cause] ||
    'Review this factor and validate your data sources and methodology.'
  );
}
```

---

#### Step 4: Create ConsistencyService (Tuesday-Wednesday June 18-19)

**File:** `server/services/compliance/ConsistencyService.ts`

```typescript
/**
 * Service for detecting and managing framework consistency conflicts
 */

import {
  ProjectModel,
  EmissionEntryModel,
  ConsistencyConflictModel,
  FrameworkMappingModel,
} from '../../models';
import { DataPointResolver } from './DataPointResolver';
import { calculateVariance, inferCauses } from './ConsistencyValidator';

export interface ConsistencyCheckResult {
  projectId: string;
  conflicts: any[];
  summary: {
    mappingsChecked: number;
    conflictsFound: number;
    conflictsUnresolved: number;
    conflictsReconciled: number;
  };
}

/**
 * ConsistencyService detects contradictions across frameworks
 */
export class ConsistencyService {
  /**
   * Check consistency across claimed frameworks
   */
  async checkConsistency(
    projectId: string,
    frameworkIds: string[]
  ): Promise<ConsistencyCheckResult> {
    const startTime = Date.now();

    // 1. Fetch project data
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) throw new Error(`Project ${projectId} not found`);

    const answers = await ProjectModel.findById(projectId).lean();
    const emissions = await EmissionEntryModel.find({ projectId }).lean();

    // 2. Create resolver
    const resolver = new DataPointResolver(projectId, project, answers || [], emissions, []);

    // 3. Fetch all mappings
    const mappings = await FrameworkMappingModel.find().lean();

    // 4. For each mapping, check if conflict exists
    const conflicts: any[] = [];

    for (const mapping of mappings) {
      const relevantFrameworks = mapping.frameworks
        .map((f: any) => f.frameworkId)
        .filter((f: any) => frameworkIds.includes(f));

      // Skip if <2 frameworks claimed for this metric
      if (relevantFrameworks.length < 2) continue;

      // Get values for each framework
      const values = [];
      for (const fw of relevantFrameworks) {
        const fwMapping = mapping.frameworks.find((f: any) => f.frameworkId === fw);
        const dataPoint = await resolver.resolve(fwMapping.dataPointKey);
        if (dataPoint) {
          values.push({
            frameworkId: fw,
            indicatorId: fwMapping.indicatorId,
            value: dataPoint.value as number,
            unit: 'tCO2e',
            source: dataPoint.source,
            sourceId: dataPoint.sourceId,
            lastUpdated: dataPoint.lastUpdated,
          });
        }
      }

      // Compare pairwise
      for (let i = 0; i < values.length - 1; i++) {
        for (let j = i + 1; j < values.length; j++) {
          const conflict = await this.detectConflict(
            projectId,
            mapping,
            values[i],
            values[j]
          );
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }
    }

    console.log(
      `✓ Consistency check completed for project ${projectId} in ${Date.now() - startTime}ms`
    );

    // Count by status
    const unresolved = conflicts.filter((c) => c.status === 'unresolved').length;
    const reconciled = conflicts.filter((c) => c.status === 'reconciled').length;

    return {
      projectId,
      conflicts,
      summary: {
        mappingsChecked: mappings.length,
        conflictsFound: conflicts.length,
        conflictsUnresolved: unresolved,
        conflictsReconciled: reconciled,
      },
    };
  }

  private async detectConflict(
    projectId: string,
    mapping: any,
    value1: any,
    value2: any
  ): Promise<any | null> {
    const variance = calculateVariance(
      value1.value as number,
      value2.value as number,
      mapping.varianceThresholdPercent
    );

    // Only create conflict if variance exceeds threshold
    if (!variance.exceedsThreshold) {
      return null;
    }

    const likelyCauses = inferCauses(
      mapping.varianceReasonGuide,
      variance.percentageDifference
    );

    // Check if conflict already exists (for reconciliation tracking)
    const existing = await ConsistencyConflictModel.findOne({
      projectId,
      mappingId: mapping.mappingId,
      'framework1.frameworkId': value1.frameworkId,
      'framework2.frameworkId': value2.frameworkId,
    });

    if (existing) {
      return existing.toObject();
    }

    // Create new conflict
    const conflict = await ConsistencyConflictModel.create({
      projectId,
      mappingId: mapping.mappingId,
      framework1: value1,
      framework2: value2,
      variance,
      likelyCauses,
      status: 'unresolved',
    });

    return conflict.toObject();
  }

  /**
   * Resolve a conflict with reconciliation
   */
  async resolveConflict(
    conflictId: string,
    selectedFramework: string,
    selectedValue: number,
    reason: string,
    auditNote: string,
    resolvedBy: string
  ): Promise<any> {
    const conflict = await ConsistencyConflictModel.findByIdAndUpdate(
      conflictId,
      {
        status: 'reconciled',
        resolution: {
          selectedValue,
          selectedFramework,
          reason,
          auditNote,
          resolvedBy,
          resolvedAt: new Date(),
        },
      },
      { new: true }
    );

    return conflict;
  }

  /**
   * Get unresolved conflicts for a project
   */
  async getUnresolvedConflicts(projectId: string): Promise<any[]> {
    return ConsistencyConflictModel.find({
      projectId,
      status: 'unresolved',
    }).lean();
  }
}
```

---

#### Step 5: Update Service Exports (Wednesday June 19)

**File:** `server/services/compliance/index.ts` (MODIFY)

```typescript
export { CompletenessService } from './CompletenessService';
export { ConsistencyService } from './ConsistencyService';
export { DataPointResolver } from './DataPointResolver';
export { FrameworkRegistry } from './FrameworkRegistry';
export type { Gap } from './CompletenessService';
```

---

### WEEK 3: Express Routes, Integration

#### Step 6: Add Routes to complianceRoute.ts (Thursday June 20)

**File:** `server/routes/complianceRoute.ts` (ADD THESE)

```typescript
// ============================================
// GET /api/compliance/framework-mappings
// ============================================
/**
 * Fetch all framework equivalence mappings
 */
router.get('/framework-mappings', async (req: Request, res: Response) => {
  try {
    const { topic } = req.query;

    const query: any = {};
    if (topic && typeof topic === 'string') {
      query.mappingName = { $regex: topic, $options: 'i' };
    }

    const mappings = await FrameworkMappingModel.find(query).lean();

    res.json({
      success: true,
      mappings: mappings.map((m: any) => ({
        id: m._id.toString(),
        mappingId: m.mappingId,
        mappingName: m.mappingName,
        equivalenceLevel: m.equivalenceLevel,
        varianceThresholdPercent: m.varianceThresholdPercent,
        frameworks: m.frameworks,
      })),
    });
  } catch (error) {
    console.error('Error fetching framework mappings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch framework mappings',
    });
  }
});

// ============================================
// POST /api/compliance/check-consistency
// ============================================
/**
 * Check consistency across frameworks for a project
 */
router.post('/check-consistency', async (req: Request, res: Response) => {
  try {
    const { projectId, frameworkIds, userId } = req.body;

    if (!projectId || !frameworkIds || !Array.isArray(frameworkIds)) {
      return res.status(400).json({
        success: false,
        error: 'projectId and frameworkIds[] required',
      });
    }

    // Verify project exists
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Enqueue consistency check (async)
    setImmediate(async () => {
      try {
        const registry = new FrameworkRegistry();
        const service = new ConsistencyService();
        await service.checkConsistency(projectId, frameworkIds);
      } catch (error) {
        console.error(`Consistency check failed for project ${projectId}:`, error);
      }
    });

    res.json({
      success: true,
      projectId,
      status: 'queued',
      message: 'Consistency check enqueued',
    });
  } catch (error) {
    console.error('Error starting consistency check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start consistency check',
    });
  }
});

// ============================================
// GET /api/compliance/conflicts/:projectId
// ============================================
/**
 * Get unresolved conflicts for a project
 */
router.get('/conflicts/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const registry = new FrameworkRegistry();
    const service = new ConsistencyService();

    const conflicts = await service.getUnresolvedConflicts(projectId);

    res.json({
      success: true,
      projectId,
      conflicts: conflicts.map((c: any) => ({
        id: c._id.toString(),
        mappingName: c.mappingId,
        framework1: c.framework1,
        framework2: c.framework2,
        variance: c.variance,
        likelyCauses: c.likelyCauses,
        status: c.status,
      })),
      count: conflicts.length,
    });
  } catch (error) {
    console.error('Error fetching conflicts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conflicts',
    });
  }
});

// ============================================
// PATCH /api/compliance/conflicts/:conflictId/resolve
// ============================================
/**
 * Resolve a consistency conflict
 */
router.patch(
  '/conflicts/:conflictId/resolve',
  async (req: Request, res: Response) => {
    try {
      const { conflictId } = req.params;
      const { selectedFramework, selectedValue, reason, auditNote, userId } =
        req.body;

      if (!selectedFramework || selectedValue === undefined || !reason) {
        return res.status(400).json({
          success: false,
          error: 'selectedFramework, selectedValue, reason required',
        });
      }

      const registry = new FrameworkRegistry();
      const service = new ConsistencyService();

      const resolved = await service.resolveConflict(
        conflictId,
        selectedFramework,
        selectedValue,
        reason,
        auditNote || '',
        userId || 'system'
      );

      res.json({
        success: true,
        conflict: {
          id: resolved._id.toString(),
          status: resolved.status,
          resolution: resolved.resolution,
        },
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve conflict',
      });
    }
  }
);
```

---

#### Step 7: Update server.ts (Thursday June 20)

**File:** `server.ts` (ADD imports and seed call)

```typescript
// Add imports at top
import { seedFrameworkMappings } from './server/lib/frameworkMappingSeed.ts';
import { FrameworkMappingModel } from './server/models/index.ts';

// Add seed call in seeding section (after frameworkRequirements seed)
void seedFrameworkMappings(FrameworkMappingModel).catch((err) =>
  console.error('[SEED] framework mappings:', err),
);
```

---

## 🧪 Testing Strategy (Week 3)

### Unit Tests

**Key Functions:**
- `calculateVariance()` — Test with various percentages
- `inferCauses()` — Test cause probability ranking
- `ConsistencyService.detectConflict()` — Test with sample data

### Integration Tests

**Endpoints:**
- POST `/api/compliance/check-consistency` — Enqueue check
- GET `/api/compliance/conflicts/:projectId` — Fetch conflicts
- PATCH `/api/compliance/conflicts/:conflictId/resolve` — Resolve conflict

---

## ✅ Success Criteria Checklist

### Code Complete
- [ ] FrameworkMapping and ConsistencyConflict schemas added
- [ ] ConsistencyValidator helper functions implemented
- [ ] ConsistencyService with variance detection
- [ ] 4 Express routes created and working
- [ ] Framework mapping seed data (3+ mappings)
- [ ] Server integration (routes registered, seed on startup)
- [ ] TypeScript compiles with no errors

### Functionality
- [ ] Variance calculation accurate (±0.1%)
- [ ] Cause inference ranked by probability
- [ ] Conflicts persisted to database
- [ ] Reconciliation updates immutable resolution
- [ ] Unresolved conflict queries working

### Testing
- [ ] Unit tests for variance & cause functions
- [ ] Integration tests for all 4 routes
- [ ] Conflict resolution audit trail verified
- [ ] Error handling for missing projects/conflicts

---

## 📋 Implementation Checklist (Week 2-3)

### Week 2
**Monday:** Add schemas to models, create seed data  
**Tuesday:** Create ConsistencyValidator helper, ConsistencyService  
**Wednesday:** Update service exports  
**Thursday:** Add routes to complianceRoute.ts  
**Friday:** Update server.ts, manual testing

### Week 3
**Next week:** Unit tests, integration tests, bug fixes

---

**Ready to code? Start with Step 1 on Monday June 17.**

Good luck! 🚀
