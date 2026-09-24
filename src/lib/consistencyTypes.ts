/**
 * TypeScript types for consistency checker
 */

export enum VarianceProbability {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export enum ConflictStatus {
  Unresolved = 'unresolved',
  Reconciled = 'reconciled',
}

export enum EquivalenceLevel {
  Exact = 'exact',
  Near = 'near',
  Partial = 'partial',
}

export interface VarianceAnalysis {
  absoluteDifference: number;
  percentageDifference: number;
  exceedsThreshold: boolean;
}

export interface LikelyCause {
  cause: string;
  probability: VarianceProbability;
  explanation: string;
}

export interface FrameworkIndicator {
  frameworkId: string;
  indicatorId: string;
  indicatorName: string;
  dataPointKey: string;
}

export interface FrameworkMapping {
  id: string;
  mappingId: string;
  mappingName: string;
  equivalenceLevel: EquivalenceLevel;
  varianceThresholdPercent: number;
  varianceReasonGuide: string[];
  frameworks: FrameworkIndicator[];
  reconciliationLogic: {
    priority: string[];
    fallbackLogic: string;
  };
}

export interface FrameworkValue {
  frameworkId: string;
  indicatorId: string;
  value: number;
  unit: string;
  source: string;
  sourceId: string;
  lastUpdated: string;
}

export interface ConsistencyConflict {
  id: string;
  mappingId: string;
  framework1: FrameworkValue;
  framework2: FrameworkValue;
  variance: VarianceAnalysis;
  likelyCauses: LikelyCause[];
  status: ConflictStatus;
  resolution?: {
    selectedValue: number;
    selectedFramework: string;
    reason: string;
    auditNote: string;
    resolvedBy: string;
    resolvedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConsistencyCheckResult {
  projectId: string;
  conflicts: ConsistencyConflict[];
  summary: {
    mappingsChecked: number;
    conflictsFound: number;
    conflictsUnresolved: number;
    conflictsReconciled: number;
  };
}

export interface ConsistencyCheckRequest {
  projectId: string;
  frameworkIds: string[];
}

export interface ConsistencyCheckResponse {
  success: boolean;
  projectId?: string;
  conflicts?: ConsistencyConflict[];
  summary?: ConsistencyCheckResult['summary'];
  error?: string;
}

export interface ConflictResolutionRequest {
  selectedFramework: string;
  selectedValue: number;
  reason: string;
  auditNote?: string;
  resolvedBy: string;
}

export interface ConflictResolutionResponse {
  success: boolean;
  conflict?: {
    id: string;
    status: ConflictStatus;
    resolution: any;
  };
  error?: string;
}

export interface FrameworkMappingsResponse {
  success: boolean;
  totalCount: number;
  mappings: FrameworkMapping[];
}

export interface ConflictsQueryResponse {
  success: boolean;
  projectId: string;
  totalCount: number;
  conflicts: ConsistencyConflict[];
}
