import { DataPointResolver } from './DataPointResolver';
import { FrameworkRegistry } from './FrameworkRegistry';
import { findProjectById } from '../../data/entityLookup.ts';
import * as complianceData from '../../data/complianceDataAccess.ts';

export interface Gap {
  disclosureId: string;
  disclosureName: string;
  reason: 'no_data' | 'insufficient_data' | 'not_applicable';
  suggestedDataPoint?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * CompletenessService validates that a project answers all required
 * disclosures for claimed frameworks.
 */
export class CompletenessService {
  constructor(private registry: FrameworkRegistry) {}

  /**
   * Validate completeness for a project against claimed frameworks.
   * Async: enqueues computation, returns immediately.
   */
  async validateCompleteness(
    projectId: string,
    frameworkIds: string[],
    userId: string
  ): Promise<{ jobId: string; status: string }> {
    setImmediate(() => {
      this.runValidation(projectId, frameworkIds, userId).catch((error) => {
        console.error(`Validation failed for project ${projectId}:`, error);
      });
    });

    return { jobId: projectId, status: 'queued' };
  }

  private async runValidation(projectId: string, frameworkIds: string[], userId: string): Promise<void> {
    try {
      const startTime = Date.now();

      const project = await findProjectById(projectId);
      if (!project) throw new Error(`Project ${projectId} not found`);

      const answers = await complianceData.findAnswersByProjectId(projectId);
      const emissions = await complianceData.findEmissionsByProjectId(projectId);
      const dma = await complianceData.findMaterialityByProjectId(projectId);
      const projectQuestions = await complianceData.findProjectQuestionsByProjectId(projectId);

      const resolver = new DataPointResolver(
        projectId,
        project,
        answers,
        emissions,
        dma,
        projectQuestions
      );

      for (const frameworkId of frameworkIds) {
        await this.validateFramework(projectId, frameworkId, resolver, userId, startTime);
      }

      console.log(`✓ Completeness validation finished for project ${projectId} in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`✗ Completeness validation failed for project ${projectId}:`, error);
    }
  }

  private async validateFramework(
    projectId: string,
    frameworkId: string,
    resolver: DataPointResolver,
    userId: string,
    startTime: number
  ): Promise<void> {
    const requirements = await this.registry.getFrameworkRequirements(frameworkId, false);

    const gaps: Gap[] = [];
    let answeredCount = 0;

    for (const req of requirements) {
      if (req.materiality && !this.isMaterial(projectId)) {
        continue;
      }

      let answered = false;
      if (req.dataPointKeys && req.dataPointKeys.length > 0) {
        for (const key of req.dataPointKeys) {
          const hasData = await resolver.hasDataPoint(key);
          if (hasData) {
            answered = true;
            break;
          }
        }
      }

      if (!answered && req.alternateDataKeys) {
        for (const key of req.alternateDataKeys) {
          const hasData = await resolver.hasDataPoint(key);
          if (hasData) {
            answered = true;
            break;
          }
        }
      }

      if (answered) {
        answeredCount++;
      } else {
        gaps.push({
          disclosureId: req.disclosureId,
          disclosureName: req.disclosureName,
          reason: 'no_data',
          suggestedDataPoint: req.dataPointKeys?.[0],
          priority: req.priority
        });
      }
    }

    const totalRequirements = requirements.length;
    const completionPercentage = totalRequirements > 0 ? (answeredCount / totalRequirements) * 100 : 0;
    const status = gaps.length === 0 ? 'complete' : gaps.length > 0 ? 'gaps_exist' : 'in_progress';
    const criticalGapCount = gaps.filter((g) => g.priority === 'critical').length;

    await complianceData.createComplianceRun({
      projectId,
      frameworkId,
      totalRequirements,
      answeredRequirements: answeredCount,
      completionPercentage,
      gaps,
      status,
      criticalGapCount,
      validationStartedAt: new Date(startTime),
      validationCompletedAt: new Date(),
      validationDurationMs: Date.now() - startTime,
      createdBy: userId,
      ownerId: userId
    });

    console.log(`  ✓ ${frameworkId}: ${completionPercentage.toFixed(1)}% complete (${gaps.length} gaps)`);
  }

  private isMaterial(_projectId: string): boolean {
    return true;
  }

  async getComplianceRun(projectId: string, frameworkId: string): Promise<any | null> {
    return complianceData.findLatestComplianceRun(projectId, frameworkId);
  }

  async getComplianceRuns(projectId: string): Promise<any[]> {
    return complianceData.findComplianceRunsByProjectId(projectId);
  }
}
