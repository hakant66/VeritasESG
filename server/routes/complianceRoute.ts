import { Router, Request, Response } from 'express';
import { findProjectById } from '../data/entityLookup.ts';
import * as complianceData from '../data/complianceDataAccess.ts';
import {
  CompletenessService,
  FrameworkRegistry,
  ConsistencyService
} from '../services/compliance';

const router = Router();

function onComplianceError(res: Response, err: unknown) {
  console.error('[COMPLIANCE]', err);
  res.status(500).json({
    success: false,
    error: err instanceof Error ? err.message : 'Compliance operation failed',
  });
}

function handle(res: Response, run: () => Promise<unknown>) {
  void run().catch((err: unknown) => onComplianceError(res, err));
}

router.get('/framework-requirements', (req, res) => {
  handle(res, async () => {
    const { frameworkId, includeOptional } = req.query;

    if (!frameworkId || typeof frameworkId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'frameworkId query parameter required'
      });
    }

    const registry = new FrameworkRegistry();
    const requirements = await registry.getFrameworkRequirements(frameworkId, includeOptional === 'true');

    if (requirements.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No requirements found for framework: ${frameworkId}`
      });
    }

    res.json({
      success: true,
      frameworkId,
      frameworkName: requirements[0]?.frameworkName || frameworkId,
      totalCount: requirements.length,
      requirements: requirements.map((req: any) => ({
        id: req.id || req._id,
        topicId: req.topicId,
        topicName: req.topicName,
        disclosureId: req.disclosureId,
        disclosureName: req.disclosureName,
        dataPointKeys: req.dataPointKeys,
        description: req.description,
        guidance: req.guidance,
        priority: req.priority,
        mandatory: req.mandatory
      }))
    });
  });
});

router.post('/validate-completeness', (req, res) => {
  handle(res, async () => {
    const { projectId, frameworkIds, userId } = req.body;

    if (!projectId || !frameworkIds || !Array.isArray(frameworkIds)) {
      return res.status(400).json({
        success: false,
        error: 'projectId, frameworkIds[], and userId required'
      });
    }

    const project = await findProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const registry = new FrameworkRegistry();
    const service = new CompletenessService(registry);
    const result = await service.validateCompleteness(projectId, frameworkIds, userId || 'system');

    res.json({
      success: true,
      projectId,
      status: result.status,
      message: 'Validation enqueued. Results will be available shortly.'
    });
  });
});

router.get('/completeness/:projectId/:frameworkId', (req, res) => {
  handle(res, async () => {
    const { projectId, frameworkId } = req.params;
    const registry = new FrameworkRegistry();
    const service = new CompletenessService(registry);
    const run = await service.getComplianceRun(projectId, frameworkId);

    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'No validation results found. Run validation first.'
      });
    }

    res.json({
      success: true,
      complianceRun: {
        id: run.id || run._id,
        projectId: run.projectId,
        frameworkId: run.frameworkId,
        totalRequirements: run.totalRequirements,
        answeredRequirements: run.answeredRequirements,
        completionPercentage: run.completionPercentage,
        status: run.status,
        criticalGapCount: run.criticalGapCount,
        gaps: run.gaps,
        validationCompletedAt: run.validationCompletedAt,
        validationDurationMs: run.validationDurationMs
      }
    });
  });
});

router.get('/framework-mappings', (req, res) => {
  handle(res, async () => {
    const mappings = await complianceData.findAllFrameworkMappings();
    res.json({
      success: true,
      totalCount: mappings.length,
      mappings: mappings.map((mapping) => ({
        id: mapping.id || mapping._id,
        mappingId: mapping.mappingId,
        mappingName: mapping.mappingName,
        equivalenceLevel: mapping.equivalenceLevel,
        varianceThresholdPercent: mapping.varianceThresholdPercent,
        varianceReasonGuide: mapping.varianceReasonGuide,
        frameworks: mapping.frameworks,
        reconciliationLogic: mapping.reconciliationLogic
      }))
    });
  });
});

router.post('/check-consistency', (req, res) => {
  handle(res, async () => {
    const { projectId, frameworkIds } = req.body;

    if (!projectId || !frameworkIds || !Array.isArray(frameworkIds)) {
      return res.status(400).json({
        success: false,
        error: 'projectId and frameworkIds[] required'
      });
    }

    const project = await findProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const service = new ConsistencyService();
    const result = await service.checkConsistency(projectId, frameworkIds);

    res.json({
      success: true,
      projectId,
      ...result
    });
  });
});

router.get('/conflicts/:projectId', (req, res) => {
  handle(res, async () => {
    const { projectId } = req.params;
    const { status } = req.query;
    const conflicts = await complianceData.findConsistencyConflicts(
      projectId,
      typeof status === 'string' ? status : undefined,
    );

    res.json({
      success: true,
      projectId,
      totalCount: conflicts.length,
      conflicts: conflicts.map((conflict) => ({
        id: conflict.id || conflict._id,
        mappingId: conflict.mappingId,
        framework1: conflict.framework1,
        framework2: conflict.framework2,
        variance: conflict.variance,
        likelyCauses: conflict.likelyCauses,
        status: conflict.status,
        resolution: conflict.resolution,
        createdAt: conflict.createdAt,
        updatedAt: conflict.updatedAt
      }))
    });
  });
});

router.patch('/conflicts/:conflictId/resolve', (req, res) => {
  handle(res, async () => {
    const { conflictId } = req.params;
    const {
      selectedFramework,
      selectedValue,
      reason,
      auditNote,
      resolvedBy
    } = req.body;

    if (
      !selectedFramework ||
      typeof selectedValue !== 'number' ||
      !reason ||
      !resolvedBy
    ) {
      return res.status(400).json({
        success: false,
        error: 'selectedFramework, selectedValue, reason, and resolvedBy required'
      });
    }

    const service = new ConsistencyService();
    const resolved = await service.resolveConflict(
      conflictId,
      selectedFramework,
      selectedValue,
      reason,
      auditNote || '',
      resolvedBy
    );

    if (!resolved) {
      return res.status(404).json({
        success: false,
        error: 'Conflict not found'
      });
    }

    res.json({
      success: true,
      conflict: {
        id: resolved.id || resolved._id,
        status: resolved.status,
        resolution: resolved.resolution
      }
    });
  });
});

export default router;
