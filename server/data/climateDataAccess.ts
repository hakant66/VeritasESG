/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistence for climate scenario services.
 */

import { Prisma } from '@prisma/client';
import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';
import { withExternalId, withExternalIds } from './entityLookup.ts';

export async function findTransitionLevers(filters: {
  category?: string;
  industry?: string;
}): Promise<Array<Record<string, unknown>>> {
  const rows = await getPrisma().transitionLeverTemplate.findMany({
    where: {
      ...(filters.category ? { category: filters.category } : {}),
    },
  });
  let result = withExternalIds(rows as Array<Record<string, unknown>>);
  if (filters.industry) {
    result = result.filter((row) => {
      const industries = row.applicableIndustries;
      return Array.isArray(industries) && industries.includes(filters.industry);
    });
  }
  return result;
}

export async function findTransitionLeversByLeverIds(
  leverIds: string[],
): Promise<Array<Record<string, unknown>>> {
  const rows = await getPrisma().transitionLeverTemplate.findMany({
    where: { leverId: { in: leverIds } },
  });
  return withExternalIds(rows as Array<Record<string, unknown>>);
}

export async function createClimateScenario(
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const row = await getPrisma().climateScenario.create({
    data: {
      projectId: String(data.projectId),
      scenarioName: data.scenarioName as string | undefined,
      scenarioDescription: data.scenarioDescription as string | undefined,
      pathwayId: data.pathwayId as string | undefined,
      pathwayName: data.pathwayName as string | undefined,
      baselineEmissions: data.baselineEmissions as number | undefined,
      baselineYear: data.baselineYear as number | undefined,
      targetYear: data.targetYear as number | undefined,
      targetEmissions: data.targetEmissions as number | undefined,
      selectedLevers: (data.selectedLevers ?? []) as Prisma.InputJsonValue,
      financialImpact: data.financialImpact as Prisma.InputJsonValue,
      riskAssessment: data.riskAssessment as Prisma.InputJsonValue,
      sbtAlignment: data.sbtAlignment as Prisma.InputJsonValue,
      roadmap: (data.roadmap ?? []) as Prisma.InputJsonValue,
      createdBy: data.createdBy as string | undefined,
      ownerId: data.ownerId as string | undefined,
    },
  });
  return withExternalId(row as Record<string, unknown>)!;
}

export async function findClimateScenariosByProjectId(
  projectId: string,
): Promise<Array<Record<string, unknown>>> {
  const rows = await getPrisma().climateScenario.findMany({ where: { projectId } });
  return withExternalIds(rows as Array<Record<string, unknown>>);
}

export async function findClimateScenarioById(
  scenarioId: string,
): Promise<Record<string, unknown> | null> {
  const row = await findByIdOrLegacy(getPrisma().climateScenario, scenarioId);
  return withExternalId(row);
}

export async function deleteClimateScenarioById(scenarioId: string): Promise<boolean> {
  const prisma = getPrisma();
  const existing = await findByIdOrLegacy(prisma.climateScenario, scenarioId);
  if (!existing) return false;
  await prisma.climateScenario.delete({ where: { id: String(existing.id) } });
  return true;
}
