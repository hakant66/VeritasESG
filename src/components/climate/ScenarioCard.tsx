/**
 * Climate scenario result card
 */

import { useState } from 'react';
import { ClimateScenario } from '../../lib/climateTypes';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';
import { riskLabel } from '../../lib/complianceI18n';

interface ScenarioCardProps {
  scenario: ClimateScenario;
  onDelete?: (scenarioId: string) => void;
}

export function ScenarioCard({ scenario, onDelete }: ScenarioCardProps) {
  const { ct } = useComplianceTranslation();
  const [expanded, setExpanded] = useState(false);

  const reductionPercent = (
    ((scenario.baselineEmissions - scenario.targetEmissions) / scenario.baselineEmissions) *
    100
  ).toFixed(1);

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div
        className="cursor-pointer flex items-start justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg">{scenario.scenarioName}</h3>
            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {scenario.pathwayName}
            </span>
            {scenario.sbtAlignment.aligned && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                {ct.sbtAligned}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {scenario.baselineEmissions.toLocaleString()} →{' '}
            {scenario.targetEmissions.toLocaleString()} tCO2e ({reductionPercent}%{' '}
            {ct.reduction})
          </p>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800">
              ${(scenario.financialImpact.netPresentValue / 1000000).toFixed(1)}M NPV
            </p>
            <p className="text-xs text-gray-600">
              {scenario.financialImpact.irr.toFixed(1)}% IRR
            </p>
          </div>
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
              <p className="text-xs font-medium text-gray-600">{ct.totalCapex}</p>
              <p className="text-lg font-bold mt-1">
                ${(scenario.financialImpact.totalCapex / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-600">{ct.annualOpexSavings}</p>
              <p className="text-lg font-bold mt-1">
                ${(scenario.financialImpact.totalOpexSavings / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-600">{ct.paybackPeriod}</p>
              <p className="text-lg font-bold mt-1">
                {scenario.financialImpact.paybackPeriod.toFixed(1)} {ct.years}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-600">{ct.cumulativeRoi2030}</p>
              <p className="text-lg font-bold mt-1">
                {scenario.financialImpact.cumulativeROI.year2030.toFixed(1)}%
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">{ct.riskAssessment}</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-xs">
                <p className="font-medium text-gray-600">{ct.physicalRisk}</p>
                <p className="text-gray-800">
                  {riskLabel(ct, scenario.riskAssessment.physicalRisk)}
                </p>
              </div>
              <div className="text-xs">
                <p className="font-medium text-gray-600">{ct.transitionRisk}</p>
                <p className="text-gray-800">
                  {riskLabel(ct, scenario.riskAssessment.transitionRisk)}
                </p>
              </div>
              <div className="text-xs">
                <p className="font-medium text-gray-600">{ct.regulatoryRisk}</p>
                <p className="text-gray-800">
                  {riskLabel(ct, scenario.riskAssessment.regulatoryRisk)}
                </p>
              </div>
              <div className="text-xs">
                <p className="font-medium text-gray-600">{ct.marketRisk}</p>
                <p className="text-gray-800">
                  {riskLabel(ct, scenario.riskAssessment.marketRisk)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {ct.strandedAssetsAtRisk} $
              {(scenario.riskAssessment.strandedAssets / 1000000).toFixed(1)}M
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">{ct.emissionsRoadmap}</h4>
            <div className="space-y-1">
              {scenario.roadmap
                .filter((_, idx) => idx % Math.ceil(scenario.roadmap.length / 5) === 0)
                .map((entry, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-gray-600">
                    <span>{entry.year}</span>
                    <span className="font-medium">{entry.emissions.toLocaleString()} tCO2e</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">
              {ct.selectedLevers} ({scenario.selectedLevers.length})
            </h4>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {scenario.selectedLevers.map((lever) => (
                <div key={lever.leverId} className="text-xs bg-gray-50 p-2 rounded">
                  <p className="font-medium text-gray-800">{lever.leverName}</p>
                  <div className="flex justify-between text-gray-600 mt-1">
                    <span>
                      {lever.annualEmissionReduction}% {ct.annualReduction}
                    </span>
                    <span>${lever.capex.toFixed(1)}M {ct.capex.toLowerCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {onDelete && (
            <button
              onClick={() => onDelete(scenario.id)}
              className="w-full px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
            >
              {ct.deleteScenario}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
