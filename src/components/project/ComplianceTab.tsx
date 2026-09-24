/**
 * Integrated compliance tab combining all three Priority 1 features
 */

import { useState } from 'react';
import { Project } from '../../types';
import { ComplianceDashboard } from '../compliance/ComplianceDashboard';
import { ConsistencyDashboard } from '../consistency/ConsistencyDashboard';
import { ClimateScenarioDashboard } from '../climate/ClimateScenarioDashboard';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';

interface ComplianceTabProps {
  project: Project;
}

export function ComplianceTab({ project }: ComplianceTabProps) {
  const { ct } = useComplianceTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'completeness' | 'consistency' | 'climate'>(
    'completeness',
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 flex gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('completeness')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'completeness'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {ct.tabCompleteness}
        </button>
        <button
          onClick={() => setActiveSubTab('consistency')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'consistency'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {ct.tabConsistency}
        </button>
        <button
          onClick={() => setActiveSubTab('climate')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'climate'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {ct.tabClimate}
        </button>
      </div>

      <div className="bg-white rounded-lg p-6">
        {activeSubTab === 'completeness' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">{ct.completenessTitle}</h2>
            <p className="text-gray-600 mb-6">{ct.completenessDescription}</p>
            <ComplianceDashboard projectId={project.id} />
          </div>
        )}

        {activeSubTab === 'consistency' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">{ct.consistencyTitle}</h2>
            <p className="text-gray-600 mb-6">{ct.consistencyDescription}</p>
            <ConsistencyDashboard projectId={project.id} />
          </div>
        )}

        {activeSubTab === 'climate' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">{ct.climateTitle}</h2>
            <p className="text-gray-600 mb-6">{ct.climateDescription}</p>
            <ClimateScenarioDashboard projectId={project.id} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard
          title={ct.cardCompleteness}
          description={ct.cardCompletenessDesc}
          active={activeSubTab === 'completeness'}
          onClick={() => setActiveSubTab('completeness')}
        />
        <InfoCard
          title={ct.cardConsistency}
          description={ct.cardConsistencyDesc}
          active={activeSubTab === 'consistency'}
          onClick={() => setActiveSubTab('consistency')}
        />
        <InfoCard
          title={ct.cardClimate}
          description={ct.cardClimateDesc}
          active={activeSubTab === 'climate'}
          onClick={() => setActiveSubTab('climate')}
        />
      </div>
    </div>
  );
}

function InfoCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border-2 text-left transition-all ${
        active
          ? 'border-blue-600 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <h3 className={`font-semibold ${active ? 'text-blue-900' : 'text-gray-900'}`}>
        {title}
      </h3>
      <p className={`text-sm ${active ? 'text-blue-700' : 'text-gray-600'}`}>
        {description}
      </p>
    </button>
  );
}
