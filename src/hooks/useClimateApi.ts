/**
 * Custom hook for climate scenario state management
 */

import { useState, useCallback } from 'react';
import {
  fetchTransitionLevers,
  createScenario,
  fetchProjectScenarios,
  fetchScenario,
  deleteScenario,
} from '../lib/climateApi';
import type {
  TransitionLever,
  ClimateScenario,
  CreateScenarioRequest,
} from '../lib/climateTypes';

export interface ClimateState {
  levers: TransitionLever[];
  scenarios: Map<string, ClimateScenario[]>;
  loading: boolean;
  error: string | null;
}

export function useClimateApi() {
  const [state, setState] = useState<ClimateState>({
    levers: [],
    scenarios: new Map(),
    loading: false,
    error: null,
  });

  const loadLevers = useCallback(async (category?: string, industry?: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const levers = await fetchTransitionLevers(category, industry);
      setState((prev) => ({
        ...prev,
        levers,
        loading: false,
      }));
      return levers;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load levers',
        loading: false,
      }));
      return [];
    }
  }, []);

  const createNewScenario = useCallback(async (request: CreateScenarioRequest) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const result = await createScenario(request);

      if (result.success && result.scenario) {
        setState((prev) => {
          const existing = new Map(prev.scenarios);
          const projectScenarios = existing.get(request.projectId) || [];
          existing.set(request.projectId, [...projectScenarios, result.scenario!]);
          return {
            ...prev,
            scenarios: existing,
            loading: false,
          };
        });
        return result.scenario;
      } else {
        throw new Error(result.error || 'Failed to create scenario');
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error',
        loading: false,
      }));
      return null;
    }
  }, []);

  const loadProjectScenarios = useCallback(async (projectId: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const scenarios = await fetchProjectScenarios(projectId);
      setState((prev) => ({
        ...prev,
        scenarios: new Map(prev.scenarios).set(projectId, scenarios),
        loading: false,
      }));
      return scenarios;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load scenarios',
        loading: false,
      }));
      return [];
    }
  }, []);

  const loadScenario = useCallback(async (projectId: string, scenarioId: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const scenario = await fetchScenario(projectId, scenarioId);
      setState((prev) => ({ ...prev, loading: false }));
      return scenario;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load scenario',
        loading: false,
      }));
      return null;
    }
  }, []);

  const removeScenario = useCallback(async (projectId: string, scenarioId: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const success = await deleteScenario(scenarioId);

      if (success) {
        setState((prev) => {
          const scenarios = new Map(prev.scenarios);
          const projectScenarios = scenarios.get(projectId) || [];
          scenarios.set(
            projectId,
            projectScenarios.filter((s) => s.id !== scenarioId)
          );
          return {
            ...prev,
            scenarios,
            loading: false,
          };
        });
      } else {
        throw new Error('Failed to delete scenario');
      }
      return success;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error',
        loading: false,
      }));
      return false;
    }
  }, []);

  const getProjectScenarios = useCallback(
    (projectId: string): ClimateScenario[] => {
      return state.scenarios.get(projectId) || [];
    },
    [state.scenarios]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    loadLevers,
    createNewScenario,
    loadProjectScenarios,
    loadScenario,
    removeScenario,
    getProjectScenarios,
    clearError,
  };
}
