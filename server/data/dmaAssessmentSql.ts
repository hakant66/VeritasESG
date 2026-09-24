/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SQL implementations of `/api/dma/*-assessment` routes (GRI, ESRS, ISSB).
 */

import type { Request, Response } from 'express';
import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';
import { serialize } from '../lib/apiSerialize.ts';

type AssessmentFramework = 'gri' | 'esrs' | 'issb';

type FrameworkConfig = {
  designCustomerId: string;
  rowIdField: 'griRowId' | 'esrsRowId' | 'issbRowId';
  notFoundLabel: string;
  errorPrefix: string;
};

const FRAMEWORKS: Record<AssessmentFramework, FrameworkConfig> = {
  gri: {
    designCustomerId: '_materiality_design_gri',
    rowIdField: 'griRowId',
    notFoundLabel: 'GRI row not found',
    errorPrefix: 'gri-assessment',
  },
  esrs: {
    designCustomerId: '_materiality_design_esrs',
    rowIdField: 'esrsRowId',
    notFoundLabel: 'ESRS row not found',
    errorPrefix: 'esrs-assessment',
  },
  issb: {
    designCustomerId: '_materiality_design_issb',
    rowIdField: 'issbRowId',
    notFoundLabel: 'ISSB row not found',
    errorPrefix: 'issb-assessment',
  },
};

type AssessmentScore = {
  financialImpact: number;
  impactSeverity: number;
  probability: number;
  stakeholderConcern: number;
  isMaterial: boolean;
};

function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res: Response, status: number, error: string, code: string) {
  return res.status(status).json({ success: false, error, code });
}

function computeIsMaterial(
  financialImpact: number,
  impactSeverity: number,
  probability: number,
  stakeholderConcern: number,
): boolean {
  return financialImpact >= 4 || impactSeverity >= 4 || stakeholderConcern >= 4;
}

async function loadScores(
  framework: AssessmentFramework,
  customerId: string,
  year: number,
): Promise<Map<string, AssessmentScore>> {
  const prisma = getPrisma();
  if (framework === 'gri') {
    const scores = await prisma.gRIAssessmentScore.findMany({ where: { customerId, year } });
    return new Map(scores.map((s) => [s.griRowId, s]));
  }
  if (framework === 'esrs') {
    const scores = await prisma.eSRSAssessmentScore.findMany({ where: { customerId, year } });
    return new Map(scores.map((s) => [s.esrsRowId, s]));
  }
  const scores = await prisma.iSSBAssessmentScore.findMany({ where: { customerId, year } });
  return new Map(scores.map((s) => [s.issbRowId, s]));
}

async function upsertScore(
  framework: AssessmentFramework,
  data: Record<string, unknown>,
) {
  const prisma = getPrisma();
  if (framework === 'gri') {
    return prisma.gRIAssessmentScore.upsert({
      where: {
        customerId_year_griRowId: {
          customerId: String(data.customerId),
          year: Number(data.year),
          griRowId: String(data.griRowId),
        },
      },
      create: data as Parameters<typeof prisma.gRIAssessmentScore.upsert>[0]['create'],
      update: data as Parameters<typeof prisma.gRIAssessmentScore.upsert>[0]['update'],
    });
  }
  if (framework === 'esrs') {
    return prisma.eSRSAssessmentScore.upsert({
      where: {
        customerId_year_esrsRowId: {
          customerId: String(data.customerId),
          year: Number(data.year),
          esrsRowId: String(data.esrsRowId),
        },
      },
      create: data as Parameters<typeof prisma.eSRSAssessmentScore.upsert>[0]['create'],
      update: data as Parameters<typeof prisma.eSRSAssessmentScore.upsert>[0]['update'],
    });
  }
  return prisma.iSSBAssessmentScore.upsert({
    where: {
      customerId_year_issbRowId: {
        customerId: String(data.customerId),
        year: Number(data.year),
        issbRowId: String(data.issbRowId),
      },
    },
    create: data as Parameters<typeof prisma.iSSBAssessmentScore.upsert>[0]['create'],
    update: data as Parameters<typeof prisma.iSSBAssessmentScore.upsert>[0]['update'],
  });
}

export async function getAssessment(framework: AssessmentFramework, req: Request, res: Response) {
  const config = FRAMEWORKS[framework];
  const { customerId, year } = req.query;
  if (!customerId) {
    return failure(res, 400, 'customerId required', `${config.errorPrefix}/invalid-params`);
  }

  const prisma = getPrisma();
  const assessmentYear = Number(year || new Date().getFullYear());

  const rows = await prisma.gRIMaterialityMatrixRow.findMany({
    where: { customerId: config.designCustomerId },
    orderBy: { order: 'asc' },
  });

  const scoreMap = await loadScores(framework, String(customerId), assessmentYear);

  const merged = rows.map((row) => {
    const score = scoreMap.get(row.id);
    return {
      id: row.id,
      order: row.order,
      subject: row.subject,
      griMapping: row.griMapping,
      disclosures: row.disclosures,
      notes: row.notes || '',
      financialImpact: score?.financialImpact || 0,
      impactSeverity: score?.impactSeverity || 0,
      probability: score?.probability || 0,
      stakeholderConcern: score?.stakeholderConcern || 0,
      isMaterial: score?.isMaterial || false,
      hasScore: !!score,
    };
  });

  return success(res, { rows: merged });
}

export async function putAssessmentScore(
  framework: AssessmentFramework,
  req: Request,
  res: Response,
) {
  const config = FRAMEWORKS[framework];
  const rowIdField = config.rowIdField;
  const {
    customerId,
    year,
    financialImpact,
    impactSeverity,
    probability,
    stakeholderConcern,
  } = req.body;
  const rowId = req.body[rowIdField];

  if (!customerId || !year || !rowId) {
    return failure(res, 400, 'Missing required fields', `${config.errorPrefix}/invalid-params`);
  }

  const prisma = getPrisma();
  const templateRow = await findByIdOrLegacy(prisma.gRIMaterialityMatrixRow, String(rowId));
  if (!templateRow) {
    return failure(res, 404, config.notFoundLabel, `${config.errorPrefix}/not-found`);
  }

  const isMaterial = computeIsMaterial(
    financialImpact,
    impactSeverity,
    probability,
    stakeholderConcern,
  );

  const data = {
    customerId: String(customerId),
    year: Number(year),
    [rowIdField]: String(rowId),
    subject: String(templateRow.subject),
    financialImpact,
    impactSeverity,
    probability,
    stakeholderConcern,
    isMaterial,
    updatedAt: new Date(),
  };

  const doc = await upsertScore(framework, data);
  return success(res, { score: serialize(doc) });
}

export async function postAssessmentScores(
  framework: AssessmentFramework,
  req: Request,
  res: Response,
) {
  const config = FRAMEWORKS[framework];
  const rowIdField = config.rowIdField;
  const { customerId, year, scores } = req.body;

  if (!customerId || !year || !Array.isArray(scores)) {
    return failure(res, 400, 'Invalid params', `${config.errorPrefix}/invalid-params`);
  }

  await Promise.all(
    scores.map((s: Record<string, unknown>) => {
      const rowId = String(s[rowIdField]);
      const fi = Number(s.financialImpact) || 0;
      const is = Number(s.impactSeverity) || 0;
      const pr = Number(s.probability) || 0;
      const sc = Number(s.stakeholderConcern) || 0;
      return upsertScore(framework, {
        customerId: String(customerId),
        year: Number(year),
        [rowIdField]: rowId,
        subject: String(s.subject || ''),
        financialImpact: fi,
        impactSeverity: is,
        probability: pr,
        stakeholderConcern: sc,
        isMaterial: computeIsMaterial(fi, is, pr, sc),
        updatedAt: new Date(),
      });
    }),
  );

  return success(res, { saved: scores.length });
}
