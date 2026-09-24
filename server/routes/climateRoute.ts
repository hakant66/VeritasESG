import { Router, Response } from 'express';
import { findProjectById } from '../data/entityLookup.ts';
import * as climateData from '../data/climateDataAccess.ts';
import { ClimateScenarioService } from '../services/compliance';

const router = Router();

function onClimateError(res: Response, err: unknown) {
  console.error('[CLIMATE]', err);
  res.status(500).json({
    success: false,
    error: err instanceof Error ? err.message : 'Climate operation failed',
  });
}

function handle(res: Response, run: () => Promise<unknown>) {
  void run().catch((err: unknown) => onClimateError(res, err));
}

router.get('/levers', (req, res) => {
  handle(res, async () => {
    const { category, industry } = req.query;
    const levers = await climateData.findTransitionLevers({
      category: typeof category === 'string' ? category : undefined,
      industry: typeof industry === 'string' ? industry : undefined,
    });

    res.json({
      success: true,
      totalCount: levers.length,
      levers: levers.map((lever) => ({
        id: lever.id || lever._id,
        leverId: lever.leverId,
        leverName: lever.leverName,
        category: lever.category,
        description: lever.description,
        applicableIndustries: lever.applicableIndustries,
        trl: lever.trl,
        maturity: lever.maturity,
        emissionReductionRange: lever.emissionReductionRange,
        capexRange: lever.capexRange,
        opexRange: lever.opexRange,
        paybackRange: lever.paybackRange,
        technicalRisk: lever.technicalRisk,
        marketRisk: lever.marketRisk,
        regulatoryRisk: lever.regulatoryRisk,
        sbtEligible: lever.sbtEligible,
      })),
    });
  });
});

router.post('/scenarios', (req, res) => {
  handle(res, async () => {
    const {
      projectId,
      scenarioName,
      scenarioDescription,
      pathwayId,
      baselineEmissions,
      baselineYear,
      targetYear,
      selectedLevers,
      userId,
    } = req.body;

    if (!projectId || !scenarioName || !pathwayId || !selectedLevers) {
      return res.status(400).json({
        success: false,
        error: 'projectId, scenarioName, pathwayId, and selectedLevers required',
      });
    }

    const project = await findProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const service = new ClimateScenarioService();
    const scenario = await service.createScenario({
      projectId,
      scenarioName,
      scenarioDescription,
      pathwayId,
      baselineEmissions: baselineEmissions || 10000,
      baselineYear: baselineYear || new Date().getFullYear() - 1,
      targetYear: targetYear || 2030,
      selectedLevers,
      userId: userId || 'system',
    });

    res.json({ success: true, scenario });
  });
});

router.get('/scenarios/:projectId', (req, res) => {
  handle(res, async () => {
    const { projectId } = req.params;

    const project = await findProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const service = new ClimateScenarioService();
    const scenarios = await service.getProjectScenarios(projectId);

    res.json({
      success: true,
      projectId,
      totalCount: scenarios.length,
      scenarios,
    });
  });
});

router.get('/scenarios/:projectId/:scenarioId', (req, res) => {
  handle(res, async () => {
    const { scenarioId } = req.params;
    const service = new ClimateScenarioService();
    const scenario = await service.getScenario(scenarioId);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found',
      });
    }

    res.json({ success: true, scenario });
  });
});

router.delete('/scenarios/:scenarioId', (req, res) => {
  handle(res, async () => {
    const { scenarioId } = req.params;
    const service = new ClimateScenarioService();
    const deleted = await service.deleteScenario(scenarioId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found',
      });
    }

    res.json({ success: true, message: 'Scenario deleted' });
  });
});

export default router;
