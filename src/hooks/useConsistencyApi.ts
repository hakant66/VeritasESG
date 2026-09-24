/**
 * Custom hook for consistency checker state management
 */

import { useState, useCallback } from 'react';
import {
  startConsistencyCheck,
  fetchConflicts,
  resolveConflict,
  fetchFrameworkMappings,
} from '../lib/consistencyApi';
import type {
  ConsistencyCheckRequest,
  ConsistencyConflict,
  FrameworkMapping,
} from '../lib/consistencyTypes';

export type ConsistencyLastCheck = {
  completedAt: number;
  frameworkIds: string[];
  summary?: {
    mappingsChecked: number;
    conflictsFound: number;
    conflictsUnresolved: number;
    conflictsReconciled: number;
  };
};

export interface ConsistencyState {
  conflicts: Map<string, ConsistencyConflict[]>;
  lastChecks: Map<string, ConsistencyLastCheck>;
  mappings: FrameworkMapping[];
  loading: boolean;
  error: string | null;
}

export function useConsistencyApi() {
  const [state, setState] = useState<ConsistencyState>({
    conflicts: new Map(),
    lastChecks: new Map(),
    mappings: [],
    loading: false,
    error: null,
  });

  const loadMappings = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const mappings = await fetchFrameworkMappings();
      setState((prev) => ({
        ...prev,
        mappings,
        loading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load mappings',
        loading: false,
      }));
    }
  }, []);

  const startCheck = useCallback(async (request: ConsistencyCheckRequest) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const result = await startConsistencyCheck(request);

      if (result.success) {
        const conflicts = result.conflicts ?? [];
        setState((prev) => ({
          ...prev,
          conflicts: new Map(prev.conflicts).set(request.projectId, conflicts),
          lastChecks: new Map(prev.lastChecks).set(request.projectId, {
            completedAt: Date.now(),
            frameworkIds: request.frameworkIds,
            summary: result.summary,
          }),
          loading: false,
        }));
        return conflicts;
      } else {
        throw new Error(result.error || 'Failed to start consistency check');
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error',
        loading: false,
      }));
      return [];
    }
  }, []);

  const fetchProjectConflicts = useCallback(
    async (projectId: string, status?: 'unresolved' | 'reconciled') => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const conflicts = await fetchConflicts(projectId, status);
        setState((prev) => ({
          ...prev,
          conflicts: new Map(prev.conflicts).set(projectId, conflicts),
          loading: false,
        }));
        return conflicts;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to fetch conflicts',
          loading: false,
        }));
        return [];
      }
    },
    []
  );

  const resolve = useCallback(async (conflictId: string, projectId: string, data: any) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const result = await resolveConflict(conflictId, data);

      if (result.success) {
        // Refresh conflicts for this project
        const conflicts = await fetchConflicts(projectId);
        setState((prev) => ({
          ...prev,
          conflicts: new Map(prev.conflicts).set(projectId, conflicts),
          loading: false,
        }));
        return true;
      } else {
        throw new Error(result.error || 'Failed to resolve conflict');
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error',
        loading: false,
      }));
      return false;
    }
  }, []);

  const getConflicts = useCallback(
    (projectId: string): ConsistencyConflict[] => {
      return state.conflicts.get(projectId) || [];
    },
    [state.conflicts]
  );

  const getLastCheck = useCallback(
    (projectId: string): ConsistencyLastCheck | undefined => {
      return state.lastChecks.get(projectId);
    },
    [state.lastChecks]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    loadMappings,
    startCheck,
    fetchProjectConflicts,
    resolve,
    getConflicts,
    getLastCheck,
    clearError,
  };
}
