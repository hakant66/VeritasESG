/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SQL implementations of `/api/materiality/*` routes (DB_DRIVER=sql).
 */

import type { Request, Response } from 'express';
import { getPrisma } from './prismaClient.ts';
import { serialize } from '../lib/apiSerialize.ts';
import { ESRS_TOPICS } from '../lib/domainEnums.ts';

function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res: Response, status: number, error: string, code = 'materiality/error') {
  return res.status(status).json({ success: false, error, code });
}

const APPROVE_ROLES = ['platform_admin', 'consultant_manager', 'consultant'];

function computeIsMaterial(
  financialImpact: number,
  impactSeverity: number,
  probability: number,
  stakeholderConcern: number,
): boolean {
  const financialScore = financialImpact * probability;
  const impactScore = impactSeverity * probability;
  return (
    financialImpact >= 4 ||
    impactSeverity >= 4 ||
    stakeholderConcern >= 4 ||
    financialScore >= 12 ||
    impactScore >= 12
  );
}

function isValidScore(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5;
}

function materialTopicsFromScores(scores: Array<{ isMaterial: boolean; esrsId: string }>): string[] {
  return scores.filter((s) => s.isMaterial).map((s) => s.esrsId);
}

export async function getMateriality(req: Request, res: Response) {
  const customerId = typeof req.query.customerId === 'string' ? req.query.customerId.trim() : '';
  const year = Number(req.query.year);
  if (!customerId) {
    return failure(res, 400, 'customerId is required', 'materiality/validation-error');
  }
  if (!Number.isFinite(year)) {
    return failure(res, 400, 'A valid year is required', 'materiality/validation-error');
  }

  const prisma = getPrisma();
  const [assessmentDoc, scoreDocs] = await Promise.all([
    prisma.materialityAssessment.findUnique({ where: { customerId_year: { customerId, year } } }),
    prisma.materialityTopic.findMany({ where: { customerId, year } }),
  ]);

  const scores = scoreDocs.map((doc) => serialize(doc));
  const scoreByEsrs = new Map(scores.map((s) => [s.esrsId, s]));

  const merged = ESRS_TOPICS.map((topic) => {
    const score = scoreByEsrs.get(topic.id);
    if (score) {
      return {
        esrsId: topic.id,
        nameTr: topic.nameTr,
        nameEn: topic.nameEn,
        category: topic.category,
        financialImpact: score.financialImpact,
        impactSeverity: score.impactSeverity,
        probability: score.probability,
        stakeholderConcern: score.stakeholderConcern,
        isMaterial: score.isMaterial,
        notes: score.notes || '',
        hasScore: true,
      };
    }
    return {
      esrsId: topic.id,
      nameTr: topic.nameTr,
      nameEn: topic.nameEn,
      category: topic.category,
      financialImpact: 1,
      impactSeverity: 1,
      probability: 1,
      stakeholderConcern: 1,
      isMaterial: false,
      notes: '',
      hasScore: false,
    };
  });

  return success(res, {
    assessment: assessmentDoc ? serialize(assessmentDoc) : null,
    scores,
    topics: ESRS_TOPICS,
    merged,
  });
}

export async function putMaterialityScore(req: Request, res: Response) {
  const body = req.body || {};
  const customerId = typeof body.customerId === 'string' ? body.customerId.trim() : '';
  const esrsId = typeof body.esrsId === 'string' ? body.esrsId.trim() : '';
  const year = Number(body.year);
  const financialImpact = Number(body.financialImpact);
  const impactSeverity = Number(body.impactSeverity);
  const probability = Number(body.probability);
  const stakeholderConcern = Number(body.stakeholderConcern);
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const userId = (req as { userId?: string }).userId;

  if (!customerId || !esrsId) {
    return failure(res, 400, 'customerId and esrsId are required', 'materiality/validation-error');
  }
  if (!Number.isFinite(year)) {
    return failure(res, 400, 'A valid year is required', 'materiality/validation-error');
  }
  if (!ESRS_TOPICS.some((topic) => topic.id === esrsId)) {
    return failure(res, 400, 'Unknown ESRS topic', 'materiality/validation-error');
  }
  if (
    !isValidScore(financialImpact) ||
    !isValidScore(impactSeverity) ||
    !isValidScore(probability) ||
    !isValidScore(stakeholderConcern)
  ) {
    return failure(res, 400, 'All scores must be integers between 1 and 5', 'materiality/validation-error');
  }

  const isMaterial = computeIsMaterial(
    financialImpact,
    impactSeverity,
    probability,
    stakeholderConcern,
  );

  const prisma = getPrisma();
  const savedTopic = await prisma.materialityTopic.upsert({
    where: { customerId_year_esrsId: { customerId, year, esrsId } },
    create: {
      customerId,
      year,
      esrsId,
      financialImpact,
      impactSeverity,
      probability,
      stakeholderConcern,
      isMaterial,
      notes,
      ownerId: userId,
    },
    update: {
      financialImpact,
      impactSeverity,
      probability,
      stakeholderConcern,
      isMaterial,
      notes,
      ownerId: userId,
      updatedAt: new Date(),
    },
  });

  const allScores = await prisma.materialityTopic.findMany({ where: { customerId, year } });
  const materialTopics = materialTopicsFromScores(allScores);

  const existing = await prisma.materialityAssessment.findUnique({
    where: { customerId_year: { customerId, year } },
  });
  const nextStatus = existing?.status === 'APPROVED' ? 'APPROVED' : 'DRAFT';

  const assessment = await prisma.materialityAssessment.upsert({
    where: { customerId_year: { customerId, year } },
    create: {
      customerId,
      year,
      status: nextStatus,
      materialTopics,
    },
    update: {
      status: nextStatus,
      materialTopics,
      updatedAt: new Date(),
    },
  });

  return success(res, { topic: serialize(savedTopic), assessment: serialize(assessment) });
}

export async function postMaterialityApprove(req: Request, res: Response) {
  const role = (req as { userRole?: string }).userRole as string;
  if (!APPROVE_ROLES.includes(role)) {
    return failure(res, 403, 'Bu işlem için yetkiniz yok', 'materiality/forbidden');
  }

  const body = req.body || {};
  const customerId = typeof body.customerId === 'string' ? body.customerId.trim() : '';
  const year = Number(body.year);
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const userId = (req as { userId?: string }).userId;

  if (!customerId) {
    return failure(res, 400, 'customerId is required', 'materiality/validation-error');
  }
  if (!Number.isFinite(year)) {
    return failure(res, 400, 'A valid year is required', 'materiality/validation-error');
  }

  const prisma = getPrisma();
  const allScores = await prisma.materialityTopic.findMany({ where: { customerId, year } });
  const materialTopics = materialTopicsFromScores(allScores);

  const assessment = await prisma.materialityAssessment.upsert({
    where: { customerId_year: { customerId, year } },
    create: {
      customerId,
      year,
      status: 'APPROVED',
      materialTopics,
      approvedBy: userId,
      approvedAt: new Date(),
      notes: notes || '',
    },
    update: {
      status: 'APPROVED',
      materialTopics,
      approvedBy: userId,
      approvedAt: new Date(),
      ...(notes ? { notes } : {}),
      updatedAt: new Date(),
    },
  });

  return success(res, serialize(assessment));
}

export async function getMaterialityConfig(req: Request, res: Response) {
  const customerId = typeof req.query.customerId === 'string' ? req.query.customerId.trim() : '';
  const year = Number(req.query.year);
  if (!customerId) {
    return failure(res, 400, 'customerId is required', 'materiality/validation-error');
  }
  if (!Number.isFinite(year)) {
    return failure(res, 400, 'A valid year is required', 'materiality/validation-error');
  }

  const assessment = await getPrisma().materialityAssessment.findUnique({
    where: { customerId_year: { customerId, year } },
  });
  const materialTopics: string[] = assessment
    ? ((Array.isArray(assessment.materialTopics)
        ? assessment.materialTopics
        : []) as string[])
    : [];
  const isApproved = assessment ? assessment.status === 'APPROVED' : false;

  return success(res, {
    isApproved,
    materialTopics,
    isE1Material: materialTopics.includes('E1'),
    isDMAComplete: isApproved,
  });
}
