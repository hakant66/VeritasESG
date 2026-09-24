/**
 * Type definitions for Framework Completeness Validator feature
 * Used across API client, hooks, and components
 */

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
  validationCompletedAt?: Date | string;
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
