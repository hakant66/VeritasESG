/**
 * Main consistency checker dashboard
 */

import { useEffect, useState } from 'react';
import { useConsistencyApi } from '../../hooks/useConsistencyApi';
import { ConflictStatus } from '../../lib/consistencyTypes';
import { FrameworkSelector } from './FrameworkSelector';
import { ConflictItem } from './ConflictItem';
import { ValidationSpinner } from '../compliance/ValidationSpinner';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';

interface ConsistencyDashboardProps {
  projectId: string;
}

export function ConsistencyDashboard({ projectId }: ConsistencyDashboardProps) {
  const { ct } = useComplianceTranslation();
  const {
    loading,
    error,
    startCheck,
    fetchProjectConflicts,
    getConflicts,
    getLastCheck,
    clearError,
  } = useConsistencyApi();

  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([
    'ifrs_s2',
    'gri_305',
  ]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unresolved' | 'reconciled'>('all');

  useEffect(() => {
    void fetchProjectConflicts(projectId).catch(() => {
      // Silent fail — no stored conflicts yet
    });
  }, [projectId, fetchProjectConflicts]);

  const allConflicts = getConflicts(projectId);
  const lastCheck = getLastCheck(projectId);
  const hasRunCheck = Boolean(lastCheck) || allConflicts.length > 0;

  const filtered =
    filterStatus === 'all'
      ? allConflicts
      : allConflicts.filter((c) =>
          filterStatus === 'unresolved'
            ? c.status === ConflictStatus.Unresolved
            : c.status === ConflictStatus.Reconciled,
        );

  const unresolvedCount = allConflicts.filter(
    (c) => c.status === ConflictStatus.Unresolved,
  ).length;
  const reconciledCount = allConflicts.filter(
    (c) => c.status === ConflictStatus.Reconciled,
  ).length;

  const handleStartCheck = async () => {
    await startCheck({
      projectId,
      frameworkIds: selectedFrameworks,
    });
  };

  const emptyFilteredMessage =
    filterStatus === 'unresolved'
      ? ct.noUnresolvedConflicts
      : filterStatus === 'reconciled'
        ? ct.noReconciledConflicts
        : ct.noConflictsFound;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">{ct.consistencyCheckTitle}</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              ×
            </button>
          </div>
        )}

        <FrameworkSelector
          selectedFrameworks={selectedFrameworks}
          onChange={setSelectedFrameworks}
          disabled={loading}
        />

        <button
          onClick={() => void handleStartCheck()}
          disabled={loading || selectedFrameworks.length < 2}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? ct.checking : ct.checkConsistency}
        </button>
      </div>

      <ValidationSpinner visible={loading} message={ct.checkingConsistency} />

      {!loading && allConflicts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {ct.results} ({filtered.length} / {allConflicts.length})
              </h3>
              <div className="text-sm text-gray-600 space-x-4">
                <span>{ct.unresolved}: {unresolvedCount}</span>
                <span>{ct.reconciled}: {reconciledCount}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded text-sm ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ct.filterAll}
              </button>
              <button
                onClick={() => setFilterStatus('unresolved')}
                className={`px-3 py-1 rounded text-sm ${
                  filterStatus === 'unresolved'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ct.unresolved}
              </button>
              <button
                onClick={() => setFilterStatus('reconciled')}
                className={`px-3 py-1 rounded text-sm ${
                  filterStatus === 'reconciled'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ct.reconciled}
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((conflict) => (
                <ConflictItem key={conflict.id} conflict={conflict} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">{emptyFilteredMessage}</p>
            )}
          </div>
        </div>
      )}

      {!loading && allConflicts.length === 0 && !hasRunCheck && (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-600">{ct.noChecksYet}</p>
        </div>
      )}

      {!loading && allConflicts.length === 0 && hasRunCheck && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center space-y-3">
          <p className="text-emerald-900 font-semibold">{ct.noConflictsDetected}</p>
          <p className="text-sm text-emerald-800 max-w-xl mx-auto">
            {ct.noConflictsExplanation}
          </p>
          {lastCheck?.summary ? (
            <p className="text-xs text-emerald-700">
              {ct.checkedMappings.replace(
                '{count}',
                String(lastCheck.summary.mappingsChecked),
              )}{' '}
              {lastCheck.summary.mappingsChecked === 1 ? ct.mapping : ct.mappings}{' '}
              — {lastCheck.frameworkIds.length} {ct.frameworks} —{' '}
              {lastCheck.summary.conflictsFound}{' '}
              {lastCheck.summary.conflictsFound === 1 ? ct.conflict : ct.conflicts}{' '}
              {ct.aboveThreshold}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
