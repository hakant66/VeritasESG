/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { documentPublicId } from './questionIds.ts';
import { resolveAppPublicOrigin } from './appPublicUrl.ts';
import { sendResendEmail } from './resendEmail.ts';
import { resolveProjectIdKeys } from './assignmentQuestionSync.ts';
import { resolveAuditReviewNotificationRecipients } from './auditReviewStakeholders.ts';
import {
  createAuditLog,
  findAnswerDocumentByLookup,
  findProjectByParam,
  findQuestionByProjectKeys,
} from '../data/workflowDataAccess.ts';

export type AuditReviewDecision = 'accept' | 'reject' | 'explanation';

type QuestionWorkflowStatus =
  | 'not_sent'
  | 'sent_pending'
  | 'customer_responded'
  | 'sent_back'
  | 'approved';

function decisionToStatus(decision: AuditReviewDecision): QuestionWorkflowStatus {
  return decision === 'accept' ? 'approved' : 'sent_back';
}

export async function submitAuditReviewDecision(
  projectId: string,
  answerId: string,
  actor: {
    _id?: unknown;
    legacyFirebaseId?: string;
    name?: string;
    email?: string;
  },
  options: {
    decision: AuditReviewDecision;
    note?: string;
    logText: string;
    clientOrigin?: string;
    questionLabel?: string;
  },
): Promise<{ answerId: string; workflowStatus: QuestionWorkflowStatus }> {
  const existing = await findAnswerDocumentByLookup(answerId, projectId);
  if (!existing) {
    throw new Error('Yanıt bulunamadı');
  }

  const answerProjectId = String(existing.projectId || projectId || '').trim();
  const answerPublicId = documentPublicId(
    existing as { _id?: unknown; legacyFirebaseId?: string; id?: string },
  );
  const fromStatus = (existing.workflowStatus as QuestionWorkflowStatus) || 'customer_responded';
  const toStatus = decisionToStatus(options.decision);
  const actorPublicId = documentPublicId(
    actor as { _id?: unknown; legacyFirebaseId?: string },
  );
  const actorName = String(actor.name || actor.email || 'Denetçi').trim();
  const actorEmail = String(actor.email || '').trim();
  const now = Date.now();

  const logEntry = {
    id: `wsl-${now}-${Math.random().toString(36).slice(2, 9)}`,
    fromStatus,
    toStatus,
    text: options.logText,
    authorId: actorPublicId,
    authorName: actorName,
    createdAt: now,
  };

  const nextLog = [...((existing.workflowStatusLog as unknown[]) || []), logEntry];
  const trimmedNote = String(options.note || '').trim();

  if (trimmedNote) {
    const entry = {
      id: `rc-${now}-${Math.random().toString(36).slice(2, 9)}`,
      authorId: actorPublicId,
      authorName: actorName,
      text: trimmedNote,
      createdAt: now,
    };
    existing.reviewComments = [...((existing.reviewComments as unknown[]) || []), entry];
  }

  existing.workflowStatus = toStatus;
  existing.workflowStatusLog = nextLog;
  existing.updatedAt = new Date(now);
  await existing.save();

  const project = await findProjectByParam(answerProjectId);
  const projectName = String(project?.name || 'Proje');
  const projectKeys = await resolveProjectIdKeys(answerProjectId);

  let questionLabel = options.questionLabel?.trim() || '';
  if (!questionLabel && existing.questionId) {
    const question = await findQuestionByProjectKeys(
      projectKeys.length > 0 ? projectKeys : [answerProjectId],
      String(existing.questionId),
    );
    const kod = String(question?.kod || '').trim();
    const soru = String(question?.soru || '').trim();
    questionLabel = kod ? `${kod} — ${soru.slice(0, 120)}` : soru.slice(0, 120);
  }

  const decisionLabel =
    options.decision === 'accept'
      ? 'Kabul'
      : options.decision === 'reject'
        ? 'Red'
        : 'Açıklama';

  const recipients = await resolveAuditReviewNotificationRecipients(answerProjectId);
  const origin = resolveAppPublicOrigin(options.clientOrigin);
  const projectUrl = `${origin}/#/projects/${answerProjectId}`;

  const subject = `${projectName} — Denetim: ${decisionLabel}`;
  const textLines = [
    'Merhaba,',
    '',
    `${actorName}${actorEmail ? ` (${actorEmail})` : ''} "${projectName}" projesinde bir yanıtı denetledi.`,
    `Karar: ${decisionLabel}`,
    questionLabel ? `Soru: ${questionLabel}` : '',
    trimmedNote ? `Not: ${trimmedNote}` : '',
    '',
    `Projeyi açın: ${projectUrl}`,
    '',
    'Impact AI VeritasESG',
  ].filter(Boolean);

  const html = `
    <div style="font-family: sans-serif; color: #334155; line-height: 1.6; max-width: 600px;">
      <p>Merhaba,</p>
      <p><strong>${actorName}</strong>${actorEmail ? ` (${actorEmail})` : ''}, <strong>${projectName}</strong> projesinde bir yanıtı denetledi.</p>
      <p>Karar: <strong>${decisionLabel}</strong></p>
      ${questionLabel ? `<p>Soru: ${questionLabel}</p>` : ''}
      ${trimmedNote ? `<p>Not: ${trimmedNote}</p>` : ''}
      <div style="margin: 24px 0;">
        <a href="${projectUrl}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Projeyi aç</a>
      </div>
      <p>Impact AI VeritasESG</p>
    </div>
  `.trim();

  for (const recipient of recipients) {
    await sendResendEmail({
      to: recipient.email,
      name: recipient.name,
      subject,
      text: textLines.join('\n'),
      html,
      tags: ['veritasesg-audit-review'],
      audit: {
        emailType: 'assignment',
        projectId: answerProjectId,
        recordId: answerPublicId,
        triggeredBy: {
          userId: actorPublicId,
          userName: actorName,
          userEmail: actorEmail,
        },
      },
    });
  }

  const activityDetails = [
    `Denetim kararı: ${decisionLabel}`,
    questionLabel ? `Soru: ${questionLabel}` : '',
    trimmedNote ? `Not: ${trimmedNote}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  await createAuditLog({
    userId: actorPublicId,
    userName: actorName,
    userEmail: actorEmail,
    action: 'update',
    collection: 'answers',
    recordId: answerPublicId,
    projectId: answerProjectId,
    details: activityDetails,
    timestamp: now,
  });

  return { answerId: answerPublicId, workflowStatus: toStatus };
}
