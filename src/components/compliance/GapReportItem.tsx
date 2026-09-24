/**
 * Single gap item with expandable details
 */

import React from 'react';
import type { Gap } from '../../lib/complianceTypes';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';
import { priorityLabel } from '../../lib/complianceI18n';

interface GapReportItemProps {
  gap: Gap;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const priorityColors: Record<string, string> = {
  critical: 'border-l-4 border-l-red-500 bg-red-50',
  high: 'border-l-4 border-l-yellow-500 bg-yellow-50',
  medium: 'border-l-4 border-l-blue-500 bg-blue-50',
  low: 'border-l-4 border-l-gray-500 bg-gray-50',
};

const priorityBadgeColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-yellow-100 text-yellow-800',
  medium: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-800',
};

export const GapReportItem: React.FC<GapReportItemProps> = ({
  gap,
  isExpanded,
  onToggleExpand,
}) => {
  const { ct } = useComplianceTranslation();

  return (
    <div className={`p-3 rounded ${priorityColors[gap.priority]}`}>
      <button
        onClick={onToggleExpand}
        className="w-full text-left flex items-start justify-between hover:opacity-80"
      >
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{gap.disclosureName}</h4>
          <p className="text-xs text-gray-600 mt-1">{gap.disclosureId}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ml-2 ${
            priorityBadgeColors[gap.priority]
          }`}
        >
          {priorityLabel(ct, gap.priority)}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">{ct.reason} </span>
            <span className="text-gray-600">{gap.reason}</span>
          </div>
          {gap.suggestedDataPoint && (
            <div>
              <span className="font-medium text-gray-700">{ct.suggested} </span>
              <span className="text-gray-600 font-mono text-xs bg-white px-2 py-1 rounded">
                {gap.suggestedDataPoint}
              </span>
            </div>
          )}
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            {ct.viewRequirement}
          </button>
        </div>
      )}
    </div>
  );
};
