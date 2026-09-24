# Task 3: Framework Completeness Validator - Frontend Implementation Prompt

**Task ID:** Task 3  
**Duration:** 2 weeks (10 days effort)  
**Status:** Ready for implementation (Week 2, starts June 17)  
**Owner:** Frontend Developer  
**Dependency:** Task 2 API ready ✓ (endpoints working)  
**Parallel with:** Task 5, 6, 8, 9, 10, 11 (no blocking)

---

## 🎯 Mission

Implement the complete React frontend for the Framework Completeness Validator feature. This includes:
1. React components (ComplianceDashboard, GapReport, AlertBanner)
2. API client hooks (useComplianceApi, useFrameworkRequirements)
3. TypeScript types and utilities
4. Integration with ProjectDetailPage
5. Component testing and Storybook stories

**Definition of Done:** All components render, call APIs correctly, display data in mock/real scenarios, responsive design working, tests passing.

---

## 📁 File Structure

Create these files in this order:

```
src/
├── lib/
│   ├── complianceApi.ts                    [NEW] API client (axios wrapper)
│   └── complianceTypes.ts                  [NEW] TypeScript types (shared)
├── hooks/
│   ├── useComplianceApi.ts                 [NEW] Hook for API calls
│   └── useFrameworkRequirements.ts         [NEW] Hook for requirements data
├── components/
│   └── compliance/
│       ├── ComplianceDashboard.tsx         [NEW] Main dashboard component
│       ├── ComplianceDashboardCard.tsx     [NEW] Framework status card
│       ├── GapReport.tsx                   [NEW] Detailed gaps list
│       ├── GapReportItem.tsx               [NEW] Single gap item
│       ├── AlertBanner.tsx                 [NEW] Warning/alert banner
│       ├── FrameworkSelector.tsx           [NEW] Framework chooser
│       ├── ValidationSpinner.tsx           [NEW] Loading state
│       └── index.ts                        [NEW] Component exports
├── pages/admin/
│   └── ComplianceDashboardPage.tsx         [NEW] Full page wrapper
├── __tests__/
│   └── components/compliance/
│       ├── ComplianceDashboard.test.tsx    [NEW]
│       ├── GapReport.test.tsx              [NEW]
│       └── AlertBanner.test.tsx            [NEW]
└── __storybook__/
    └── ComplianceDashboard.stories.tsx     [NEW] Storybook stories
```

---

## 🏗️ Implementation Steps (Week 2-3)

### WEEK 2: Types, Hooks, API Client

#### Step 1: Create TypeScript Types (Monday June 17)

**File:** `src/lib/complianceTypes.ts`

```typescript
// Framework and requirements types
export interface FrameworkRequirement {
  id: string;
  frameworkId: string;
  topicId: string;
  topicName: string;
  disclosureId: string;
  disclosureName: string;
  dataPointKeys: string[];
  description: string;
  guidance?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  mandatory: boolean;
}

export interface Gap {
  disclosureId: string;
  disclosureName: string;
  reason: 'no_data' | 'insufficient_data' | 'not_applicable';
  suggestedDataPoint?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ComplianceRun {
  id: string;
  projectId: string;
  frameworkId: string;
  totalRequirements: number;
  answeredRequirements: number;
  completionPercentage: number;
  gaps: Gap[];
  status: 'complete' | 'in_progress' | 'gaps_exist';
  criticalGapCount: number;
  validationCompletedAt?: Date;
  validationDurationMs?: number;
}

export interface ValidationRequest {
  projectId: string;
  frameworkIds: string[];
  userId?: string;
}

export interface FrameworkDefinition {
  id: string;
  name: string;
  description?: string;
  version?: string;
}

// API response types
export interface FrameworkRequirementsResponse {
  success: boolean;
  frameworkId: string;
  frameworkName: string;
  totalCount: number;
  requirements: FrameworkRequirement[];
}

export interface ComplianceRunResponse {
  success: boolean;
  complianceRun: ComplianceRun;
}

export interface ValidationResponse {
  success: boolean;
  projectId: string;
  status: 'queued' | 'processing' | 'complete';
  message?: string;
}

// UI state types
export interface ComplianceDashboardState {
  selectedFrameworks: string[];
  validationResults: Map<string, ComplianceRun>;
  isValidating: boolean;
  error?: string;
}

export interface GapFilterState {
  showCritical: boolean;
  showHigh: boolean;
  showMedium: boolean;
  showLow: boolean;
  searchText: string;
}
```

---

#### Step 2: Create API Client (Monday-Tuesday June 17-18)

**File:** `src/lib/complianceApi.ts`

```typescript
import { apiClient } from './apiClient';
import type {
  FrameworkRequirement,
  FrameworkRequirementsResponse,
  ComplianceRun,
  ComplianceRunResponse,
  ValidationRequest,
  ValidationResponse,
} from './complianceTypes';

const BASE_URL = '/api/compliance';

/**
 * Fetch all framework requirements for a given framework
 */
export async function fetchFrameworkRequirements(
  frameworkId: string,
  includeOptional: boolean = false
): Promise<FrameworkRequirementsResponse> {
  const response = await apiClient.get<FrameworkRequirementsResponse>(
    `${BASE_URL}/framework-requirements`,
    {
      params: {
        frameworkId,
        includeOptional: includeOptional ? 'true' : 'false',
      },
    }
  );
  return response.data;
}

/**
 * Enqueue completeness validation for a project
 */
export async function startComplianceValidation(
  request: ValidationRequest
): Promise<ValidationResponse> {
  const response = await apiClient.post<ValidationResponse>(
    `${BASE_URL}/validate-completeness`,
    request
  );
  return response.data;
}

/**
 * Fetch stored validation results
 */
export async function fetchComplianceResults(
  projectId: string,
  frameworkId: string
): Promise<ComplianceRunResponse> {
  const response = await apiClient.get<ComplianceRunResponse>(
    `${BASE_URL}/completeness/${projectId}/${frameworkId}`
  );
  return response.data;
}

/**
 * Poll for validation results (with exponential backoff)
 */
export async function pollComplianceResults(
  projectId: string,
  frameworkId: string,
  maxAttempts: number = 30,
  initialDelayMs: number = 500
): Promise<ComplianceRun | null> {
  let delay = initialDelayMs;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await fetchComplianceResults(projectId, frameworkId);
      if (result.success && result.complianceRun) {
        return result.complianceRun;
      }
    } catch (error) {
      // Still waiting for results
    }
    
    // Exponential backoff, capped at 5 seconds
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 5000)));
    delay *= 1.5;
  }
  
  return null;
}

/**
 * Batch fetch requirements for multiple frameworks
 */
export async function fetchAllFrameworkRequirements(
  frameworkIds: string[]
): Promise<Map<string, FrameworkRequirement[]>> {
  const results = new Map<string, FrameworkRequirement[]>();
  
  for (const frameworkId of frameworkIds) {
    try {
      const response = await fetchFrameworkRequirements(frameworkId, false);
      results.set(frameworkId, response.requirements);
    } catch (error) {
      console.error(`Failed to fetch requirements for ${frameworkId}:`, error);
    }
  }
  
  return results;
}
```

---

#### Step 3: Create Custom Hooks (Tuesday June 18)

**File:** `src/hooks/useComplianceApi.ts`

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  startComplianceValidation,
  pollComplianceResults,
  fetchComplianceResults,
} from '../lib/complianceApi';
import type { ValidationRequest, ComplianceRun } from '../lib/complianceTypes';

export interface UseComplianceApiState {
  isLoading: boolean;
  isValidating: boolean;
  results: Map<string, ComplianceRun>;
  error?: string;
}

/**
 * Hook for managing compliance API calls
 */
export function useComplianceApi() {
  const [state, setState] = useState<UseComplianceApiState>({
    isLoading: false,
    isValidating: false,
    results: new Map(),
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Start validation
  const startValidation = useCallback(
    async (request: ValidationRequest) => {
      setState((prev) => ({
        ...prev,
        isValidating: true,
        error: undefined,
      }));

      try {
        const response = await startComplianceValidation(request);
        
        if (!response.success) {
          setState((prev) => ({
            ...prev,
            isValidating: false,
            error: 'Failed to start validation',
          }));
          return;
        }

        // Poll for results
        for (const frameworkId of request.frameworkIds) {
          const result = await pollComplianceResults(request.projectId, frameworkId);
          
          if (result) {
            setState((prev) => {
              const newResults = new Map(prev.results);
              newResults.set(`${request.projectId}:${frameworkId}`, result);
              return {
                ...prev,
                results: newResults,
              };
            });
          }
        }

        setState((prev) => ({
          ...prev,
          isValidating: false,
        }));
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isValidating: false,
          error: error?.message || 'Validation failed',
        }));
      }
    },
    []
  );

  // Fetch existing results
  const fetchResults = useCallback(
    async (projectId: string, frameworkIds: string[]) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: undefined,
      }));

      try {
        for (const frameworkId of frameworkIds) {
          const response = await fetchComplianceResults(projectId, frameworkId);
          
          if (response.success) {
            setState((prev) => {
              const newResults = new Map(prev.results);
              newResults.set(`${projectId}:${frameworkId}`, response.complianceRun);
              return {
                ...prev,
                results: newResults,
              };
            });
          }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error?.message || 'Failed to fetch results',
        }));
      }
    },
    []
  );

  // Get result for specific project/framework
  const getResult = useCallback(
    (projectId: string, frameworkId: string): ComplianceRun | undefined => {
      return state.results.get(`${projectId}:${frameworkId}`);
    },
    [state.results]
  );

  // Clear results
  const clearResults = useCallback(() => {
    setState({
      isLoading: false,
      isValidating: false,
      results: new Map(),
      error: undefined,
    });
  }, []);

  return {
    ...state,
    startValidation,
    fetchResults,
    getResult,
    clearResults,
  };
}
```

**File:** `src/hooks/useFrameworkRequirements.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import { fetchAllFrameworkRequirements } from '../lib/complianceApi';
import type { FrameworkRequirement } from '../lib/complianceTypes';

interface UseFrameworkRequirementsState {
  requirements: Map<string, FrameworkRequirement[]>;
  isLoading: boolean;
  error?: string;
}

export function useFrameworkRequirements() {
  const [state, setState] = useState<UseFrameworkRequirementsState>({
    requirements: new Map(),
    isLoading: false,
  });

  const fetchRequirements = useCallback(async (frameworkIds: string[]) => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const requirements = await fetchAllFrameworkRequirements(frameworkIds);
      setState({
        requirements,
        isLoading: false,
      });
    } catch (error: any) {
      setState({
        requirements: new Map(),
        isLoading: false,
        error: error?.message || 'Failed to fetch requirements',
      });
    }
  }, []);

  const getFrameworkRequirements = useCallback(
    (frameworkId: string): FrameworkRequirement[] => {
      return state.requirements.get(frameworkId) || [];
    },
    [state.requirements]
  );

  return {
    ...state,
    fetchRequirements,
    getFrameworkRequirements,
  };
}
```

---

### WEEK 3: React Components

#### Step 4: Create Utility Components (Wednesday June 19)

**File:** `src/components/compliance/ValidationSpinner.tsx`

```typescript
import React from 'react';

interface ValidationSpinnerProps {
  message?: string;
  visible: boolean;
}

export const ValidationSpinner: React.FC<ValidationSpinnerProps> = ({
  message = 'Running validation...',
  visible,
}) => {
  if (!visible) return null;

  return (
    <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-blue-700">{message}</span>
      </div>
    </div>
  );
};
```

**File:** `src/components/compliance/FrameworkSelector.tsx`

```typescript
import React from 'react';

const FRAMEWORKS = [
  { id: 'ifrs_s2', name: 'IFRS S2 (Climate)' },
  { id: 'gri_305', name: 'GRI 305 (Emissions)' },
  { id: 'esrs_e1', name: 'ESRS E1 (Climate)' },
  { id: 'tcfd', name: 'TCFD (Disclosures)' },
];

interface FrameworkSelectorProps {
  selectedFrameworks: string[];
  onChange: (frameworks: string[]) => void;
  disabled?: boolean;
}

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  selectedFrameworks,
  onChange,
  disabled = false,
}) => {
  const handleToggle = (frameworkId: string) => {
    const updated = selectedFrameworks.includes(frameworkId)
      ? selectedFrameworks.filter((f) => f !== frameworkId)
      : [...selectedFrameworks, frameworkId];
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Frameworks to Validate
      </label>
      <div className="space-y-2">
        {FRAMEWORKS.map((framework) => (
          <label key={framework.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedFrameworks.includes(framework.id)}
              onChange={() => handleToggle(framework.id)}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">{framework.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
```

---

#### Step 5: Create Main Dashboard Component (Thursday June 20)

**File:** `src/components/compliance/ComplianceDashboard.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { ComplianceDashboardCard } from './ComplianceDashboardCard';
import { FrameworkSelector } from './FrameworkSelector';
import { ValidationSpinner } from './ValidationSpinner';
import { useComplianceApi } from '../../hooks/useComplianceApi';
import type { ComplianceRun } from '../../lib/complianceTypes';

interface ComplianceDashboardProps {
  projectId: string;
  onValidationComplete?: () => void;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  projectId,
  onValidationComplete,
}) => {
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([
    'ifrs_s2',
  ]);
  const { isValidating, results, startValidation, getResult } =
    useComplianceApi();

  // Load existing results on mount
  useEffect(() => {
    // TODO: Fetch existing results for selectedFrameworks
  }, [projectId, selectedFrameworks]);

  const handleValidate = useCallback(async () => {
    await startValidation({
      projectId,
      frameworkIds: selectedFrameworks,
      userId: 'current-user', // Replace with actual user
    });
    onValidationComplete?.();
  }, [projectId, selectedFrameworks, startValidation, onValidationComplete]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Compliance Dashboard
        </h2>

        <div className="space-y-4">
          <FrameworkSelector
            selectedFrameworks={selectedFrameworks}
            onChange={setSelectedFrameworks}
            disabled={isValidating}
          />

          <button
            onClick={handleValidate}
            disabled={isValidating || selectedFrameworks.length === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Running Validation...' : 'Run Validation'}
          </button>

          <ValidationSpinner
            visible={isValidating}
            message="Validating completeness against selected frameworks..."
          />
        </div>
      </div>

      <div className="space-y-4">
        {selectedFrameworks.map((frameworkId) => {
          const result = getResult(projectId, frameworkId);
          return (
            <ComplianceDashboardCard
              key={frameworkId}
              frameworkId={frameworkId}
              result={result}
              isLoading={isValidating}
            />
          );
        })}
      </div>
    </div>
  );
};
```

---

#### Step 6: Create Status Card Component (Thursday June 20)

**File:** `src/components/compliance/ComplianceDashboardCard.tsx`

```typescript
import React from 'react';
import { GapReport } from './GapReport';
import type { ComplianceRun } from '../../lib/complianceTypes';

const FRAMEWORK_NAMES: Record<string, string> = {
  ifrs_s2: 'IFRS S2 (Climate-Related)',
  gri_305: 'GRI 305 (Emissions)',
  esrs_e1: 'ESRS E1 (Climate Change)',
  tcfd: 'TCFD (Climate Disclosures)',
};

interface ComplianceDashboardCardProps {
  frameworkId: string;
  result?: ComplianceRun;
  isLoading?: boolean;
}

export const ComplianceDashboardCard: React.FC<ComplianceDashboardCardProps> = ({
  frameworkId,
  result,
  isLoading = false,
}) => {
  const frameworkName = FRAMEWORK_NAMES[frameworkId] || frameworkId;

  if (!result && !isLoading) {
    return null;
  }

  const completionPercentage = result?.completionPercentage || 0;
  const progressColor =
    completionPercentage === 100
      ? 'bg-green-500'
      : completionPercentage >= 80
        ? 'bg-yellow-500'
        : 'bg-red-500';

  const statusBadgeColor =
    result?.status === 'complete'
      ? 'bg-green-100 text-green-800'
      : result?.status === 'gaps_exist'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-blue-100 text-blue-800';

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{frameworkName}</h3>
        {result && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadgeColor}`}
          >
            {result.status === 'complete'
              ? 'Complete'
              : result.status === 'gaps_exist'
                ? 'Gaps Found'
                : 'In Progress'}
          </span>
        )}
      </div>

      {result && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Completeness
              </span>
              <span className="text-sm font-bold text-gray-900">
                {completionPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${progressColor} transition-all`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            {result.answeredRequirements} of {result.totalRequirements} required
            disclosures answered
          </div>

          {result.gaps.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-900 mb-2">
                Gaps by Priority
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-600">
                    {result.gaps.filter((g) => g.priority === 'critical').length} Critical
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-xs text-gray-600">
                    {result.gaps.filter((g) => g.priority === 'high').length} High
                  </span>
                </div>
              </div>
            </div>
          )}

          {result.gaps.length > 0 && (
            <GapReport gaps={result.gaps} frameworkId={frameworkId} />
          )}

          {result.validationDurationMs && (
            <div className="text-xs text-gray-500 mt-4">
              Validated in {(result.validationDurationMs / 1000).toFixed(2)}s
            </div>
          )}
        </>
      )}

      {isLoading && !result && (
        <div className="flex items-center justify-center py-8">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
```

---

#### Step 7: Create Gap Report Component (Friday June 21)

**File:** `src/components/compliance/GapReport.tsx`

```typescript
import React, { useState } from 'react';
import { GapReportItem } from './GapReportItem';
import type { Gap } from '../../lib/complianceTypes';

interface GapReportProps {
  gaps: Gap[];
  frameworkId: string;
}

export const GapReport: React.FC<GapReportProps> = ({ gaps, frameworkId }) => {
  const [expandedGapId, setExpandedGapId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<
    'all' | 'critical' | 'high' | 'medium' | 'low'
  >('all');

  const filteredGaps =
    filterPriority === 'all'
      ? gaps
      : gaps.filter((gap) => gap.priority === filterPriority);

  const priorityCounts = {
    critical: gaps.filter((g) => g.priority === 'critical').length,
    high: gaps.filter((g) => g.priority === 'high').length,
    medium: gaps.filter((g) => g.priority === 'medium').length,
    low: gaps.filter((g) => g.priority === 'low').length,
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterPriority('all')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            filterPriority === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({gaps.length})
        </button>
        <button
          onClick={() => setFilterPriority('critical')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            filterPriority === 'critical'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          Critical ({priorityCounts.critical})
        </button>
        <button
          onClick={() => setFilterPriority('high')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            filterPriority === 'high'
              ? 'bg-yellow-600 text-white'
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          }`}
        >
          High ({priorityCounts.high})
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredGaps.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No gaps in this priority level</p>
        ) : (
          filteredGaps.map((gap) => (
            <GapReportItem
              key={gap.disclosureId}
              gap={gap}
              isExpanded={expandedGapId === gap.disclosureId}
              onToggleExpand={() =>
                setExpandedGapId(
                  expandedGapId === gap.disclosureId
                    ? null
                    : gap.disclosureId
                )
              }
            />
          ))
        )}
      </div>
    </div>
  );
};
```

**File:** `src/components/compliance/GapReportItem.tsx`

```typescript
import React from 'react';
import type { Gap } from '../../lib/complianceTypes';

interface GapReportItemProps {
  gap: Gap;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const priorityColors: Record<string, string> = {
  critical: 'border-l-4 border-l-red-500 bg-red-50',
  high: 'border-l-4 border-l-yellow-500 bg-yellow-50',
  medium: 'border-l-4 border-l-blue-500 bg-blue-50',
  low: 'border-l-4 border-l-gray-500 bg-gray-50',
};

const priorityBadgeColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-yellow-100 text-yellow-800',
  medium: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-800',
};

export const GapReportItem: React.FC<GapReportItemProps> = ({
  gap,
  isExpanded,
  onToggleExpand,
}) => {
  return (
    <div className={`p-3 rounded ${priorityColors[gap.priority]}`}>
      <button
        onClick={onToggleExpand}
        className="w-full text-left flex items-start justify-between hover:opacity-80"
      >
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{gap.disclosureName}</h4>
          <p className="text-xs text-gray-600 mt-1">{gap.disclosureId}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ml-2 ${
            priorityBadgeColors[gap.priority]
          }`}
        >
          {gap.priority.charAt(0).toUpperCase() + gap.priority.slice(1)}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">Reason: </span>
            <span className="text-gray-600">{gap.reason}</span>
          </div>
          {gap.suggestedDataPoint && (
            <div>
              <span className="font-medium text-gray-700">Suggested: </span>
              <span className="text-gray-600 font-mono text-xs bg-white px-2 py-1 rounded">
                {gap.suggestedDataPoint}
              </span>
            </div>
          )}
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            View Requirement →
          </button>
        </div>
      )}
    </div>
  );
};
```

---

#### Step 8: Create Alert Banner (Friday June 21)

**File:** `src/components/compliance/AlertBanner.tsx`

```typescript
import React from 'react';

interface AlertBannerProps {
  message: string;
  criticalCount: number;
  highCount: number;
  onViewDetails: () => void;
  onDismiss?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  message,
  criticalCount,
  highCount,
  onViewDetails,
  onDismiss,
}) => {
  const totalIssues = criticalCount + highCount;
  if (totalIssues === 0) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-l-yellow-400 p-4 rounded">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="text-yellow-600 mt-0.5">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-yellow-800">{message}</h3>
            <p className="text-sm text-yellow-700 mt-1">
              {criticalCount > 0 && (
                <>
                  <span className="font-medium">{criticalCount} critical</span>
                  {highCount > 0 && <span> and </span>}
                </>
              )}
              {highCount > 0 && (
                <span className="font-medium">{highCount} high priority</span>
              )}
              {totalIssues === 1 ? ' gap' : ' gaps'} need attention.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onViewDetails}
            className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
          >
            View Details
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

#### Step 9: Create Component Exports (Friday June 21)

**File:** `src/components/compliance/index.ts`

```typescript
export { ComplianceDashboard } from './ComplianceDashboard';
export { ComplianceDashboardCard } from './ComplianceDashboardCard';
export { GapReport } from './GapReport';
export { GapReportItem } from './GapReportItem';
export { AlertBanner } from './AlertBanner';
export { FrameworkSelector } from './FrameworkSelector';
export { ValidationSpinner } from './ValidationSpinner';
```

---

## 🧪 Testing Strategy (Week 3)

### Unit Tests (Component Tests)

**File:** `src/__tests__/components/compliance/ComplianceDashboard.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComplianceDashboard } from '../../../components/compliance/ComplianceDashboard';
import * as api from '../../../lib/complianceApi';

jest.mock('../../../lib/complianceApi');

describe('ComplianceDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders framework selector', () => {
    render(<ComplianceDashboard projectId="proj-123" />);
    expect(screen.getByText('Frameworks to Validate')).toBeInTheDocument();
  });

  it('calls startValidation when button clicked', async () => {
    const mockStartValidation = jest.fn();
    (api.startComplianceValidation as jest.Mock).mockImplementation(
      mockStartValidation
    );

    render(<ComplianceDashboard projectId="proj-123" />);

    const button = screen.getByText('Run Validation');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockStartValidation).toHaveBeenCalled();
    });
  });

  it('displays validation results when available', () => {
    const mockResult = {
      id: 'run-123',
      projectId: 'proj-123',
      frameworkId: 'ifrs_s2',
      totalRequirements: 42,
      answeredRequirements: 35,
      completionPercentage: 83,
      gaps: [],
      status: 'in_progress' as const,
      criticalGapCount: 0,
    };

    // TODO: Mock useComplianceApi hook to return result
    // render(<ComplianceDashboard projectId="proj-123" />);
    // expect(screen.getByText(/83/)).toBeInTheDocument();
  });
});
```

---

## ✅ Success Criteria Checklist

### Code Complete
- [ ] All TypeScript types defined (complianceTypes.ts)
- [ ] API client implemented (complianceApi.ts)
- [ ] Custom hooks implemented (useComplianceApi, useFrameworkRequirements)
- [ ] All components created and rendering
- [ ] Components properly styled (Tailwind CSS)
- [ ] TypeScript compiles with no errors

### Functionality
- [ ] Dashboard loads existing validation results
- [ ] Framework selector works (multi-select)
- [ ] Validation button triggers async validation
- [ ] Results display with progress bar and gaps
- [ ] Gap list expandable with details
- [ ] Priority filtering works
- [ ] Alert banner shows critical/high gaps
- [ ] Responsive design (mobile, tablet, desktop)

### Testing
- [ ] Unit tests for each component
- [ ] API hooks tested
- [ ] Accessibility tested (WCAG 2.1 AA)
- [ ] No console errors/warnings

### Integration
- [ ] Wired to Task 2 backend API (working endpoints)
- [ ] Can be embedded in ProjectDetailPage
- [ ] Styling consistent with existing UI
- [ ] No TypeScript errors

---

## 📋 Implementation Checklist (Week 2-3)

### Week 2 (Mon June 17 - Fri June 21)

**Monday June 17:**
- [ ] Create complianceTypes.ts with all interfaces
- [ ] Create complianceApi.ts with API client functions
- [ ] Create useComplianceApi hook

**Tuesday June 18:**
- [ ] Create useFrameworkRequirements hook
- [ ] Create ValidationSpinner component
- [ ] Create FrameworkSelector component

**Wednesday June 19:**
- [ ] Create ComplianceDashboard main component
- [ ] Create ComplianceDashboardCard status component
- [ ] Test with Task 2 backend running

**Thursday June 20:**
- [ ] Create GapReport and GapReportItem components
- [ ] Create AlertBanner component
- [ ] Create component exports (index.ts)

**Friday June 21:**
- [ ] Style all components (responsive design)
- [ ] Write unit tests
- [ ] Manual testing with mock data
- [ ] Code review

### Week 3 (Mon June 24 - Fri June 28)

**Next week:** Testing, bug fixes, integration with ProjectDetailPage (Task 12)

---

## 🔗 Reference

### CLAUDE.md Patterns
- Use React functional components with hooks
- TypeScript strict mode
- Tailwind CSS for styling
- Folder structure: pages > components > lib
- Custom hooks for complex logic

### Related Tasks
- Task 2: Backend API (✓ ready)
- Task 4: Design review (happened)
- Task 5, 6, 8-11: Other backend/frontend (parallel)
- Task 12: Integration (depends on this)

### API Endpoints
- GET `/api/compliance/framework-requirements`
- POST `/api/compliance/validate-completeness`
- GET `/api/compliance/completeness/:projectId/:frameworkId`

---

## 💡 Pro Tips

1. **Mock data first** — Create local mock data to test components before backend
2. **Responsive design** — Test on mobile, tablet, desktop during development
3. **Accessibility** — Use semantic HTML, ARIA labels, keyboard navigation
4. **Performance** — Lazy load components, memoize expensive calculations
5. **Error handling** — Network errors, timeouts, 404s should be graceful
6. **Polling strategy** — Start with 500ms, backoff to 5s max (see pollComplianceResults)
7. **Storybook** — Create stories for each component for isolated testing

---

**Ready to code? Start with Step 1 on Monday June 17.**

Good luck! 🚀
