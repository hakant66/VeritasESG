/**
 * Multi-select framework selector
 */

import React from 'react';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';
import { getFrameworkOptions } from '../../lib/complianceI18n';

interface FrameworkSelectorProps {
  selectedFrameworks: string[];
  onChange: (frameworks: string[]) => void;
  disabled?: boolean;
}

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  selectedFrameworks,
  onChange,
  disabled = false,
}) => {
  const { ct } = useComplianceTranslation();
  const frameworks = getFrameworkOptions(ct);

  const handleToggle = (frameworkId: string) => {
    const updated = selectedFrameworks.includes(frameworkId)
      ? selectedFrameworks.filter((f) => f !== frameworkId)
      : [...selectedFrameworks, frameworkId];
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {ct.frameworksToValidate}
      </label>
      <div className="space-y-2">
        {frameworks.map((framework) => (
          <label key={framework.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedFrameworks.includes(framework.id)}
              onChange={() => handleToggle(framework.id)}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">{framework.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
