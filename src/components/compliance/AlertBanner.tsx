/**
 * Alert banner for critical/high priority gaps
 */

import React from 'react';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';

interface AlertBannerProps {
  message: string;
  criticalCount: number;
  highCount: number;
  onViewDetails: () => void;
  onDismiss?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  message,
  criticalCount,
  highCount,
  onViewDetails,
  onDismiss,
}) => {
  const { ct } = useComplianceTranslation();
  const totalIssues = criticalCount + highCount;
  if (totalIssues === 0) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-l-yellow-400 p-4 rounded">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="text-yellow-600 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-yellow-800">{message}</h3>
            <p className="text-sm text-yellow-700 mt-1">
              {criticalCount > 0 && (
                <>
                  <span className="font-medium">
                    {criticalCount} {ct.alertCritical}
                  </span>
                  {highCount > 0 && <span>{ct.alertAnd}</span>}
                </>
              )}
              {highCount > 0 && (
                <span className="font-medium">
                  {highCount} {ct.alertHighPriority}
                </span>
              )}
              {totalIssues === 1 ? ct.alertGap : ct.alertGaps} {ct.alertGapsNeedAttention}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onViewDetails}
            className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
          >
            {ct.viewDetails}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <span className="sr-only">{ct.dismiss}</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
