/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SQL implementations of `/api/emissions/*` routes (DB_DRIVER=sql).
 */

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';
import { serialize } from '../lib/apiSerialize.ts';
import { metricToFactorCategory } from '../lib/emissionMetricMapping.ts';
import { transitionAllowed } from '../lib/metricEntryWorkflow.ts';
import {
  EMISSION_SCOPE_ENUM,
  METRIC_ENTRY_APPROVAL_STAGES,
  type EmissionScope,
  type MetricEntryApprovalStage,
} from '../lib/domainEnums.ts';

function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res: Response, status: number, error: string, code = 'emissions/error') {
  return res.status(status).json({ success: false, error, code });
}

/** Company-wide metrics use SQL NULL (legacy rows may still have ''). */
function normalizeFacilityId(facilityId: string): string | null {
  const trimmed = facilityId.trim();
  return trimmed ? trimmed : null;
}

async function autoCalculateEmissionForMetric(metricEntry: {
  id: string;
  customerId: string;
  year: number;
  value: number | null;
  metricDefinitionCode: string;
  unit: string;
  facilityId: string | null;
  facilityName: string;
  emissionEntryId: string | null;
}): Promise<void> {
  if (metricEntry.value == null) return;
  const factorCategory = metricToFactorCategory[metricEntry.metricDefinitionCode];
  if (!factorCategory) return;
  if (metricEntry.emissionEntryId) return;

  const prisma = getPrisma();
  const factor = await prisma.emissionFactor.findFirst({
    where: { category: factorCategory },
    orderBy: { versionYear: 'desc' },
  });
  if (!factor) return;

  const activityValue = metricEntry.value;
  const resultTCO2e = (activityValue * factor.factorValue) / 1000;
  const formula = `${activityValue} × ${factor.factorValue} / 1000`;

  const entry = await prisma.emissionEntry.create({
    data: {
      customerId: metricEntry.customerId,
      year: metricEntry.year,
      scope: factor.scope,
      category: factor.category,
      activityValue,
      activityUnit: metricEntry.unit,
      emissionFactorId: factor.id,
      factorValue: factor.factorValue,
      facilityId: metricEntry.facilityId || null,
      facilityName: metricEntry.facilityName || '',
      resultTCO2e,
      calculationFormula: formula,
      notes: `Auto-calculated from MetricEntry ${metricEntry.id}`,
    },
  });

  await prisma.metricEntry.update({
    where: { id: metricEntry.id },
    data: { emissionEntryId: entry.id },
  });
}

export async function getFactors(_req: Request, res: Response) {
  const docs = await getPrisma().emissionFactor.findMany({
    where: { isActive: true },
    orderBy: [{ scope: 'asc' }, { name: 'asc' }],
  });
  const grouped: Record<EmissionScope, unknown[]> = {
    SCOPE_1: [],
    SCOPE_2: [],
    SCOPE_3: [],
  };
  for (const doc of docs) {
    const factor = serialize(doc);
    if (grouped[factor.scope as EmissionScope]) {
      grouped[factor.scope as EmissionScope].push(factor);
    }
  }
  return success(res, grouped);
}

export async function getSummary(req: Request, res: Response) {
  const customerId = typeof req.query.customerId === 'string' ? req.query.customerId.trim() : '';
  const yearRaw = typeof req.query.year === 'string' ? req.query.year.trim() : '';

  if (!customerId) {
    return failure(res, 400, 'customerId is required', 'emissions/validation-error');
  }

  const year = Number(yearRaw);
  const where: Prisma.EmissionEntryWhereInput = { customerId };
  if (yearRaw && !Number.isNaN(year)) where.year = year;

  const facilityIdFilter =
    typeof req.query.facilityId === 'string' ? req.query.facilityId.trim() : '';
  if (facilityIdFilter) where.facilityId = facilityIdFilter;

  const docs = await getPrisma().emissionEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  const entries = docs.map((doc) => serialize(doc));

  let scope1Total = 0;
  let scope2Total = 0;
  let scope3Total = 0;
  for (const entry of entries) {
    const value = Number(entry.resultTCO2e) || 0;
    if (entry.scope === 'SCOPE_1') scope1Total += value;
    else if (entry.scope === 'SCOPE_2') scope2Total += value;
    else if (entry.scope === 'SCOPE_3') scope3Total += value;
  }

  const facilityMap = new Map<
    string,
    { facilityId: string; facilityName: string; scope1Total: number; scope2Total: number; scope3Total: number }
  >();
  for (const entry of entries) {
    if (!entry.facilityId) continue;
    const key = entry.facilityId as string;
    if (!facilityMap.has(key)) {
      facilityMap.set(key, {
        facilityId: key,
        facilityName: (entry.facilityName as string) || '',
        scope1Total: 0,
        scope2Total: 0,
        scope3Total: 0,
      });
    }
    const row = facilityMap.get(key)!;
    if (entry.scope === 'SCOPE_1') row.scope1Total += Number(entry.resultTCO2e);
    if (entry.scope === 'SCOPE_2') row.scope2Total += Number(entry.resultTCO2e);
    if (entry.scope === 'SCOPE_3') row.scope3Total += Number(entry.resultTCO2e);
  }
  const byFacility = [...facilityMap.values()].sort((a, b) =>
    a.facilityName.localeCompare(b.facilityName, 'tr'),
  );

  let scope2MarketBased: number | null = null;
  if (year && !Number.isNaN(year)) {
    const market = await getPrisma().scope2MarketData.findUnique({
      where: { customerId_year: { customerId, year } },
    });
    if (market) {
      const elecEntries = entries.filter(
        (e) => e.scope === 'SCOPE_2' && (e.activityUnit === 'kWh' || e.activityUnit === 'MWh'),
      );
      const locationElecMWh = elecEntries.reduce(
        (sum, e) =>
          sum + (e.activityUnit === 'kWh' ? Number(e.activityValue) / 1000 : Number(e.activityValue)),
        0,
      );
      const scope2ElecTCO2e = elecEntries.reduce((sum, e) => sum + Number(e.resultTCO2e), 0);
      const locationFactorTCO2ePerMWh = locationElecMWh > 0 ? scope2ElecTCO2e / locationElecMWh : 0;
      const residualMWh = Math.max(0, locationElecMWh - market.certificateMWh);
      scope2MarketBased =
        residualMWh * locationFactorTCO2ePerMWh +
        market.certificateMWh * market.contractualFactorKgCO2ePerKWh;
    }
  }

  let intensityMetrics:
    | { tCO2ePerMillionTRY: number | null; tCO2ePerProductionTon: number | null; tCO2ePerEmployee: number | null }
    | null = null;
  if (year && !Number.isNaN(year)) {
    const intensity = await getPrisma().emissionIntensityInput.findUnique({
      where: { customerId_year: { customerId, year } },
    });
    if (intensity) {
      const base = scope1Total + scope2Total;
      intensityMetrics = {
        tCO2ePerMillionTRY: intensity.revenueMillionTRY ? base / intensity.revenueMillionTRY : null,
        tCO2ePerProductionTon: intensity.productionTons ? base / intensity.productionTons : null,
        tCO2ePerEmployee: intensity.employeeCount ? base / intensity.employeeCount : null,
      };
    }
  }

  return success(res, {
    scope1Total,
    scope2Total,
    scope3Total,
    scope2LocationBased: scope2Total,
    scope2MarketBased,
    byFacility,
    intensityMetrics,
    entries,
  });
}

export async function postCalculate(req: Request, res: Response) {
  const body = req.body || {};
  const customerId = typeof body.customerId === 'string' ? body.customerId.trim() : '';
  const emissionFactorId =
    typeof body.emissionFactorId === 'string' ? body.emissionFactorId.trim() : '';
  const year = Number(body.year);
  const activityValue = Number(body.activityValue);
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const facilityId = typeof body.facilityId === 'string' ? body.facilityId.trim() : '';
  const userId = (req as { userId?: string }).userId;

  if (!customerId || !emissionFactorId) {
    return failure(res, 400, 'customerId and emissionFactorId are required', 'emissions/validation-error');
  }
  if (!Number.isFinite(year)) {
    return failure(res, 400, 'A valid year is required', 'emissions/validation-error');
  }
  if (!Number.isFinite(activityValue) || activityValue < 0) {
    return failure(res, 400, 'A valid activityValue is required', 'emissions/validation-error');
  }

  const prisma = getPrisma();
  const factorDoc = await findByIdOrLegacy(prisma.emissionFactor, emissionFactorId);
  if (!factorDoc) {
    return failure(res, 404, 'Emission factor not found', 'emissions/factor-not-found');
  }
  const factor = factorDoc as {
    scope: string;
    category: string;
    activityUnit: string;
    factorValue: number;
    factorUnit: string;
    id: string;
  };
  if (!(EMISSION_SCOPE_ENUM as readonly string[]).includes(factor.scope)) {
    return failure(res, 400, 'Emission factor has an invalid scope', 'emissions/invalid-scope');
  }

  let facilityName = '';
  if (facilityId) {
    const branch = await findByIdOrLegacy(prisma.branch, facilityId);
    if (!branch) {
      return failure(res, 404, 'Facility (branch) not found', 'emissions/facility-not-found');
    }
    facilityName = String(branch.name || '');
  }

  const resultTCO2e = (activityValue * factor.factorValue) / 1000;
  const calculationFormula = `${activityValue} ${factor.activityUnit} × ${factor.factorValue} ${factor.factorUnit} ÷ 1000`;

  const entry = await prisma.emissionEntry.create({
    data: {
      customerId,
      year,
      scope: factor.scope,
      category: factor.category,
      activityValue,
      activityUnit: factor.activityUnit,
      emissionFactorId: factor.id,
      factorValue: factor.factorValue,
      facilityId: facilityId || null,
      facilityName: facilityName || '',
      resultTCO2e,
      calculationFormula,
      notes,
      createdBy: userId,
    },
  });

  return success(res, serialize(entry), 201);
}

export async function getIntensity(req: Request, res: Response) {
  const { customerId, year } = req.query;
  if (!customerId || !year) {
    return failure(res, 400, 'customerId and year required', 'emissions/validation-error');
  }
  const doc = await getPrisma().emissionIntensityInput.findUnique({
    where: {
      customerId_year: { customerId: String(customerId), year: Number(year) },
    },
  });
  return success(res, doc ? serialize(doc) : null);
}

export async function putIntensity(req: Request, res: Response) {
  const { customerId, year, revenueMillionTRY, productionTons, employeeCount } = req.body;
  if (!customerId || !year) {
    return failure(res, 400, 'customerId and year required', 'emissions/validation-error');
  }
  const toNum = (v: unknown) =>
    v === '' || v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null;
  const cid = String(customerId);
  const yr = Number(year);
  const doc = await getPrisma().emissionIntensityInput.upsert({
    where: { customerId_year: { customerId: cid, year: yr } },
    create: {
      customerId: cid,
      year: yr,
      revenueMillionTRY: toNum(revenueMillionTRY),
      productionTons: toNum(productionTons),
      employeeCount: toNum(employeeCount),
    },
    update: {
      revenueMillionTRY: toNum(revenueMillionTRY),
      productionTons: toNum(productionTons),
      employeeCount: toNum(employeeCount),
      updatedAt: new Date(),
    },
  });
  return success(res, serialize(doc));
}

export async function getScope2Market(req: Request, res: Response) {
  const { customerId, year } = req.query;
  if (!customerId || !year) {
    return failure(res, 400, 'customerId and year required', 'emissions/validation-error');
  }
  const doc = await getPrisma().scope2MarketData.findUnique({
    where: {
      customerId_year: { customerId: String(customerId), year: Number(year) },
    },
  });
  return success(res, doc ? serialize(doc) : null);
}

export async function putScope2Market(req: Request, res: Response) {
  const { customerId, year, certificateMWh, contractualFactorKgCO2ePerKWh } = req.body;
  if (!customerId || !year) {
    return failure(res, 400, 'customerId and year required', 'emissions/validation-error');
  }
  const toNum = (v: unknown, def = 0) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : def);
  const cid = String(customerId);
  const yr = Number(year);
  const doc = await getPrisma().scope2MarketData.upsert({
    where: { customerId_year: { customerId: cid, year: yr } },
    create: {
      customerId: cid,
      year: yr,
      certificateMWh: toNum(certificateMWh),
      contractualFactorKgCO2ePerKWh: toNum(contractualFactorKgCO2ePerKWh),
    },
    update: {
      certificateMWh: toNum(certificateMWh),
      contractualFactorKgCO2ePerKWh: toNum(contractualFactorKgCO2ePerKWh),
      updatedAt: new Date(),
    },
  });
  return success(res, serialize(doc));
}

export async function getYearlyTotals(req: Request, res: Response) {
  const { customerId, years: yearsParam } = req.query;
  if (!customerId) {
    return failure(res, 400, 'customerId required', 'emissions/validation-error');
  }
  const years = String(yearsParam || '')
    .split(',')
    .map(Number)
    .filter((y) => Number.isFinite(y) && y > 1900)
    .slice(0, 10);
  if (!years.length) return success(res, []);

  const agg = await getPrisma().emissionEntry.groupBy({
    by: ['year', 'scope'],
    where: { customerId: String(customerId), year: { in: years } },
    _sum: { resultTCO2e: true },
  });

  const result = years
    .sort((a, b) => a - b)
    .map((year) => {
      const s1 =
        agg.find((r) => r.year === year && r.scope === 'SCOPE_1')?._sum.resultTCO2e ?? 0;
      const s2 =
        agg.find((r) => r.year === year && r.scope === 'SCOPE_2')?._sum.resultTCO2e ?? 0;
      return { year, scope1Total: Number(s1), scope2Total: Number(s2) };
    });
  return success(res, result);
}

export async function getMetricDefinitions(_req: Request, res: Response) {
  const docs = await getPrisma().metricDefinition.findMany({
    orderBy: [{ scope: 'asc' }, { name: 'asc' }],
  });
  const grouped: { scope1: unknown[]; scope2: unknown[]; scope3: unknown[] } = {
    scope1: [],
    scope2: [],
    scope3: [],
  };
  for (const doc of docs) {
    const def = serialize(doc);
    if (def.scope === 'SCOPE_1') grouped.scope1.push(def);
    else if (def.scope === 'SCOPE_2') grouped.scope2.push(def);
    else if (def.scope === 'SCOPE_3') grouped.scope3.push(def);
  }
  return success(res, grouped);
}

export async function getMetricEntries(req: Request, res: Response) {
  const customerId = typeof req.query.customerId === 'string' ? req.query.customerId.trim() : '';
  const yearRaw = typeof req.query.year === 'string' ? req.query.year.trim() : '';
  const year = Number(yearRaw);

  if (!customerId) {
    return failure(res, 400, 'customerId is required', 'emissions/validation-error');
  }
  if (!Number.isFinite(year)) {
    return failure(res, 400, 'A valid year is required', 'emissions/validation-error');
  }

  const prisma = getPrisma();
  const entries = (
    await prisma.metricEntry.findMany({ where: { customerId, year } })
  ).map((doc) => serialize(doc));

  const definitionIds = [...new Set(entries.map((e) => e.metricDefinitionId).filter(Boolean))];
  const definitions = definitionIds.length
    ? await prisma.metricDefinition.findMany({ where: { id: { in: definitionIds as string[] } } })
    : [];
  const definitionById = new Map(definitions.map((d) => [d.id, serialize(d)]));

  const enriched = entries.map((entry) => ({
    ...entry,
    metricDefinition: definitionById.get(entry.metricDefinitionId as string) || null,
  }));

  return success(res, enriched);
}

export async function postMetricEntries(req: Request, res: Response) {
  const body = req.body || {};
  const customerId = typeof body.customerId === 'string' ? body.customerId.trim() : '';
  const metricDefinitionId =
    typeof body.metricDefinitionId === 'string' ? body.metricDefinitionId.trim() : '';
  const year = Number(body.year);
  const facilityId = normalizeFacilityId(
    typeof body.facilityId === 'string' ? body.facilityId : '',
  );
  const facilityName = typeof body.facilityName === 'string' ? body.facilityName.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const userId = (req as { userId?: string }).userId;

  if (!customerId || !metricDefinitionId) {
    return failure(
      res,
      400,
      'customerId and metricDefinitionId are required',
      'emissions/validation-error',
    );
  }
  if (!Number.isFinite(year)) {
    return failure(res, 400, 'A valid year is required', 'emissions/validation-error');
  }

  const prisma = getPrisma();
  const definition = await findByIdOrLegacy(prisma.metricDefinition, metricDefinitionId);
  if (!definition) {
    return failure(res, 404, 'Metric definition not found', 'emissions/definition-not-found');
  }

  const metricDefinitionCode = String(definition.code);
  const unit =
    typeof body.unit === 'string' && body.unit.trim()
      ? body.unit.trim()
      : String(definition.unit || '');

  const value =
    body.value === '' || body.value === null || body.value === undefined
      ? null
      : Number(body.value);
  if (value !== null && !Number.isFinite(value)) {
    return failure(res, 400, 'value must be a number', 'emissions/validation-error');
  }

  const existing = await prisma.metricEntry.findFirst({
    where: {
      customerId,
      year,
      metricDefinitionCode,
      ...(facilityId ? { facilityId } : { facilityId: { in: [null, ''] } }),
    },
  });

  const data = {
    customerId,
    year,
    metricDefinitionId: String(definition.id),
    metricDefinitionCode,
    facilityId,
    facilityName: facilityName || '',
    value,
    unit,
    notes,
    ownerUserId: userId,
    updatedAt: new Date(),
  };

  try {
    const doc = existing
      ? await prisma.metricEntry.update({ where: { id: existing.id }, data })
      : await prisma.metricEntry.create({ data });
    return success(res, serialize(doc), 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await prisma.metricEntry.findFirst({
        where: {
          customerId,
          year,
          metricDefinitionCode,
          ...(facilityId ? { facilityId } : { facilityId: { in: [null, ''] } }),
        },
      });
      if (raced) {
        const doc = await prisma.metricEntry.update({ where: { id: raced.id }, data });
        return success(res, serialize(doc), 201);
      }
      return failure(res, 409, 'A metric entry for this scope already exists.', 'emissions/duplicate');
    }
    throw error;
  }
}

export async function patchMetricEntryStage(req: Request, res: Response, jwtSecret: string) {
  const body = req.body || {};
  const newStage = typeof body.stage === 'string' ? (body.stage as MetricEntryApprovalStage) : null;
  const note = typeof body.note === 'string' ? body.note.trim() : '';

  if (!newStage || !(METRIC_ENTRY_APPROVAL_STAGES as readonly string[]).includes(newStage)) {
    return failure(res, 400, 'A valid stage is required', 'emissions/validation-error');
  }

  const prisma = getPrisma();
  const entry = await findByIdOrLegacy(prisma.metricEntry, req.params.id);
  if (!entry) {
    return failure(res, 404, 'Metric entry not found', 'emissions/entry-not-found');
  }

  const currentStage = String(entry.approvalStage) as MetricEntryApprovalStage;

  const header = req.headers.authorization || '';
  let role = '';
  let changedByName = '';
  try {
    const decoded = jwt.verify(header.slice('Bearer '.length), jwtSecret) as {
      role?: string;
      name?: string;
      email?: string;
    };
    role = decoded.role || '';
    changedByName =
      (typeof body.changedByName === 'string' && body.changedByName.trim()) ||
      decoded.name ||
      decoded.email ||
      '';
  } catch {
    return failure(res, 401, 'Invalid or expired token', 'auth/invalid-token');
  }

  if (!transitionAllowed(currentStage, newStage, role)) {
    return failure(
      res,
      403,
      `Transition from ${currentStage} to ${newStage} is not allowed for your role`,
      'emissions/transition-not-allowed',
    );
  }

  if (newStage === 'MANAGER_REVIEW' && entry.value == null) {
    return failure(
      res,
      422,
      'Değer girilmeden onay akışı başlatılamaz.',
      'emissions/value-required',
    );
  }

  const logEntry = {
    stage: newStage,
    changedBy: (req as { userId?: string }).userId || '',
    changedByName,
    changedAt: new Date().toISOString(),
    ...(note ? { note } : {}),
  };

  const priorLog = Array.isArray(entry.approvalStatusLog) ? entry.approvalStatusLog : [];
  const updated = await prisma.metricEntry.update({
    where: { id: String(entry.id) },
    data: {
      approvalStage: newStage,
      approvalStatusLog: [...priorLog, logEntry],
      updatedAt: new Date(),
    },
  });

  if (newStage === 'APPROVED') {
    autoCalculateEmissionForMetric({
      id: updated.id,
      customerId: updated.customerId,
      year: updated.year,
      value: updated.value,
      metricDefinitionCode: updated.metricDefinitionCode,
      unit: updated.unit,
      facilityId: updated.facilityId,
      facilityName: updated.facilityName,
      emissionEntryId: updated.emissionEntryId,
    }).catch((err: { message?: string }) => console.error('[AutoEmission] Failed:', err?.message));
  }

  return success(res, serialize(updated));
}
