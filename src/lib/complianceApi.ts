/**
 * API client for Framework Completeness Validator
 * Handles all compliance-related API calls
 */

import { apiRequest } from './apiClient';
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
  const params = new URLSearchParams({
    frameworkId,
    includeOptional: includeOptional ? 'true' : 'false',
  });
  return apiRequest<FrameworkRequirementsResponse>(
    `${BASE_URL}/framework-requirements?${params}`
  );
}

/**
 * Enqueue completeness validation for a project
 */
export async function startComplianceValidation(
  request: ValidationRequest
): Promise<ValidationResponse> {
  return apiRequest<ValidationResponse>(
    `${BASE_URL}/validate-completeness`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}

/**
 * Fetch stored validation results
 */
export async function fetchComplianceResults(
  projectId: string,
  frameworkId: string
): Promise<ComplianceRunResponse> {
  return apiRequest<ComplianceRunResponse>(
    `${BASE_URL}/completeness/${projectId}/${frameworkId}`
  );
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
