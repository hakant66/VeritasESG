/**
 * Main climate scenario analysis dashboard
 */

import { useEffect, useState } from 'react';
import { useClimateApi } from '../../hooks/useClimateApi';
import { PathwayId } from '../../lib/climateTypes';
import { PathwayCard } from './PathwayCard';
import { LeverSelector } from './LeverSelector';
import { ScenarioCard } from './ScenarioCard';
import { ValidationSpinner } from '../compliance/ValidationSpinner';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';

interface ClimateScenarioDashboardProps {
  projectId: string;
}

export function ClimateScenarioDashboard({ projectId }: ClimateScenarioDashboardProps) {
  const { ct } = useComplianceTranslation();
  const pathways = ct.getPathways();

  const {
    levers,
    loading,
    error,
    loadLevers,
    createNewScenario,
    loadProjectScenarios,
    removeScenario,
    getProjectScenarios,
    clearError,
  } = useClimateApi();

  const [selectedPathway, setSelectedPathway] = useState<PathwayId | null>(null);
  const [selectedLeverIds, setSelectedLeverIds] = useState<string[]>([]);
  const [baselineEmissions, setBaselineEmissions] = useState<number>(10000);
  const [scenarioName, setScenarioName] = useState<string>('');
  const [tab, setTab] = useState<'create' | 'results'>('create');

  const scenarios = getProjectScenarios(projectId);

  useEffect(() => {
    loadLevers();
    loadProjectScenarios(projectId);
  }, [projectId, loadLevers, loadProjectScenarios]);

  const handleCreateScenario = async () => {
    if (!selectedPathway || selectedLeverIds.length === 0) {
      return;
    }

    const request = {
      projectId,
      scenarioName: scenarioName || `${selectedPathway} Scenario`,
      pathwayId: selectedPathway,
      baselineEmissions,
      baselineYear: new Date().getFullYear() - 1,
      targetYear: 2030,
      selectedLevers: selectedLeverIds.map((leverId) => ({
        leverId,
        annualEmissionReduction: -3,
      })),
    };

    const scenario = await createNewScenario(request);
    if (scenario) {
      setTab('results');
      setScenarioName('');
      setSelectedPathway(null);
      setSelectedLeverIds([]);
    }
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    if (confirm(ct.deleteScenarioConfirm)) {
      await removeScenario(projectId, scenarioId);
    }
  };

  const leverCountLabel =
    selectedLeverIds.length === 1 ? ct.leverSelected : ct.leversSelected;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setTab('create')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === 'create'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {ct.createScenario}
        </button>
        <button
          onClick={() => setTab('results')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === 'results'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {ct.scenarios} ({scenarios.length})
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800 font-medium">
            ×
          </button>
        </div>
      )}

      {tab === 'create' && (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">{ct.step1Pathway}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pathways.map((pathway) => (
                <PathwayCard
                  key={pathway.id}
                  pathway={pathway}
                  selected={selectedPathway === pathway.pathwayId}
                  onSelect={setSelectedPathway}
                />
              ))}
            </div>
          </div>

          {selectedPathway && (
            <>
              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">{ct.step2Baseline}</h2>
                <div className="max-w-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ct.baselineEmissions}
                  </label>
                  <input
                    type="number"
                    value={baselineEmissions}
                    onChange={(e) => setBaselineEmissions(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="100"
                    step="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">{ct.baselineYearHint}</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">{ct.step3Levers}</h2>
                {loading && levers.length === 0 ? (
                  <ValidationSpinner visible message={ct.loadingLevers} />
                ) : (
                  <LeverSelector
                    levers={levers}
                    selectedLeverIds={selectedLeverIds}
                    onToggleLever={(leverId) => {
                      setSelectedLeverIds((prev) =>
                        prev.includes(leverId)
                          ? prev.filter((id) => id !== leverId)
                          : [...prev, leverId],
                      );
                    }}
                    disabled={loading}
                  />
                )}
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">{ct.step4Name}</h2>
                <div className="max-w-sm">
                  <input
                    type="text"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder={ct.scenarioNamePlaceholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t pt-6 flex gap-3">
                <button
                  onClick={handleCreateScenario}
                  disabled={loading || selectedLeverIds.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? ct.creating : ct.createScenario}
                </button>
                <p className="text-sm text-gray-600 self-center">
                  {selectedLeverIds.length} {leverCountLabel}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'results' && (
        <div className="space-y-4">
          {loading && scenarios.length === 0 ? (
            <ValidationSpinner visible message={ct.loadingScenarios} />
          ) : scenarios.length > 0 ? (
            <div className="space-y-4">
              {scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onDelete={handleDeleteScenario}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <p className="text-gray-600 mb-4">{ct.noScenariosYet}</p>
              <button
                onClick={() => setTab('create')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {ct.createFirstScenario}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
