/**
 * Main compliance dashboard component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ComplianceDashboardCard } from './ComplianceDashboardCard';
import { FrameworkSelector } from './FrameworkSelector';
import { ValidationSpinner } from './ValidationSpinner';
import { useComplianceApi } from '../../hooks/useComplianceApi';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';

interface ComplianceDashboardProps {
  projectId: string;
  onValidationComplete?: () => void;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  projectId,
  onValidationComplete,
}) => {
  const { ct } = useComplianceTranslation();
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const { isValidating, results, startValidation, getResult, fetchResults } =
    useComplianceApi();

  useEffect(() => {
    if (projectId && selectedFrameworks.length > 0) {
      fetchResults(projectId, selectedFrameworks).catch((error) => {
        console.error('Failed to fetch initial results:', error);
      });
    }
  }, [projectId, selectedFrameworks, fetchResults]);

  const handleValidate = useCallback(async () => {
    await startValidation({
      projectId,
      frameworkIds: selectedFrameworks,
    });
    onValidationComplete?.();
  }, [projectId, selectedFrameworks, startValidation, onValidationComplete]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{ct.dashboardTitle}</h2>

        <div className="space-y-4">
          <FrameworkSelector
            selectedFrameworks={selectedFrameworks}
            onChange={setSelectedFrameworks}
            disabled={isValidating}
          />

          <button
            onClick={handleValidate}
            disabled={isValidating || selectedFrameworks.length === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? ct.runningValidation : ct.runValidation}
          </button>

          <ValidationSpinner visible={isValidating} message={ct.validatingCompleteness} />
        </div>
      </div>

      <div className="space-y-4">
        {selectedFrameworks.map((frameworkId) => {
          const result = getResult(projectId, frameworkId);
          return (
            <ComplianceDashboardCard
              key={frameworkId}
              frameworkId={frameworkId}
              result={result}
              isLoading={isValidating}
            />
          );
        })}
      </div>
    </div>
  );
};
