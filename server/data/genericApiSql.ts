/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SQL implementations of the generic `/api/db` endpoints, used when
 * DB_DRIVER=sql. Each function mirrors the behavior of its Mongoose counterpart
 * in `routes/mongoApi.ts` (filters, sort defaults, validations, serialized JSON)
 * so the HTTP contract is identical for the frontend.
 *
 * The Mongoose path remains the default; these run only behind the flag so the
 * two backends can coexist during the migration.
 */

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { serialize } from '../lib/apiSerialize.ts';
import { convertIncomingDates, stripReservedFields } from '../lib/apiInput.ts';
import { normalizePlatformRole } from '../../lib/platformRoles.ts';
import { recordAnswerUpsertAudit } from '../lib/answerAuditLog.ts';
import {
  questionIdsForDeletedProjectQuestion,
  syncAssignmentsAfterQuestionDeletion,
} from '../lib/assignmentQuestionSync.ts';
import { expandStaleBranchQuestionsInProject } from '../lib/expandStaleBranchQuestionsInProject.ts';
import { repairBranchQuestionTextInProject } from '../lib/repairBranchQuestionTextInProject.ts';
import type { ListQuery, ResourceRepository } from './resourceRepository.ts';
import { getPrisma } from './prismaClient.ts';

// Mirrors routes/mongoApi.ts (kept in sync intentionally; simple value lists).
const QUERY_FIELDS = [
  'answerId', 'assignmentId', 'branchId', 'collection', 'contactId', 'customerId',
  'domainId', 'email', 'emissionFactorId', 'group', 'kbId', 'pageId', 'projectId',
  'recipientId',   'role', 'sasbSubSectorId', 'sectorId', 'sourceQuestionId', 'sourceTemplateId',
  'templateId', 'userId', 'macroId',
];

const SORTABLE_DEFAULTS: Record<string, Record<string, 'asc' | 'desc'>> = {
  auditLogs: { timestamp: 'desc' },
  questions: { order: 'asc' },
  projectPages: { order: 'asc' },
  projectQuestions: { order: 'asc' },
  sectorCategories: { order: 'asc' },
  sasbMacroSectors: { sortOrder: 'asc' },
  sasbSubSectors: { sortOrder: 'asc' },
  naceCodeMappings: { sortOrder: 'asc' },
  templatePages: { order: 'asc' },
  translations: { updatedAt: 'desc' },
};

function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res: Response, status: number, error: string, code = 'api/error') {
  return res.status(status).json({ success: false, error, code });
}

function handlePrismaWriteError(res: Response, error: unknown): Response | null {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return failure(res, 400, 'Validation failed', 'db/validation-error');
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[] | undefined)?.[0] || 'field';
      return failure(res, 409, `A record with this ${target} already exists.`, 'db/duplicate-key');
    }
    if (error.code === 'P2025') {
      return failure(res, 404, 'Record not found', 'db/not-found');
    }
  }
  return null;
}

function buildListQuery(req: Request, resource: string): ListQuery {
  const equals: Record<string, string> = {};
  for (const field of QUERY_FIELDS) {
    const value = req.query[field];
    if (typeof value !== 'string' || !value) continue;
    equals[field] = field === 'email' ? value.toLowerCase() : value;
  }

  let ids: string[] | undefined;
  if (typeof req.query.ids === 'string' && req.query.ids.trim()) {
    ids = req.query.ids.split(',').map((id) => id.trim()).filter(Boolean);
  }

  let timestampGteMs: number | undefined;
  if (typeof req.query.timestampGte === 'string' && req.query.timestampGte.trim()) {
    const ms = Number(req.query.timestampGte);
    if (!Number.isNaN(ms)) timestampGteMs = ms;
  }

  const limit = Math.min(Number(req.query.limit) || 100, 5000);
  const skip = Math.max(0, Number(req.query.skip) || 0);
  const sort = SORTABLE_DEFAULTS[resource] || { createdAt: 'desc' };

  return { equals, ids, timestampGteMs, sort, skip, limit };
}

export async function list(req: Request, res: Response, repo: ResourceRepository, resource: string) {
  if (
    resource === 'projectQuestions' &&
    typeof req.query.projectId === 'string' &&
    req.query.projectId.trim()
  ) {
    const pid = req.query.projectId.trim();
    await expandStaleBranchQuestionsInProject(pid);
    await repairBranchQuestionTextInProject(pid);
  }

  const query = buildListQuery(req, resource);
  const countTotal = req.query.countTotal === 'true' || req.query.countTotal === '1';

  if (countTotal) {
    const [docs, total] = await Promise.all([repo.list(resource, query), repo.count(resource, query)]);
    return success(res, { items: serialize(docs), total });
  }

  const docs = await repo.list(resource, query);
  return success(res, serialize(docs));
}

export async function getById(req: Request, res: Response, repo: ResourceRepository, resource: string) {
  const doc = await repo.findByExternalId(resource, req.params.id);
  if (!doc) return failure(res, 404, 'Record not found', 'db/not-found');
  return success(res, serialize(doc));
}

async function findPlatformUserByEmail(email: string) {
  return getPrisma().platformUser.findFirst({ where: { email: email.toLowerCase() } });
}

export async function create(
  req: Request,
  res: Response,
  repo: ResourceRepository,
  resource: string,
  requesterId: string | undefined,
) {
  const data = convertIncomingDates(req.body);
  if (requesterId && !data.createdBy) data.createdBy = requesterId;

  if (resource === 'platformUsers' && typeof data.role === 'string') {
    const normalized = normalizePlatformRole(data.role);
    if (!normalized) return failure(res, 400, 'Invalid platform role', 'db/validation-error');
    data.role = normalized;
  }

  if (resource === 'platformUsers' && data.email) {
    const existing = await findPlatformUserByEmail(String(data.email));
    if (existing) {
      return failure(
        res,
        409,
        `This email is already registered (${existing.name}). Edit the existing user or choose a different email.`,
        'db/email-duplicate',
      );
    }
  }

  if (resource === 'contacts' && data.email && data.customerId) {
    const emailLower = String(data.email).toLowerCase();
    const conflict = await getPrisma().platformUser.findFirst({
      where: { customerId: String(data.customerId), email: emailLower },
    });
    if (conflict) {
      return failure(
        res,
        400,
        `Bu email adresi zaten bir kullanıcı tarafından kullanılıyor: ${conflict.name}. Paydaş yerine kullanıcı kaydı kullanın.`,
        'db/email-conflict',
      );
    }
  }

  try {
    const doc = await repo.create(resource, data);
    return success(res, serialize(doc), 201);
  } catch (error) {
    const handled = handlePrismaWriteError(res, error);
    if (handled) return handled;
    throw error;
  }
}

export async function bulkCreate(
  req: Request,
  res: Response,
  repo: ResourceRepository,
  resource: string,
  requesterId: string | undefined,
) {
  if (!Array.isArray(req.body.items)) return failure(res, 400, 'items array required', 'db/invalid-bulk');
  const items = req.body.items.map((item: Record<string, unknown>) => {
    const data = convertIncomingDates(item);
    if (requesterId && !data.createdBy) data.createdBy = requesterId;
    return data;
  });

  try {
    const docs = await repo.createMany(resource, items);
    return success(res, serialize(docs), 201);
  } catch (error) {
    const handled = handlePrismaWriteError(res, error);
    if (handled) return handled;
    throw error;
  }
}

export async function patch(req: Request, res: Response, repo: ResourceRepository, resource: string) {
  const data = convertIncomingDates(req.body);

  if (resource === 'platformUsers' && typeof data.role === 'string') {
    const normalized = normalizePlatformRole(data.role);
    if (!normalized) return failure(res, 400, 'Invalid platform role', 'db/validation-error');
    data.role = normalized;
  }

  if (resource === 'contacts' && data.email) {
    const current = await repo.findByExternalId('contacts', req.params.id);
    const customerId = current?.customerId as string | undefined;
    if (customerId) {
      const conflict = await getPrisma().platformUser.findFirst({
        where: { customerId, email: String(data.email).toLowerCase() },
      });
      if (conflict) {
        return failure(
          res,
          400,
          `Bu email adresi zaten bir kullanıcı tarafından kullanılıyor: ${conflict.name}. Paydaş yerine kullanıcı kaydı kullanın.`,
          'db/email-conflict',
        );
      }
    }
  }

  try {
    const doc = await repo.updateByExternalId(resource, req.params.id, data);
    if (!doc) return failure(res, 404, 'Record not found', 'db/not-found');
    return success(res, serialize(doc));
  } catch (error) {
    const handled = handlePrismaWriteError(res, error);
    if (handled) return handled;
    throw error;
  }
}

export async function put(req: Request, res: Response, repo: ResourceRepository, resource: string) {
  const data = convertIncomingDates(req.body);
  const doc = await repo.upsertByLegacyId(resource, req.params.id, data);
  return success(res, serialize(doc));
}

export async function remove(req: Request, res: Response, repo: ResourceRepository, resource: string) {
  const existing =
    resource === 'projectQuestions' ? await repo.findByExternalId(resource, req.params.id) : null;

  const doc = await repo.deleteByExternalId(resource, req.params.id);
  if (!doc) return failure(res, 404, 'Record not found', 'db/not-found');

  if (existing && existing.projectId) {
    const projectId = String(existing.projectId);
    const deletedQuestionIds = questionIdsForDeletedProjectQuestion(existing as unknown as {
      id?: string;
      legacyFirebaseId?: string;
      sourceQuestionId?: string;
    });
    if (req.params.id.trim()) deletedQuestionIds.push(req.params.id.trim());
    await syncAssignmentsAfterQuestionDeletion(projectId, {
      deletedQuestionIds: [...new Set(deletedQuestionIds)],
    });
  }

  return success(res, { id: req.params.id });
}

export async function getSetting(req: Request, res: Response) {
  const setting = await getPrisma().appSetting.findUnique({ where: { key: req.params.key } });
  return success(res, serialize(setting?.data || {}));
}

export async function putSetting(req: Request, res: Response) {
  const key = req.params.key;
  const data = stripReservedFields(req.body || {}) as Prisma.InputJsonValue;
  const now = new Date();
  const setting = await getPrisma().appSetting.upsert({
    where: { key },
    create: { key, data, updatedAt: now },
    update: { data, updatedAt: now },
  });
  return success(res, serialize(setting.data));
}

/** Answers upsert keyed on (projectId, questionId, contactId). */
export async function upsertAnswer(req: Request, res: Response, jwtSecret: string) {
  const data = convertIncomingDates(req.body || {});
  const projectId = String(data.projectId || '');
  const questionId = String(data.questionId || '');
  const contactId = String(data.contactId || '');
  const assignmentId = String(data.assignmentId || '');

  if (!projectId || !questionId || !contactId || !assignmentId) {
    return failure(res, 400, 'projectId, questionId, contactId, and assignmentId are required', 'db/validation-error');
  }

  const now = new Date();
  const legacyKey = `${contactId}_${questionId}`;
  const base = stripReservedFields({
    ...data,
    projectId,
    questionId,
    contactId,
    assignmentId,
    legacyFirebaseId: legacyKey,
    updatedAt: data.updatedAt instanceof Date ? data.updatedAt : now,
    submittedAt: data.submittedAt instanceof Date ? data.submittedAt : now,
  });

  const prisma = getPrisma();
  const known = pickAnswerFields(base);

  const existing = await prisma.answer.findUnique({
    where: { projectId_questionId_contactId: { projectId, questionId, contactId } },
  });
  const beforeSnapshot = existing
    ? {
        latestAnswer: existing.latestAnswer || '',
        comment: existing.comment || '',
        evidenceName: existing.evidenceName || '',
      }
    : null;

  const doc = await prisma.answer.upsert({
    where: { projectId_questionId_contactId: { projectId, questionId, contactId } },
    create: { ...known, createdAt: now } as unknown as Prisma.AnswerUncheckedCreateInput,
    update: known as Prisma.AnswerUncheckedUpdateInput,
  });

  try {
    await recordAnswerUpsertAudit(req, jwtSecret, {
      projectId,
      questionId,
      submittedByUserId:
        typeof data.submittedByUserId === 'string' ? data.submittedByUserId : undefined,
      before: beforeSnapshot,
      saved: doc,
    });
  } catch (auditErr) {
    console.error('[ANSWER UPSERT AUDIT]', auditErr);
  }

  const serialized = serialize(doc);
  if (serialized.legacyFirebaseId) serialized.id = serialized.legacyFirebaseId;
  return success(res, serialized);
}

/** Görevlerim: append assignee note on an answer (SQL mirror of the Mongo route). */
export async function appendAssigneeNote(req: Request, res: Response) {
  const answerKey = decodeURIComponent(req.params.answerId);
  const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId.trim() : '';
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const insertAfterIndexRaw = req.body?.insertAfterIndex;
  const insertAfterIndex =
    typeof insertAfterIndexRaw === 'number' ? insertAfterIndexRaw : Number(insertAfterIndexRaw);

  if (!text) return failure(res, 400, 'Note text is required', 'db/validation-error');

  const prisma = getPrisma();
  let existing = await prisma.answer.findFirst({
    where: {
      OR: [{ id: answerKey }, { legacyFirebaseId: answerKey }],
      ...(projectId ? { projectId } : {}),
    },
  });

  if (!existing && projectId) {
    const assignmentId =
      typeof req.body?.assignmentId === 'string' ? req.body.assignmentId.trim() : '';
    const questionId = typeof req.body?.questionId === 'string' ? req.body.questionId.trim() : '';
    const contactId = typeof req.body?.contactId === 'string' ? req.body.contactId.trim() : '';
    if (assignmentId && questionId && contactId) {
      const now = new Date();
      existing = await prisma.answer.create({
        data: {
          projectId,
          assignmentId,
          questionId,
          contactId,
          legacyFirebaseId: `${contactId}_${questionId}`,
          latestAnswer: '',
          comment: '',
          submittedAt: now,
          updatedAt: now,
        },
      });
    }
  }

  if (!existing) return failure(res, 404, 'Answer not found', 'db/not-found');

  const currentNotes: Array<Record<string, unknown>> = Array.isArray(existing.answerNotes)
    ? [...(existing.answerNotes as Array<Record<string, unknown>>)]
    : [];
  const legacyComment = typeof existing.comment === 'string' ? existing.comment.trim() : '';
  if (currentNotes.length === 0 && legacyComment) {
    currentNotes.push({
      id: 'legacy-comment',
      text: legacyComment,
      createdAt: existing.updatedAt?.getTime?.() ?? Date.now(),
    });
  }

  const entry = { id: `an-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, text, createdAt: Date.now() };
  const index =
    Number.isFinite(insertAfterIndex) && insertAfterIndex >= -1 ? insertAfterIndex : currentNotes.length - 1;
  currentNotes.splice(index + 1, 0, entry);

  const updated = await prisma.answer.update({
    where: { id: existing.id },
    data: { answerNotes: currentNotes as Prisma.InputJsonValue, updatedAt: new Date() },
  });

  const serialized = serialize(updated);
  if (serialized.legacyFirebaseId) serialized.id = serialized.legacyFirebaseId;
  return success(res, serialized);
}

/** Forms tab: append PM / consultant manager review comment on an answer (SQL mirror). */
export async function appendReviewComment(req: Request, res: Response) {
  const answerKey = decodeURIComponent(req.params.answerId);
  const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId.trim() : '';
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const authorId = typeof req.body?.authorId === 'string' ? req.body.authorId.trim() : '';
  const authorName = typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '—';

  if (!text) return failure(res, 400, 'Comment text is required', 'db/validation-error');

  const prisma = getPrisma();
  const existing = await prisma.answer.findFirst({
    where: {
      OR: [{ id: answerKey }, { legacyFirebaseId: answerKey }],
      ...(projectId ? { projectId } : {}),
    },
  });
  if (!existing) return failure(res, 404, 'Answer not found', 'db/not-found');

  const entry = {
    id: `rc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    authorId,
    authorName,
    text,
    createdAt: Date.now(),
  };
  const nextComments = [
    ...(Array.isArray(existing.reviewComments) ? (existing.reviewComments as Array<Record<string, unknown>>) : []),
    entry,
  ];

  const updated = await prisma.answer.update({
    where: { id: existing.id },
    data: { reviewComments: nextComments as Prisma.InputJsonValue, updatedAt: new Date() },
  });

  const serialized = serialize(updated);
  if (serialized.legacyFirebaseId) serialized.id = serialized.legacyFirebaseId;
  return success(res, serialized);
}

const ANSWER_FIELDS = new Set(
  Prisma.dmmf.datamodel.models.find((m) => m.name === 'Answer')?.fields.map((f) => f.name) ?? [],
);

function pickAnswerFields(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === 'id' || key === '_id' || key === '__v') continue;
    if (ANSWER_FIELDS.has(key)) out[key] = value;
  }
  return out;
}
