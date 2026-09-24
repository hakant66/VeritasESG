/**
 * API client for consistency checker
 */

import { apiRequest } from './apiClient';
import type {
  ConsistencyCheckRequest,
  ConsistencyCheckResponse,
  FrameworkMappingsResponse,
  ConflictsQueryResponse,
  ConflictResolutionRequest,
  ConflictResolutionResponse,
  ConsistencyConflict,
  FrameworkMapping,
} from './consistencyTypes';

export async function fetchFrameworkMappings(): Promise<FrameworkMapping[]> {
  const response = await apiRequest<FrameworkMappingsResponse>(
    '/api/compliance/framework-mappings'
  );
  return response.mappings || [];
}

export async function startConsistencyCheck(
  request: ConsistencyCheckRequest
): Promise<ConsistencyCheckResponse> {
  return apiRequest<ConsistencyCheckResponse>(
    '/api/compliance/check-consistency',
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}

export async function fetchConflicts(
  projectId: string,
  status?: 'unresolved' | 'reconciled'
): Promise<ConsistencyConflict[]> {
  let url = `/api/compliance/conflicts/${projectId}`;
  if (status) {
    url += `?status=${status}`;
  }
  const response = await apiRequest<ConflictsQueryResponse>(url);
  return response.conflicts || [];
}

export async function resolveConflict(
  conflictId: string,
  request: ConflictResolutionRequest
): Promise<ConflictResolutionResponse> {
  return apiRequest<ConflictResolutionResponse>(
    `/api/compliance/conflicts/${conflictId}/resolve`,
    {
      method: 'PATCH',
      body: JSON.stringify(request),
    }
  );
}

export async function pollConflicts(
  projectId: string,
  maxAttempts: number = 30
): Promise<ConsistencyConflict[]> {
  let attempts = 0;
  let delayMs = 500;

  while (attempts < maxAttempts) {
    try {
      const conflicts = await fetchConflicts(projectId);
      if (conflicts && conflicts.length > 0) {
        return conflicts;
      }
    } catch (err) {
      // Silent fail, retry
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    attempts++;
    delayMs = Math.min(delayMs * 1.5, 5000); // Exponential backoff, cap at 5s
  }

  return [];
}
