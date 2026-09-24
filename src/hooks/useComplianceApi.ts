/**
 * Hook for managing compliance API calls and state
 */

import { useState, useCallback, useRef } from 'react';
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
          const result = await pollComplianceResults(
            request.projectId,
            frameworkId
          );

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
          try {
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
          } catch (error) {
            // Individual framework might not have results yet
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
