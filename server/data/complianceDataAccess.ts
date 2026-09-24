/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistence for compliance services.
 */

import { Prisma } from '@prisma/client';
import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';
import { withExternalId, withExternalIds } from './entityLookup.ts';

export async function findFrameworkRequirements(
  frameworkId: string,
  includeOptional: boolean,
): Promise<Array<Record<string, unknown>>> {
  const rows = await getPrisma().frameworkRequirement.findMany({
    where: {
      frameworkId,
      ...(includeOptional ? {} : { mandatory: true }),
    },
  });
  return withExternalIds(rows as Array<Record<string, unknown>>);
}

export async function findFrameworkRequirementByDisclosure(
  disclosureId: string,
): Promise<Record<string, unknown> | null> {
  const row = await getPrisma().frameworkRequirement.findFirst({ where: { disclosureId } });
  return withExternalId(row as Record<string, unknown> | null);
}

export async function findFrameworkRequirementsByTopic(
  frameworkId: string,
  topicId: string,
): Promise<Array<Record<string, unknown>>> {
  const rows = await getPrisma().frameworkRequirement.findMany({ where: { frameworkId, topicId } });
  return withExternalIds(rows as Array<Record<string, unknown>>);
}

export async function findAllFrameworkMappings(): Promise<Array<Record<string, unknown>>> {
  const rows = await getPrisma().frameworkMapping.findMany();
  return withExternalIds(rows as Array<Record<string, unknown>>);
}

export async function findAnswersByProjectId(projectId: string): Promise<Array<Record<string, unknown>>> {
  const rows = await getPrisma().answer.findMany({ where: { projectId } });
  return withExternalIds(rows as Array<Record<string, unknown>>);
}

// EmissionEntry is keyed by customerId, not projectId, so there is no
// project-scoped lookup to perform here.
export async function findEmissionsByProjectId(
  _projectId: string,
): Promise<Array<Record<string, unknown>>> {
  return [];
}

// MaterialityAssessment is keyed by customerId, not projectId.
export async function findMaterialityByProjectId(
  _projectId: string,
): Promise<Array<Record<string, unknown>>> {
  return [];
}

export async function findProjectQuestionsByProjectId(
  projectId: string,
): Promise<Array<Record<string, unknown>>> {
  const rows = await getPrisma().projectQuestion.findMany({ where: { projectId } });
  return withExternalIds(rows as Array<Record<string, unknown>>);
}

export async function createComplianceRun(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const row = await getPrisma().complianceRun.create({
    data: {
      projectId: String(data.projectId),
      frameworkId: String(data.frameworkId),
      totalRequirements: Number(data.totalRequirements),
      answeredRequirements: Number(data.answeredRequirements),
      completionPercentage: Number(data.completionPercentage),
      gaps: (data.gaps ?? []) as Prisma.InputJsonValue,
      status: String(data.status ?? 'in_progress'),
      criticalGapCount: Number(data.criticalGapCount ?? 0),
      validationStartedAt: data.validationStartedAt as Date | undefined,
      validationCompletedAt: data.validationCompletedAt as Date | undefined,
      validationDurationMs: data.validationDurationMs as number | undefined,
      createdBy: data.createdBy as string | undefined,
      ownerId: data.ownerId as string | undefined,
    },
  });
  return withExternalId(row as Record<string, unknown>)!;
}

export async function findLatestComplianceRun(
  projectId: string,
  frameworkId: string,
): Promise<Record<string, unknown> | null> {
  const row = await getPrisma().complianceRun.findFirst({
    where: { projectId, frameworkId },
    orderBy: { createdAt: 'desc' },
  });
  return withExternalId(row as Record<string, unknown> | null);
}

export async function findComplianceRunsByProjectId(
  projectId: string,
): Promise<Array<Record<string, unknown>>> {
  const rows = await getPrisma().complianceRun.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
  return withExternalIds(rows as Array<Record<string, unknown>>);
}

export async function findConsistencyConflicts(
  projectId: string,
  status?: string,
): Promise<Array<Record<string, unknown>>> {
  const rows = await getPrisma().consistencyConflict.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
    },
  });
  return withExternalIds(rows as Array<Record<string, unknown>>);
}

export async function findExistingConsistencyConflict(
  projectId: string,
  mappingId: string,
  framework1Id: string,
  framework2Id: string,
): Promise<Record<string, unknown> | null> {
  const rows = await getPrisma().consistencyConflict.findMany({ where: { projectId, mappingId } });
  const match = rows.find((row) => {
    const f1 = row.framework1 as { frameworkId?: string };
    const f2 = row.framework2 as { frameworkId?: string };
    return f1?.frameworkId === framework1Id && f2?.frameworkId === framework2Id;
  });
  return withExternalId(match as Record<string, unknown> | null);
}

export async function createConsistencyConflict(
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const row = await getPrisma().consistencyConflict.create({
    data: {
      projectId: String(data.projectId),
      mappingId: String(data.mappingId),
      framework1: data.framework1 as Prisma.InputJsonValue,
      framework2: data.framework2 as Prisma.InputJsonValue,
      variance: data.variance as Prisma.InputJsonValue,
      likelyCauses: (data.likelyCauses ?? []) as Prisma.InputJsonValue,
      status: String(data.status ?? 'unresolved'),
      createdBy: data.createdBy as string | undefined,
      ownerId: data.ownerId as string | undefined,
    },
  });
  return withExternalId(row as Record<string, unknown>)!;
}

export async function resolveConsistencyConflict(
  conflictId: string,
  resolution: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const prisma = getPrisma();
  const existing = await findByIdOrLegacy(prisma.consistencyConflict, conflictId);
  if (!existing) return null;
  const row = await prisma.consistencyConflict.update({
    where: { id: String(existing.id) },
    data: {
      status: 'reconciled',
      resolution: resolution as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });
  return withExternalId(row as Record<string, unknown>);
}

export async function findUnresolvedConsistencyConflicts(
  projectId: string,
): Promise<Array<Record<string, unknown>>> {
  return findConsistencyConflicts(projectId, 'unresolved');
}
