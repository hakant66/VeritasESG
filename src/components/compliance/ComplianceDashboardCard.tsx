/**
 * Framework status card
 */

import React from 'react';
import { GapReport } from './GapReport';
import type { ComplianceRun } from '../../lib/complianceTypes';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';

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
  const { ct } = useComplianceTranslation();
  const frameworkName = ct.frameworkName[frameworkId] || frameworkId;

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
              ? ct.statusComplete
              : result.status === 'gaps_exist'
                ? ct.statusGapsFound
                : ct.statusInProgress}
          </span>
        )}
      </div>

      {result && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {ct.completenessLabel}
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
            {ct.disclosuresAnswered
              .replace('{answered}', String(result.answeredRequirements))
              .replace('{total}', String(result.totalRequirements))}
          </div>

          {result.gaps.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-900 mb-2">
                {ct.gapsByPriority}
              </div>
              <div className="flex gap-4">
                {result.gaps.filter((g) => g.priority === 'critical').length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs text-gray-600">
                      {result.gaps.filter((g) => g.priority === 'critical').length}{' '}
                      {ct.priorityCritical}
                    </span>
                  </div>
                )}
                {result.gaps.filter((g) => g.priority === 'high').length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-xs text-gray-600">
                      {result.gaps.filter((g) => g.priority === 'high').length}{' '}
                      {ct.priorityHigh}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.gaps.length > 0 && (
            <GapReport gaps={result.gaps} frameworkId={frameworkId} />
          )}

          {result.validationDurationMs && (
            <div className="text-xs text-gray-500 mt-4">
              {ct.validatedInSeconds.replace(
                '{seconds}',
                (result.validationDurationMs / 1000).toFixed(2),
              )}
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
