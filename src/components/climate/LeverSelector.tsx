/**
 * Lever selector component with filtering and selection
 */

import { useState } from 'react';
import { TransitionLever } from '../../lib/climateTypes';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';
import { getLeverCategories, riskLabel } from '../../lib/complianceI18n';

interface LeverSelectorProps {
  levers: TransitionLever[];
  selectedLeverIds: string[];
  onToggleLever: (leverId: string) => void;
  disabled?: boolean;
}

function getRiskColor(risk: string): string {
  switch (risk) {
    case 'low':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'high':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function LeverSelector({
  levers,
  selectedLeverIds,
  onToggleLever,
  disabled = false,
}: LeverSelectorProps) {
  const { ct } = useComplianceTranslation();
  const categories = getLeverCategories(ct);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredLevers = selectedCategory
    ? levers.filter((l) => l.category === selectedCategory)
    : levers;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">{ct.filterByCategory}</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded text-sm ${
              selectedCategory === null ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
            }`}
          >
            {ct.categoryAll} ({levers.length})
          </button>
          {categories.map((cat) => {
            const count = levers.filter((l) => l.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded text-sm ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">
          {ct.selectLevers} ({selectedLeverIds.length} {ct.chosen})
        </h3>
        <div className="max-h-[600px] overflow-y-auto space-y-2 border rounded-lg p-4 bg-gray-50">
          {filteredLevers.length > 0 ? (
            filteredLevers.map((lever) => (
              <label
                key={lever.id}
                className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition-colors ${
                  selectedLeverIds.includes(lever.leverId)
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedLeverIds.includes(lever.leverId)}
                  onChange={() => onToggleLever(lever.leverId)}
                  disabled={disabled}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{lever.leverName}</p>
                    {lever.sbtEligible && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                        SBT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{lever.description}</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="font-medium text-gray-600">{ct.emission}</p>
                      <p className="text-gray-800">
                        {lever.emissionReductionRange.min}% – {lever.emissionReductionRange.max}%
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">{ct.capex}</p>
                      <p className="text-gray-800">
                        ${lever.capexRange.min}M – ${lever.capexRange.max}M
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">{ct.payback}</p>
                      <p className="text-gray-800">
                        {lever.paybackRange.min}–{lever.paybackRange.max} {ct.years}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${getRiskColor(lever.technicalRisk)}`}
                      >
                        {ct.techRisk} {riskLabel(ct, lever.technicalRisk)}
                      </span>
                    </div>
                  </div>
                </div>
              </label>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">{ct.noLeversInCategory}</p>
          )}
        </div>
      </div>

      {selectedLeverIds.length === 0 && (
        <p className="text-sm text-gray-500">{ct.selectLeverHint}</p>
      )}
    </div>
  );
}
