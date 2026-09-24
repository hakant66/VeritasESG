/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { findQuestionForProject, questionKodLabel } from './findProjectQuestion.ts';
import { documentPublicId } from './questionIds.ts';
import {
  createAuditLog,
  findPlatformUserByExternalId,
} from '../data/workflowDataAccess.ts';

function publicId(doc: { legacyFirebaseId?: string; _id?: unknown; id?: string } | null) {
  if (!doc) return '';
  return documentPublicId(doc as { legacyFirebaseId?: string; _id?: unknown }) || String(doc.id || doc._id || '');
}

async function findQuestionLabel(projectId: string, questionId: string) {
  if (!questionId) return questionId;
  const found = await findQuestionForProject(projectId, questionId);
  return questionKodLabel(
    (found?.doc as { kod?: string } | null) ?? null,
    questionId,
  );
}

function getRequesterId(req: Request, jwtSecret: string): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const decoded = jwt.verify(header.slice('Bearer '.length), jwtSecret) as {
      uid?: string;
      sub?: string;
    };
    return decoded.uid || decoded.sub;
  } catch {
    return undefined;
  }
}

type AnswerSnapshot = {
  latestAnswer?: string;
  comment?: string;
  evidenceName?: string;
};

function resolveAnswerAuditAction(
  before: AnswerSnapshot,
  after: AnswerSnapshot,
): 'create' | 'update' {
  let isCreate = false;
  let isUpdate = false;

  const prevText = (before.latestAnswer || '').trim();
  const nextText = (after.latestAnswer || '').trim();
  if (nextText && nextText !== prevText) {
    if (prevText) isUpdate = true;
    else isCreate = true;
  }

  const prevComment = (before.comment || '').trim();
  const nextComment = (after.comment || '').trim();
  if (nextComment !== prevComment) {
    if (nextComment) {
      if (prevComment) isUpdate = true;
      else isCreate = true;
    } else if (prevComment) {
      isUpdate = true;
    }
  }

  const prevEvidence = (before.evidenceName || '').trim();
  const nextEvidence = (after.evidenceName || '').trim();
  if (nextEvidence !== prevEvidence) {
    if (nextEvidence) {
      if (prevEvidence) isUpdate = true;
      else isCreate = true;
    } else if (prevEvidence) {
      isUpdate = true;
    }
  }

  return isUpdate ? 'update' : 'create';
}

function buildChangeDetails(
  before: AnswerSnapshot,
  after: AnswerSnapshot,
  questionLabel: string,
): string[] {
  const details: string[] = [];
  const prevText = (before.latestAnswer || '').trim();
  const nextText = (after.latestAnswer || '').trim();
  if (nextText && nextText !== prevText) {
    details.push(
      prevText
        ? `Soru yanıtı güncellendi: ${questionLabel}`
        : `Soru yanıtı kaydedildi: ${questionLabel}`,
    );
  }

  const prevComment = (before.comment || '').trim();
  const nextComment = (after.comment || '').trim();
  if (nextComment !== prevComment) {
    if (nextComment) {
      details.push(
        prevComment
          ? `Yorum güncellendi: ${questionLabel}`
          : `Yorum yazıldı: ${questionLabel}`,
      );
    } else if (prevComment) {
      details.push(`Yorum kaldırıldı: ${questionLabel}`);
    }
  }

  const prevEvidence = (before.evidenceName || '').trim();
  const nextEvidence = (after.evidenceName || '').trim();
  if (nextEvidence !== prevEvidence) {
    if (nextEvidence) {
      details.push(
        prevEvidence
          ? `Dosya güncellendi (${nextEvidence}): ${questionLabel}`
          : `Dosya yüklendi (${nextEvidence}): ${questionLabel}`,
      );
    } else if (prevEvidence) {
      details.push(`Dosya kaldırıldı: ${questionLabel}`);
    }
  }

  return details;
}

/** Profile / proje aktivite kartı için yanıt upsert sonrası audit log. */
export async function recordAnswerUpsertAudit(
  req: Request,
  jwtSecret: string,
  params: {
    projectId: string;
    questionId: string;
    submittedByUserId?: string;
    before: AnswerSnapshot | null;
    saved: {
      legacyFirebaseId?: string;
      _id?: unknown;
      id?: string;
      latestAnswer?: string;
      comment?: string;
      evidenceName?: string;
    };
  },
): Promise<void> {
  const after: AnswerSnapshot = {
    latestAnswer: params.saved.latestAnswer,
    comment: params.saved.comment,
    evidenceName: params.saved.evidenceName,
  };
  const before: AnswerSnapshot = params.before || {};

  const changeLines = buildChangeDetails(
    before,
    after,
    await findQuestionLabel(params.projectId, params.questionId),
  );
  if (changeLines.length === 0) return;

  const actorId =
    String(params.submittedByUserId || '').trim() ||
    getRequesterId(req, jwtSecret) ||
    '';
  if (!actorId) return;

  const actor = await findPlatformUserByExternalId(actorId);
  const recordId =
    (params.saved.legacyFirebaseId && String(params.saved.legacyFirebaseId)) ||
    publicId(params.saved) ||
    `${params.projectId}_${params.questionId}`;

  const action = resolveAnswerAuditAction(before, after);

  await createAuditLog({
    userId: publicId(actor) || actorId,
    userName: (actor?.name as string)?.trim() || 'User',
    userEmail: ((actor?.email as string) || 'N/A').toLowerCase(),
    action,
    collection: 'answers',
    recordId,
    projectId: params.projectId,
    details: changeLines.join(' · '),
    timestamp: new Date(),
  });
}
