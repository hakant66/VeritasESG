/**
 * Expandable consistency conflict item
 */

import { useState } from 'react';
import { ConsistencyConflict, ConflictStatus } from '../../lib/consistencyTypes';
import { VarianceBadge } from './VarianceBadge';
import { CausesList } from './CausesList';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';

interface ConflictItemProps {
  conflict: ConsistencyConflict;
  onResolve?: (conflict: ConsistencyConflict) => void;
}

export function ConflictItem({ conflict, onResolve }: ConflictItemProps) {
  const { ct } = useComplianceTranslation();
  const [expanded, setExpanded] = useState(false);

  const isResolved = conflict.status === ConflictStatus.Reconciled;

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="font-medium text-sm">
              {conflict.framework1.indicatorId} vs {conflict.framework2.indicatorId}
            </div>
            {isResolved ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                {ct.conflictReconciled}
              </span>
            ) : (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                {ct.conflictUnresolved}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {conflict.framework1.frameworkId} ({conflict.framework1.value}{' '}
            {conflict.framework1.unit})
            {' ← → '}
            {conflict.framework2.frameworkId} ({conflict.framework2.value}{' '}
            {conflict.framework2.unit})
          </p>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <VarianceBadge percentage={conflict.variance.percentageDifference} />
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-600">
                {conflict.framework1.frameworkId}
              </p>
              <p className="text-sm font-bold mt-1">{conflict.framework1.value}</p>
              <p className="text-xs text-gray-600 mt-1">
                {ct.source} {conflict.framework1.source}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-600">
                {conflict.framework2.frameworkId}
              </p>
              <p className="text-sm font-bold mt-1">{conflict.framework2.value}</p>
              <p className="text-xs text-gray-600 mt-1">
                {ct.source} {conflict.framework2.source}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">{ct.likelyCauses}</h4>
            <CausesList causes={conflict.likelyCauses} />
          </div>

          {isResolved && conflict.resolution && (
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <p className="text-sm font-medium">{ct.resolution}</p>
              <p className="text-xs text-gray-600 mt-1">
                {ct.selectedValue} {conflict.resolution.selectedValue} {ct.from}{' '}
                {conflict.resolution.selectedFramework}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {ct.reason} {conflict.resolution.reason}
              </p>
              {conflict.resolution.auditNote && (
                <p className="text-xs text-gray-600 mt-1">
                  {ct.note} {conflict.resolution.auditNote}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {ct.resolvedBy} {conflict.resolution.resolvedBy} {ct.at}{' '}
                {new Date(conflict.resolution.resolvedAt).toLocaleString()}
              </p>
            </div>
          )}

          {!isResolved && onResolve && (
            <button
              onClick={() => onResolve(conflict)}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              {ct.resolveConflict}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
