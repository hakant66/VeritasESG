/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { documentPublicId } from './questionIds.ts';
import { resolveAppPublicOrigin } from './appPublicUrl.ts';
import { sendResendEmail } from './resendEmail.ts';
import { findAssignmentForProject } from './assignmentManageAccess.ts';
import { resolveProjectIdKeys } from './assignmentQuestionSync.ts';
import {
  createAuditLog,
  findAnswersByProjectAndAssignment,
  findAnswersByProjectAndContact,
  findProjectByParam,
  findQuestionByProjectKeys,
  listProjectAdminManagers,
  updateAssignment,
} from '../data/workflowDataAccess.ts';

function actorPublicIds(user: {
  _id?: unknown;
  legacyFirebaseId?: string;
}): Set<string> {
  const ids = new Set<string>();
  if (user._id) ids.add(String(user._id));
  const legacy = user.legacyFirebaseId?.trim();
  if (legacy) ids.add(legacy);
  const pub = documentPublicId(user as { _id?: unknown; legacyFirebaseId?: string });
  if (pub) ids.add(pub);
  return ids;
}

function isRecipientActor(
  assignment: { recipientId?: string },
  actorIds: Set<string>,
): boolean {
  const recipientId = String(assignment.recipientId || '').trim();
  return recipientId && actorIds.has(recipientId);
}

async function resolveProjectManagers(projectId: string) {
  const projectKeys = await resolveProjectIdKeys(projectId);
  const keys = projectKeys.length > 0 ? projectKeys : [projectId];
  const users = await listProjectAdminManagers(keys);

  const seen = new Set<string>();
  const managers: Array<{ email: string; name: string; id: string }> = [];
  for (const user of users) {
    const email = String(user.email || '').trim();
    if (!email) continue;
    const id = documentPublicId(user as { _id?: unknown; legacyFirebaseId?: string; id?: string });
    if (seen.has(email)) continue;
    seen.add(email);
    managers.push({
      id,
      email,
      name: String(user.name || email).trim(),
    });
  }
  return managers;
}

type AnswerLean = {
  questionId?: string;
  answerNotes?: unknown[];
  comment?: string;
  evidenceName?: string;
};

type NoticeItem = {
  questionId: string;
  questionKod?: string;
  questionText?: string;
  noteText?: string;
  hasEvidence?: boolean;
};

function extractAnswerNoteText(answer: AnswerLean): string {
  const snippets: string[] = [];
  const notes = Array.isArray(answer.answerNotes) ? answer.answerNotes : [];
  for (const raw of notes) {
    const text =
      raw &&
      typeof raw === 'object' &&
      'text' in raw &&
      typeof (raw as { text?: unknown }).text === 'string'
        ? String((raw as { text: string }).text).trim()
        : '';
    if (text) snippets.push(text);
  }
  const legacyComment = String(answer.comment || '').trim();
  if (legacyComment) snippets.push(legacyComment);
  return snippets.join(' · ');
}

async function buildAssigneeNoticeItems(
  answers: AnswerLean[],
  projectId: string,
): Promise<NoticeItem[]> {
  const projectKeys = await resolveProjectIdKeys(projectId);
  const keys = projectKeys.length > 0 ? projectKeys : [projectId];
  const items: NoticeItem[] = [];

  for (const answer of answers) {
    const questionId = String(answer.questionId || '').trim();
    if (!questionId) continue;

    const noteText = extractAnswerNoteText(answer);
    const hasEvidence = Boolean(String(answer.evidenceName || '').trim());
    if (!noteText && !hasEvidence) continue;

    const question = await findQuestionByProjectKeys(keys, questionId);

    const kod = String(question?.kod || '').trim();
    const soru = String(question?.soru || '').trim();
    items.push({
      questionId,
      questionKod: kod || undefined,
      questionText: soru ? soru.slice(0, 160) : undefined,
      noteText: noteText || undefined,
      hasEvidence,
    });
  }

  return items;
}

function summarizeAssigneeContent(answers: AnswerLean[]): {
  hasNotes: boolean;
  hasEvidence: boolean;
  summary: string;
} {
  const noteSnippets: string[] = [];
  let hasEvidence = false;

  for (const answer of answers) {
    const evidence = String(answer.evidenceName || '').trim();
    if (evidence) hasEvidence = true;

    const notes = Array.isArray(answer.answerNotes) ? answer.answerNotes : [];
    for (const raw of notes) {
      const text =
        raw &&
        typeof raw === 'object' &&
        'text' in raw &&
        typeof (raw as { text?: unknown }).text === 'string'
          ? String((raw as { text: string }).text).trim()
          : '';
      if (text) noteSnippets.push(text);
    }
    const legacyComment = String(answer.comment || '').trim();
    if (legacyComment) noteSnippets.push(legacyComment);
  }

  const hasNotes = noteSnippets.length > 0;
  const combined = noteSnippets.join(' · ');
  const summary =
    combined.length > 280 ? `${combined.slice(0, 277).trim()}…` : combined;

  return { hasNotes, hasEvidence, summary };
}

export async function notifyProjectManagersForAssignment(
  projectId: string,
  assignmentId: string,
  actor: {
    _id?: unknown;
    legacyFirebaseId?: string;
    name?: string;
    email?: string;
  },
  options?: { clientOrigin?: string },
): Promise<{
  managersNotified: number;
  assignmentId: string;
}> {
  const assignment = await findAssignmentForProject(projectId, assignmentId);
  if (!assignment) {
    throw new Error('Atama bulunamadı');
  }

  const actorIds = actorPublicIds(actor);
  if (!isRecipientActor(assignment, actorIds)) {
    throw new Error('Bu atama için bildirim gönderme yetkiniz yok');
  }

  const assignmentRecordId = documentPublicId(assignment);
  const projectKeys = await resolveProjectIdKeys(projectId);
  const keys = projectKeys.length > 0 ? projectKeys : [projectId];
  const answers = await findAnswersByProjectAndAssignment(keys, assignmentRecordId);

  const legacyAnswers =
    answers.length === 0
      ? await findAnswersByProjectAndContact(keys, String(assignment.recipientId || ''))
      : [];

  const mergedAnswers = answers.length > 0 ? answers : legacyAnswers;
  const noticeItems = await buildAssigneeNoticeItems(
    mergedAnswers as AnswerLean[],
    projectId,
  );
  const { hasNotes, hasEvidence, summary } = summarizeAssigneeContent(
    mergedAnswers as AnswerLean[],
  );

  if (!hasNotes && !hasEvidence) {
    throw new Error('Önce bir not veya ek dosya ekleyin');
  }

  const managers = await resolveProjectManagers(projectId);
  if (managers.length === 0) {
    throw new Error('Bu projede proje yöneticisi bulunamadı');
  }

  const project = await findProjectByParam(projectId);
  const projectName = String(project?.name || 'Proje');
  const actorName = String(actor.name || actor.email || 'Kullanıcı').trim();
  const actorEmail = String(actor.email || '').trim();
  const questionCount = Array.isArray(assignment.questionIds)
    ? assignment.questionIds.length
    : 0;
  const origin = resolveAppPublicOrigin(options?.clientOrigin);
  const projectUrl = `${origin}/#/projects/${projectId}`;

  const detailParts: string[] = [];
  if (noticeItems.length > 0) {
    for (const item of noticeItems) {
      const label = item.questionKod || item.questionId;
      const parts = [label];
      if (item.noteText) parts.push(item.noteText);
      if (item.hasEvidence) parts.push('Ek dosya');
      detailParts.push(parts.join(': '));
    }
  } else if (hasNotes && summary) {
    detailParts.push(`Not: ${summary}`);
  }
  if (hasEvidence && noticeItems.every((i) => !i.hasEvidence)) {
    detailParts.push('Ek dosya eklendi');
  }

  const subject = `${projectName} — Görev bildirimi (${actorName})`;
  const text = [
    `Merhaba,`,
    '',
    `${actorName}${actorEmail ? ` (${actorEmail})` : ''} "${projectName}" projesindeki görevine not veya ek ekledi ve proje yöneticisine bildirdi.`,
    '',
    `Atama: ${questionCount} soru`,
    detailParts.length > 0 ? detailParts.join('\n') : '',
    '',
    `Projeyi açın: ${projectUrl}`,
    '',
    'Impact AI GovernanceIQ',
  ]
    .filter(Boolean)
    .join('\n');

  const htmlDetail = detailParts.map((line) => `<p>${line}</p>`).join('');
  const html = `
    <div style="font-family: sans-serif; color: #334155; line-height: 1.6; max-width: 600px;">
      <p>Merhaba,</p>
      <p><strong>${actorName}</strong>${actorEmail ? ` (${actorEmail})` : ''}, <strong>${projectName}</strong> projesindeki görevine not veya ek ekledi ve proje yöneticisine bildirdi.</p>
      <p>Atama: <strong>${questionCount}</strong> soru</p>
      ${htmlDetail}
      <div style="margin: 24px 0;">
        <a href="${projectUrl}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Projeyi aç</a>
      </div>
      <p>Impact AI GovernanceIQ</p>
    </div>
  `.trim();

  const actorPublicId = documentPublicId(
    actor as { _id?: unknown; legacyFirebaseId?: string },
  );

  for (const manager of managers) {
    await sendResendEmail({
      to: manager.email,
      name: manager.name,
      subject,
      text,
      html,
      tags: ['governanceiq-assignee-notice'],
      audit: {
        emailType: 'assignment',
        projectId,
        recordId: assignmentRecordId,
        triggeredBy: {
          userId: actorPublicId,
          userName: actorName,
          userEmail: actorEmail,
        },
      },
    });
  }

  const sentAt = Date.now();
  await updateAssignment(String(assignment._id || assignment.id), {
    assigneeNoticeSentAt: new Date(sentAt),
    assigneeNoticeSentByUserId: actorPublicId,
    assigneeNoticeSentByName: actorName,
    assigneeNoticeSummary: summary || (hasEvidence ? 'Ek dosya' : ''),
    assigneeNoticeHasNotes: hasNotes,
    assigneeNoticeHasEvidence: hasEvidence,
    assigneeNoticeItems: noticeItems,
  });

  await createAuditLog({
    userId: actorPublicId,
    userName: actorName,
    userEmail: actorEmail,
    action: 'update',
    collection: 'assignments',
    recordId: assignmentRecordId,
    projectId,
    details: `Görev alıcısı proje yöneticisine bildirdi: ${actorName}${summary ? ` — ${summary}` : hasEvidence ? ' — ek dosya' : ''}`,
    timestamp: sentAt,
  });

  return { managersNotified: managers.length, assignmentId: assignmentRecordId };
}
