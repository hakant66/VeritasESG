/**
 * Variance indicator badge
 */

import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';

interface VarianceBadgeProps {
  percentage: number;
  threshold?: number;
  className?: string;
}

export function VarianceBadge({ percentage, threshold = 5, className = '' }: VarianceBadgeProps) {
  const { ct } = useComplianceTranslation();
  const exceedsThreshold = percentage > threshold;
  const color = exceedsThreshold ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${color} ${className}`}>
      {percentage.toFixed(1)}% {ct.variance}
    </span>
  );
}
