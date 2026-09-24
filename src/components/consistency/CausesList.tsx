/**
 * List of likely causes for variance
 */

import { LikelyCause, VarianceProbability } from '../../lib/consistencyTypes';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';
import { probabilityLabel } from '../../lib/complianceI18n';

interface CausesListProps {
  causes: LikelyCause[];
  className?: string;
}

function getProbabilityColor(probability: VarianceProbability): string {
  switch (probability) {
    case VarianceProbability.High:
      return 'text-red-600 bg-red-50';
    case VarianceProbability.Medium:
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

function getProbabilityBadge(probability: VarianceProbability): string {
  switch (probability) {
    case VarianceProbability.High:
      return 'bg-red-100 text-red-800';
    case VarianceProbability.Medium:
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function CausesList({ causes, className = '' }: CausesListProps) {
  const { ct } = useComplianceTranslation();

  if (!causes || causes.length === 0) {
    return <p className="text-sm text-gray-500">{ct.noIdentifiedCauses}</p>;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {causes.map((cause, idx) => (
        <div
          key={idx}
          className={`p-3 rounded border-l-4 ${getProbabilityColor(cause.probability)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-sm">{cause.cause}</p>
              <p className="text-xs text-gray-600 mt-1">{cause.explanation}</p>
            </div>
            <span
              className={`ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getProbabilityBadge(
                cause.probability,
              )}`}
            >
              {probabilityLabel(ct, cause.probability)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
