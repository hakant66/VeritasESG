/**
 * API client for climate scenario analysis
 */

import { apiRequest } from './apiClient';
import type {
  TransitionLever,
  ClimateScenario,
  CreateScenarioRequest,
  CreateScenarioResponse,
  LeversResponse,
  ScenariosResponse,
  ScenarioResponse,
  ScenarioDeleteResponse,
} from './climateTypes';

export async function fetchTransitionLevers(
  category?: string,
  industry?: string
): Promise<TransitionLever[]> {
  let url = '/api/climate/levers';
  const params = new URLSearchParams();

  if (category) params.append('category', category);
  if (industry) params.append('industry', industry);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await apiRequest<LeversResponse>(url);
  return response.levers || [];
}

export async function createScenario(
  request: CreateScenarioRequest
): Promise<CreateScenarioResponse> {
  return apiRequest<CreateScenarioResponse>(
    '/api/climate/scenarios',
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}

export async function fetchProjectScenarios(projectId: string): Promise<ClimateScenario[]> {
  const response = await apiRequest<ScenariosResponse>(
    `/api/climate/scenarios/${projectId}`
  );
  return response.scenarios || [];
}

export async function fetchScenario(
  projectId: string,
  scenarioId: string
): Promise<ClimateScenario | null> {
  try {
    const response = await apiRequest<ScenarioResponse>(
      `/api/climate/scenarios/${projectId}/${scenarioId}`
    );
    return response.scenario || null;
  } catch (err) {
    return null;
  }
}

export async function deleteScenario(scenarioId: string): Promise<boolean> {
  try {
    const response = await apiRequest<ScenarioDeleteResponse>(
      `/api/climate/scenarios/${scenarioId}`,
      {
        method: 'DELETE',
      }
    );
    return response.success || false;
  } catch (err) {
    return false;
  }
}
