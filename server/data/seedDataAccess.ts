/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistence helpers for boot-time seed scripts (Batch E).
 */

import { Prisma } from '@prisma/client';
import { getPrisma } from './prismaClient.ts';

export async function countEmissionFactors(): Promise<number> {
  return getPrisma().emissionFactor.count();
}

export async function upsertEmissionFactorByName(
  name: string,
  data: Record<string, unknown>,
): Promise<void> {
  const existing = await getPrisma().emissionFactor.findFirst({ where: { name } });
  const payload = { ...data, name, isActive: true } as Prisma.EmissionFactorUncheckedCreateInput;
  if (existing) {
    await getPrisma().emissionFactor.update({ where: { id: existing.id }, data: payload });
  } else {
    await getPrisma().emissionFactor.create({ data: payload });
  }
}

export async function updateEmissionFactorByName(
  name: string,
  data: Record<string, unknown>,
): Promise<void> {
  const existing = await getPrisma().emissionFactor.findFirst({ where: { name } });
  if (!existing) return;
  await getPrisma().emissionFactor.update({
    where: { id: existing.id },
    data: data as Prisma.EmissionFactorUpdateInput,
  });
}

export async function countMetricDefinitions(): Promise<number> {
  return getPrisma().metricDefinition.count();
}

export async function insertMetricDefinitions(rows: Record<string, unknown>[]): Promise<void> {
  await getPrisma().metricDefinition.createMany({
    data: rows.map((row) => ({
      code: String(row.code),
      name: String(row.name),
      nameTr: String(row.nameTr),
      category: String(row.category),
      unit: String(row.unit),
      isRequired: Boolean(row.isRequired),
      scope: String(row.scope),
    })),
  });
}

export async function countClimateScenarios(): Promise<number> {
  return getPrisma().climateScenario.count();
}

export async function upsertClimateScenarioByPathwayId(
  pathwayId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const payload = {
    projectId: '__gfanz_platform_seed__',
    pathwayId,
    pathwayName: String(data.pathwayName ?? ''),
    scenarioDescription: String(data.description ?? ''),
    financialImpact: {
      emissionsReduction2030: data.emissionsReduction2030,
      emissionsReduction2050: data.emissionsReduction2050,
      characteristics: data.characteristics,
      sectorTargets: data.sectorTargets,
    } as Prisma.InputJsonValue,
  };
  const existing = await getPrisma().climateScenario.findFirst({ where: { pathwayId } });
  if (existing) {
    await getPrisma().climateScenario.update({ where: { id: existing.id }, data: payload });
  } else {
    await getPrisma().climateScenario.create({ data: payload });
  }
}

export async function countTransitionLeverTemplates(): Promise<number> {
  return getPrisma().transitionLeverTemplate.count();
}

export async function upsertTransitionLeverById(
  leverId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const payload = {
    leverId,
    leverName: String(data.leverName ?? ''),
    category: String(data.category ?? ''),
    description: String(data.description ?? ''),
    applicableIndustries: (data.applicableIndustries ?? []) as Prisma.InputJsonValue,
    trl: typeof data.trl === 'number' ? data.trl : undefined,
    maturity: data.maturity as string | undefined,
    emissionReductionRange: data.emissionReductionRange as Prisma.InputJsonValue,
    capexRange: data.capexRange as Prisma.InputJsonValue,
    opexRange: data.opexRange as Prisma.InputJsonValue,
    paybackRange: data.paybackRange as Prisma.InputJsonValue,
    implementationDuration: data.implementationDuration as Prisma.InputJsonValue,
    technicalRisk: data.technicalRisk as string | undefined,
    marketRisk: data.marketRisk as string | undefined,
    regulatoryRisk: data.regulatoryRisk as string | undefined,
    sbtEligible: typeof data.sbtEligible === 'boolean' ? data.sbtEligible : undefined,
  };
  const existing = await getPrisma().transitionLeverTemplate.findFirst({ where: { leverId } });
  if (existing) {
    await getPrisma().transitionLeverTemplate.update({ where: { id: existing.id }, data: payload });
  } else {
    await getPrisma().transitionLeverTemplate.create({ data: payload });
  }
}

export async function countFrameworkRequirements(): Promise<number> {
  return getPrisma().frameworkRequirement.count();
}

export async function upsertFrameworkRequirementByDisclosureId(
  disclosureId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const existing = await getPrisma().frameworkRequirement.findFirst({ where: { disclosureId } });
  const payload = {
    frameworkId: String(data.frameworkId),
    frameworkName: String(data.frameworkName),
    version: String(data.version ?? '2023'),
    topicId: String(data.topicId ?? ''),
    topicName: String(data.topicName ?? ''),
    disclosureId,
    disclosureName: String(data.disclosureName ?? ''),
    dataPointKeys: (data.dataPointKeys ?? []) as Prisma.InputJsonValue,
    alternateDataKeys: (data.alternateDataKeys ?? []) as Prisma.InputJsonValue,
    description: String(data.description ?? ''),
    guidance: data.guidance != null ? String(data.guidance) : undefined,
    materiality: Boolean(data.materiality),
    priority: String(data.priority ?? 'high'),
    mandatory: Boolean(data.mandatory ?? true),
  };
  if (existing) {
    await getPrisma().frameworkRequirement.update({ where: { id: existing.id }, data: payload });
  } else {
    await getPrisma().frameworkRequirement.create({ data: payload });
  }
}

export async function countFrameworkMappings(): Promise<number> {
  return getPrisma().frameworkMapping.count();
}

export async function upsertFrameworkMappingById(
  mappingId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const existing = await getPrisma().frameworkMapping.findFirst({ where: { mappingId } });
  const payload = {
    mappingId,
    mappingName: String(data.mappingName ?? ''),
    equivalenceLevel: String(data.equivalenceLevel ?? ''),
    varianceThresholdPercent: Number(data.varianceThresholdPercent ?? 0),
    varianceReasonGuide: (data.varianceReasonGuide ?? []) as Prisma.InputJsonValue,
    frameworks: (data.frameworks ?? []) as Prisma.InputJsonValue,
  };
  if (existing) {
    await getPrisma().frameworkMapping.update({ where: { id: existing.id }, data: payload });
  } else {
    await getPrisma().frameworkMapping.create({ data: payload });
  }
}

export async function countNaceCodeMappings(): Promise<number> {
  return getPrisma().naceCodeMapping.count();
}

export async function upsertSasbMacroSectorById(
  id: string,
  data: { labelEn: string; labelTr: string; sortOrder: number },
): Promise<void> {
  await getPrisma().sasbMacroSector.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  });
}

export async function upsertSasbSubSectorById(
  id: string,
  data: { macroId: string; labelEn: string; labelTr: string; sortOrder: number },
): Promise<void> {
  await getPrisma().sasbSubSector.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  });
}

export async function upsertNaceCodeMappingByCode(
  code: string,
  data: {
    descriptionEn: string;
    descriptionTr: string;
    sasbSubSectorId: string;
    sortOrder: number;
  },
): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const existing = await getPrisma().naceCodeMapping.findUnique({ where: { code: normalized } });
  if (existing) {
    await getPrisma().naceCodeMapping.update({ where: { id: existing.id }, data });
  } else {
    await getPrisma().naceCodeMapping.create({
      data: { id: `nace-${normalized}`, code: normalized, ...data },
    });
  }
}
