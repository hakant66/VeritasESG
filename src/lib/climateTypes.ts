/**
 * TypeScript types for climate scenario analysis
 */

export enum PathwayId {
  OneFiveDegree = '1_5_degree',
  TwoDegree = '2_degree',
  ThreePlusDegree = '3_plus_degree',
}

export enum LeverCategory {
  Energy = 'energy',
  Process = 'process',
  SupplyChain = 'supply_chain',
  Removal = 'removal',
}

export enum RiskLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export interface GFANZPathway {
  id: string;
  pathwayId: PathwayId;
  pathwayName: string;
  description: string;
  emissionsReduction2030: number;
  emissionsReduction2050: number;
  characteristics: {
    capexRequired: string;
    adoptionChallenge: string;
    technicalFeasibility: string;
    economicFeasibility: string;
  };
  sectorTargets: {
    power: string;
    heavyIndustry: string;
    transport: string;
  };
}

export interface EmissionReductionRange {
  min: number;
  max: number;
  unit: string;
}

export interface CapexRange {
  min: number;
  max: number;
  perUnit: string;
}

export interface OpexRange {
  min: number;
  max: number;
  recurring: boolean;
}

export interface PaybackRange {
  min: number;
  max: number;
}

export interface TransitionLever {
  id: string;
  leverId: string;
  leverName: string;
  category: LeverCategory;
  description: string;
  applicableIndustries: string[];
  trl: number;
  maturity: 'emerging' | 'growth' | 'mature' | 'declining';
  emissionReductionRange: EmissionReductionRange;
  capexRange: CapexRange;
  opexRange: OpexRange;
  paybackRange: PaybackRange;
  technicalRisk: RiskLevel;
  marketRisk: RiskLevel;
  regulatoryRisk: RiskLevel;
  sbtEligible: boolean;
}

export interface SelectedLeverChoice {
  leverId: string;
  annualEmissionReduction: number;
}

export interface RoadmapEntry {
  year: number;
  emissions: number;
}

export interface FinancialImpact {
  totalCapex: number;
  totalOpexSavings: number;
  netPresentValue: number;
  irr: number;
  paybackPeriod: number;
  cumulativeROI: {
    year2030: number;
    year2035: number;
    year2050: number;
  };
}

export interface RiskAssessment {
  strandedAssets: number;
  physicalRisk: RiskLevel;
  transitionRisk: RiskLevel;
  regulatoryRisk: RiskLevel;
  marketRisk: RiskLevel;
}

export interface SBTAlignment {
  aligned: boolean;
  sbtInitiativeApproved?: boolean;
  nearTermTarget2030?: boolean;
  netZeroTarget2050?: boolean;
  confidenceLevel: RiskLevel;
}

export interface ClimateScenario {
  id: string;
  projectId: string;
  scenarioName: string;
  pathwayName: string;
  pathwayId: PathwayId;
  baselineEmissions: number;
  targetEmissions: number;
  financialImpact: FinancialImpact;
  riskAssessment: RiskAssessment;
  sbtAlignment: SBTAlignment;
  roadmap: RoadmapEntry[];
  selectedLevers: Array<{
    leverId: string;
    leverName: string;
    annualEmissionReduction: number;
    capex: number;
    opex: number;
    paybackPeriod: number;
    implementationStart: number;
    implementationEnd: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScenarioRequest {
  projectId: string;
  scenarioName: string;
  scenarioDescription?: string;
  pathwayId: PathwayId;
  baselineEmissions: number;
  baselineYear: number;
  targetYear: number;
  selectedLevers: SelectedLeverChoice[];
}

export interface CreateScenarioResponse {
  success: boolean;
  scenario?: ClimateScenario;
  error?: string;
}

export interface LeversResponse {
  success: boolean;
  totalCount: number;
  levers: TransitionLever[];
}

export interface ScenariosResponse {
  success: boolean;
  projectId: string;
  totalCount: number;
  scenarios: ClimateScenario[];
}

export interface ScenarioResponse {
  success: boolean;
  scenario?: ClimateScenario;
  error?: string;
}

export interface ScenarioDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}
