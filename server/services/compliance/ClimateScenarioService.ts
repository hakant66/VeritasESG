/**
 * Service for climate scenario analysis and modeling
 */

import {
  calculateFinancialImpact,
  calculateEmissionReductions,
  assessRisk,
  checkSBTAlignment,
  type SelectedLever,
} from './ScenarioCalculator';
import { findProjectById } from '../../data/entityLookup.ts';
import * as climateData from '../../data/climateDataAccess.ts';

export interface CreateScenarioRequest {
  projectId: string;
  scenarioName: string;
  scenarioDescription?: string;
  pathwayId: string;
  baselineEmissions: number;
  baselineYear: number;
  targetYear: number;
  selectedLevers: Array<{
    leverId: string;
    annualEmissionReduction: number;
  }>;
  userId: string;
}

export interface ScenarioResult {
  id: string;
  projectId: string;
  scenarioName: string;
  pathwayName: string;
  pathwayId: string;
  baselineEmissions: number;
  targetEmissions: number;
  financialImpact: any;
  riskAssessment: any;
  sbtAlignment: any;
  roadmap: any[];
  selectedLevers: any[];
  createdAt: string;
  updatedAt: string;
}

function toScenarioResult(scenario: Record<string, unknown>): ScenarioResult {
  const createdAt = scenario.createdAt instanceof Date
    ? scenario.createdAt.toISOString()
    : typeof scenario.createdAt === 'string'
      ? scenario.createdAt
      : new Date().toISOString();
  const updatedAt = scenario.updatedAt instanceof Date
    ? scenario.updatedAt.toISOString()
    : typeof scenario.updatedAt === 'string'
      ? scenario.updatedAt
      : createdAt;

  return {
    id: String(scenario.id || scenario._id || ''),
    projectId: String(scenario.projectId || ''),
    scenarioName: String(scenario.scenarioName || ''),
    pathwayName: String(scenario.pathwayName || ''),
    pathwayId: String(scenario.pathwayId || ''),
    baselineEmissions: Number(scenario.baselineEmissions) || 0,
    targetEmissions: Number(scenario.targetEmissions) || 0,
    financialImpact: scenario.financialImpact || {},
    riskAssessment: scenario.riskAssessment || {},
    sbtAlignment: scenario.sbtAlignment || {},
    roadmap: (scenario.roadmap as unknown[]) || [],
    selectedLevers: (scenario.selectedLevers as unknown[]) || [],
    createdAt,
    updatedAt,
  };
}

export class ClimateScenarioService {
  async createScenario(request: CreateScenarioRequest): Promise<ScenarioResult> {
    const startTime = Date.now();

    const project = await findProjectById(request.projectId);
    if (!project) throw new Error(`Project ${request.projectId} not found`);

    const pathwayNames: Record<string, string> = {
      '1_5_degree': '1.5°C Net-Zero by 2050',
      '2_degree': '2°C Aligned (Net-Zero by 2070)',
      '3_plus_degree': '3°C+ (Business-as-Usual + Some Action)',
    };

    const leverIds = request.selectedLevers.map((l) => l.leverId);
    const leverTemplates = await climateData.findTransitionLeversByLeverIds(leverIds);

    const selectedLevers: SelectedLever[] = request.selectedLevers.map((selected) => {
      const template = leverTemplates.find((t) => t.leverId === selected.leverId);
      if (!template) {
        throw new Error(`Lever template ${selected.leverId} not found`);
      }

      const capexRange = template.capexRange as { min?: number; max?: number } | undefined;
      const opexRange = template.opexRange as { min?: number; max?: number } | undefined;
      const paybackRange = template.paybackRange as { min?: number; max?: number } | undefined;
      const capexMid = ((capexRange?.min || 0) + (capexRange?.max || 0)) / 2;
      const opexMid = ((opexRange?.min || 0) + (opexRange?.max || 0)) / 2;
      const paybackMid = ((paybackRange?.min || 0) + (paybackRange?.max || 0)) / 2;

      return {
        leverId: selected.leverId,
        leverName: String(template.leverName || ''),
        annualEmissionReduction: selected.annualEmissionReduction,
        capex: capexMid,
        opex: opexMid,
        paybackPeriod: paybackMid,
        implementationStart: new Date().getFullYear() + 1,
        implementationEnd: new Date().getFullYear() + 5,
      };
    });

    const financialImpact = calculateFinancialImpact(
      request.baselineEmissions,
      request.baselineYear,
      request.targetYear,
      selectedLevers,
      0.08
    );

    const totalReductionPercent = selectedLevers.reduce(
      (sum, l) => sum + l.annualEmissionReduction,
      0
    );
    const roadmapData = calculateEmissionReductions(
      request.baselineEmissions,
      request.baselineYear,
      request.targetYear,
      selectedLevers
    );

    const targetEmissions = request.baselineEmissions * (1 - totalReductionPercent / 100);
    const riskAssessment = assessRisk(
      request.pathwayId,
      request.baselineEmissions,
      targetEmissions,
      selectedLevers
    );

    const sbtAlignment = checkSBTAlignment(totalReductionPercent, request.targetYear, request.pathwayId);

    const scenario = await climateData.createClimateScenario({
      projectId: request.projectId,
      scenarioName: request.scenarioName,
      scenarioDescription: request.scenarioDescription || '',
      pathwayId: request.pathwayId,
      pathwayName: pathwayNames[request.pathwayId] || request.pathwayId,
      baselineEmissions: request.baselineEmissions,
      baselineYear: request.baselineYear,
      targetYear: request.targetYear,
      targetEmissions: Math.round(targetEmissions),
      selectedLevers: selectedLevers.map((l) => ({
        leverId: l.leverId,
        leverName: l.leverName,
        annualEmissionReduction: l.annualEmissionReduction,
        capex: l.capex,
        opex: l.opex,
        paybackPeriod: l.paybackPeriod,
        implementationStart: l.implementationStart,
        implementationEnd: l.implementationEnd,
      })),
      financialImpact,
      riskAssessment,
      sbtAlignment,
      roadmap: roadmapData,
      createdBy: request.userId,
      ownerId: request.userId,
    });

    console.log(
      `✓ Climate scenario created for project ${request.projectId} in ${Date.now() - startTime}ms`
    );

    return toScenarioResult(scenario);
  }

  async getProjectScenarios(projectId: string): Promise<ScenarioResult[]> {
    const scenarios = await climateData.findClimateScenariosByProjectId(projectId);
    return scenarios.map(toScenarioResult);
  }

  async getScenario(scenarioId: string): Promise<ScenarioResult | null> {
    const scenario = await climateData.findClimateScenarioById(scenarioId);
    if (!scenario) return null;
    return toScenarioResult(scenario);
  }

  async deleteScenario(scenarioId: string): Promise<boolean> {
    return climateData.deleteClimateScenarioById(scenarioId);
  }
}
