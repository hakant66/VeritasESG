/**
 * Pathway card component showing pathway characteristics
 */

import { GFANZPathway, PathwayId } from '../../lib/climateTypes';
import { useComplianceTranslation } from '../../hooks/useComplianceTranslation';

interface PathwayCardProps {
  pathway: GFANZPathway;
  selected: boolean;
  onSelect: (pathwayId: PathwayId) => void;
}

function getPathwayColor(pathwayId: PathwayId): string {
  switch (pathwayId) {
    case PathwayId.OneFiveDegree:
      return 'border-green-500 bg-green-50 hover:bg-green-100';
    case PathwayId.TwoDegree:
      return 'border-blue-500 bg-blue-50 hover:bg-blue-100';
    case PathwayId.ThreePlusDegree:
      return 'border-red-500 bg-red-50 hover:bg-red-100';
  }
}

function getPathwayBadgeColor(pathwayId: PathwayId): string {
  switch (pathwayId) {
    case PathwayId.OneFiveDegree:
      return 'bg-green-100 text-green-800';
    case PathwayId.TwoDegree:
      return 'bg-blue-100 text-blue-800';
    case PathwayId.ThreePlusDegree:
      return 'bg-red-100 text-red-800';
  }
}

export function PathwayCard({ pathway, selected, onSelect }: PathwayCardProps) {
  const { ct } = useComplianceTranslation();

  return (
    <button
      onClick={() => onSelect(pathway.pathwayId)}
      className={`w-full text-left border-2 rounded-lg p-4 transition-all ${getPathwayColor(
        pathway.pathwayId,
      )} ${selected ? 'border-2 ring-2 ring-offset-2' : 'border-gray-300'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg">{pathway.pathwayName}</h3>
        <span
          className={`px-3 py-1 rounded text-sm font-medium ${getPathwayBadgeColor(pathway.pathwayId)}`}
        >
          {ct.emissionsReductionBy2030.replace(
            '{percent}',
            String(pathway.emissionsReduction2030),
          )}
        </span>
      </div>

      <p className="text-sm text-gray-700 mb-3">{pathway.description}</p>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="font-medium text-gray-600">{ct.capex}</p>
          <p className="text-gray-800">{pathway.characteristics.capexRequired}</p>
        </div>
        <div>
          <p className="font-medium text-gray-600">{ct.techFeasibility}</p>
          <p className="text-gray-800">{pathway.characteristics.technicalFeasibility}</p>
        </div>
        <div>
          <p className="font-medium text-gray-600">{ct.adoption}</p>
          <p className="text-gray-800">{pathway.characteristics.adoptionChallenge}</p>
        </div>
        <div>
          <p className="font-medium text-gray-600">{ct.economics}</p>
          <p className="text-gray-800">{pathway.characteristics.economicFeasibility}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-300">
        <p className="text-xs font-medium text-gray-600 mb-1">{ct.sectorTargets2030}</p>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>• {ct.sectorPower}: {pathway.sectorTargets.power}</li>
          <li>• {ct.sectorIndustry}: {pathway.sectorTargets.heavyIndustry}</li>
          <li>• {ct.sectorTransport}: {pathway.sectorTargets.transport}</li>
        </ul>
      </div>

      {selected && (
        <div className="mt-3 p-2 bg-white bg-opacity-60 rounded text-xs font-medium text-green-700">
          {ct.pathwaySelected}
        </div>
      )}
    </button>
  );
}
