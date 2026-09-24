/**
 * Service for detecting and managing framework consistency conflicts
 */

import { DataPointResolver } from './DataPointResolver';
import { calculateVariance, inferCauses, parseNumericDataPointValue } from './ConsistencyValidator';
import { findProjectById } from '../../data/entityLookup.ts';
import * as complianceData from '../../data/complianceDataAccess.ts';

export interface ConsistencyCheckResult {
  projectId: string;
  conflicts: any[];
  summary: {
    mappingsChecked: number;
    conflictsFound: number;
    conflictsUnresolved: number;
    conflictsReconciled: number;
  };
}

/**
 * ConsistencyService detects contradictions across frameworks
 */
export class ConsistencyService {
  async checkConsistency(
    projectId: string,
    frameworkIds: string[]
  ): Promise<ConsistencyCheckResult> {
    const startTime = Date.now();

    const project = await findProjectById(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const answers = await complianceData.findAnswersByProjectId(projectId);
    const emissions = await complianceData.findEmissionsByProjectId(projectId);
    const projectQuestions = await complianceData.findProjectQuestionsByProjectId(projectId);

    const resolver = new DataPointResolver(
      projectId,
      project,
      answers,
      emissions,
      [],
      projectQuestions,
    );

    const mappings = await complianceData.findAllFrameworkMappings();

    const conflicts: any[] = [];

    for (const mapping of mappings) {
      const mappingFrameworks = Array.isArray(mapping.frameworks) ? mapping.frameworks : [];
      const relevantFrameworks = mappingFrameworks
        .map((f: { frameworkId?: string }) => String(f.frameworkId ?? ''))
        .filter((f) => f && frameworkIds.includes(f));

      if (relevantFrameworks.length < 2) continue;

      const values = [];
      for (const fw of relevantFrameworks) {
        const fwMapping = mappingFrameworks.find((f: { frameworkId?: string }) => f.frameworkId === fw);
        if (!fwMapping) continue;

        const dataPoint = await resolver.resolve(fwMapping.dataPointKey);
        if (!dataPoint) continue;

        const numericValue = parseNumericDataPointValue(dataPoint.value);
        if (numericValue === null) continue;

        values.push({
          frameworkId: fw,
          indicatorId: fwMapping.indicatorId,
          value: numericValue,
          unit: fwMapping.dataPointKey === 'emissions_intensity' ? 'tCO2e/M€' : 'tCO2e',
          source: dataPoint.source,
          sourceId: dataPoint.sourceId,
          lastUpdated: dataPoint.lastUpdated,
        });
      }

      for (let i = 0; i < values.length - 1; i++) {
        for (let j = i + 1; j < values.length; j++) {
          const conflict = await this.detectConflict(
            projectId,
            mapping,
            values[i],
            values[j]
          );
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }
    }

    console.log(
      `✓ Consistency check completed for project ${projectId} in ${Date.now() - startTime}ms`
    );

    const unresolved = conflicts.filter((c) => c.status === 'unresolved').length;
    const reconciled = conflicts.filter((c) => c.status === 'reconciled').length;

    return {
      projectId,
      conflicts,
      summary: {
        mappingsChecked: mappings.length,
        conflictsFound: conflicts.length,
        conflictsUnresolved: unresolved,
        conflictsReconciled: reconciled,
      },
    };
  }

  private async detectConflict(
    projectId: string,
    mapping: any,
    value1: any,
    value2: any
  ): Promise<any | null> {
    const variance = calculateVariance(
      value1.value,
      value2.value,
      mapping.varianceThresholdPercent || 5
    );

    if (!variance.exceedsThreshold) {
      return null;
    }

    const likelyCauses = inferCauses(
      mapping.varianceReasonGuide || [],
      variance.percentageDifference
    );

    const existing = await complianceData.findExistingConsistencyConflict(
      projectId,
      mapping.mappingId,
      value1.frameworkId,
      value2.frameworkId,
    );

    if (existing) {
      return existing;
    }

    return complianceData.createConsistencyConflict({
      projectId,
      mappingId: mapping.mappingId,
      framework1: value1,
      framework2: value2,
      variance,
      likelyCauses,
      status: 'unresolved',
      createdBy: 'system',
      ownerId: 'system',
    });
  }

  async resolveConflict(
    conflictId: string,
    selectedFramework: string,
    selectedValue: number,
    reason: string,
    auditNote: string,
    resolvedBy: string
  ): Promise<any> {
    return complianceData.resolveConsistencyConflict(conflictId, {
      selectedValue,
      selectedFramework,
      reason,
      auditNote,
      resolvedBy,
      resolvedAt: new Date(),
    });
  }

  async getUnresolvedConflicts(projectId: string): Promise<any[]> {
    return complianceData.findUnresolvedConsistencyConflicts(projectId);
  }
}
