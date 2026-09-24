/**
 * Gap report with filtering
 */

import React, { useState } from 'react';
import { GapReportItem } from './GapReportItem';
import type { Gap } from '../../lib/complianceTypes';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';

interface GapReportProps {
  gaps: Gap[];
  frameworkId: string;
}

export const GapReport: React.FC<GapReportProps> = ({ gaps }) => {
  const { ct } = useComplianceTranslation();
  const [expandedGapId, setExpandedGapId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<
    'all' | 'critical' | 'high' | 'medium' | 'low'
  >('all');

  const filteredGaps =
    filterPriority === 'all'
      ? gaps
      : gaps.filter((gap) => gap.priority === filterPriority);

  const priorityCounts = {
    critical: gaps.filter((g) => g.priority === 'critical').length,
    high: gaps.filter((g) => g.priority === 'high').length,
    medium: gaps.filter((g) => g.priority === 'medium').length,
    low: gaps.filter((g) => g.priority === 'low').length,
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterPriority('all')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            filterPriority === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {ct.filterAll} ({gaps.length})
        </button>
        <button
          onClick={() => setFilterPriority('critical')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            filterPriority === 'critical'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {ct.priorityCritical} ({priorityCounts.critical})
        </button>
        <button
          onClick={() => setFilterPriority('high')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            filterPriority === 'high'
              ? 'bg-yellow-600 text-white'
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          }`}
        >
          {ct.priorityHigh} ({priorityCounts.high})
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredGaps.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">{ct.noGapsInPriority}</p>
        ) : (
          filteredGaps.map((gap) => (
            <GapReportItem
              key={gap.disclosureId}
              gap={gap}
              isExpanded={expandedGapId === gap.disclosureId}
              onToggleExpand={() =>
                setExpandedGapId(
                  expandedGapId === gap.disclosureId ? null : gap.disclosureId,
                )
              }
            />
          ))
        )}
      </div>
    </div>
  );
};
