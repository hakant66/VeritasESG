/**
 * Framework selection component for consistency checks
 */

import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';
import { getFrameworkOptions } from '../../lib/complianceI18n';

interface FrameworkSelectorProps {
  selectedFrameworks: string[];
  onChange: (frameworks: string[]) => void;
  disabled?: boolean;
}

export function FrameworkSelector({
  selectedFrameworks,
  onChange,
  disabled = false,
}: FrameworkSelectorProps) {
  const { ct } = useComplianceTranslation();
  const frameworks = getFrameworkOptions(ct);

  const toggleFramework = (id: string) => {
    if (selectedFrameworks.includes(id)) {
      if (selectedFrameworks.length > 1) {
        onChange(selectedFrameworks.filter((f) => f !== id));
      }
    } else {
      onChange([...selectedFrameworks, id]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {ct.selectFrameworksCompare}
      </label>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {frameworks.map((fw) => (
          <label
            key={fw.id}
            className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
              selectedFrameworks.includes(fw.id)
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-gray-300 hover:border-gray-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="checkbox"
              checked={selectedFrameworks.includes(fw.id)}
              onChange={() => toggleFramework(fw.id)}
              disabled={disabled}
              className="rounded"
            />
            <span className="ml-2 text-sm font-medium">{fw.name}</span>
          </label>
        ))}
      </div>
      {selectedFrameworks.length < 2 && (
        <p className="text-xs text-gray-500">{ct.selectFrameworksMinTwo}</p>
      )}
    </div>
  );
}
