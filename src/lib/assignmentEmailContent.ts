/**
 * Builds assignment notification email body to match the in-app preview (projectDetail.assignModal*).
 */

import type { TranslationKey } from './i18n';
import {
  labelForAssignmentDisplayStatus,
  normalizeAssignmentUrgency,
  resolveAssignmentDisplayStatus,
  type AssignmentUrgencyLevel,
} from '../../lib/assignmentUrgency.ts';

type ProjectDetailCopy = TranslationKey['projectDetail'];

export type AssignmentEmailDraftFields = {
  subject: string;
  greeting: string;
  bodyIntro: string;
  instructionsOrRef: string;
  completeBy: string;
  urgencyStatus: string;
  closing: string;
  teamSignoff: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function assignmentDisplayLabelsFromCopy(pd: ProjectDetailCopy) {
  return {
    completed: pd.completedStatus,
    awaitingApproval: pd.awaitingApprovalStatus,
    overdue: pd.overdueStatus,
    noDeadline: pd.statusNoDeadline,
    urgent: pd.urgencyUrgent,
    approaching: pd.statusApproaching,
    normal: pd.urgencyNormal,
  };
}

export function formatAssignmentUrgencyStatusLine(
  pd: ProjectDetailCopy,
  opts: {
    urgency?: unknown;
    deadlineInput?: string | number | null;
    status?: string | null;
  },
): string {
  const display = resolveAssignmentDisplayStatus({
    status: opts.status,
    urgency: opts.urgency,
    deadline: opts.deadlineInput,
  });
  const label = labelForAssignmentDisplayStatus(
    display,
    assignmentDisplayLabelsFromCopy(pd),
  );
  return pd.assignModalUrgencyStatus.replace('{status}', label);
}

export function formatAssignmentCompleteByLine(
  pd: ProjectDetailCopy,
  deadlineInput: string,
  dateLocale?: string,
): string {
  const deadlineDate = new Date(deadlineInput);
  const dateStr = Number.isNaN(deadlineDate.getTime())
    ? deadlineInput
    : deadlineDate.toLocaleDateString(dateLocale);
  const completeByParts = pd.assignModalCompleteBy.split('{date}');
  return completeByParts.length === 2
    ? `${completeByParts[0]}${dateStr}${completeByParts[1]}`
    : pd.assignModalCompleteBy.replace('{date}', dateStr);
}

export function buildDefaultAssignmentEmailDraft(
  pd: ProjectDetailCopy,
  opts: {
    recipientName: string;
    projectName: string;
    questionCount: number;
    instructionsOrRef: string;
    deadlineInput: string;
    dateLocale?: string;
    urgency?: AssignmentUrgencyLevel | string | null;
    status?: string | null;
  },
): AssignmentEmailDraftFields {
  const projectName = opts.projectName || '';
  const recipientName = opts.recipientName || '';
  return {
    subject: pd.assignModalSubjectLine.replace('{project}', projectName),
    greeting: pd.assignModalHi.replace('{name}', recipientName),
    bodyIntro: pd.assignModalBodyIntro
      .replace('{project}', projectName)
      .replace('{count}', String(opts.questionCount)),
    instructionsOrRef: opts.instructionsOrRef.trim(),
    completeBy: formatAssignmentCompleteByLine(
      pd,
      opts.deadlineInput,
      opts.dateLocale,
    ),
    urgencyStatus: formatAssignmentUrgencyStatusLine(pd, {
      urgency: normalizeAssignmentUrgency(opts.urgency),
      deadlineInput: opts.deadlineInput,
      status: opts.status,
    }),
    closing: pd.assignModalClosing,
    teamSignoff: pd.assignModalTeamSignoff,
  };
}

/** Single editable block: greeting, intro, reference, deadline, urgency. */
export function composeAssignmentEmailMainBody(
  draft: Pick<
    AssignmentEmailDraftFields,
    'greeting' | 'bodyIntro' | 'instructionsOrRef' | 'completeBy' | 'urgencyStatus'
  >,
): string {
  const chunks: string[] = [];
  const greeting = draft.greeting.trim();
  const intro = draft.bodyIntro.trim();
  const ref = draft.instructionsOrRef.trim();
  const completeBy = draft.completeBy.trim();
  const urgencyStatus = draft.urgencyStatus.trim();

  if (greeting) chunks.push(greeting);
  if (intro) chunks.push(intro);
  if (ref) chunks.push(`"${ref}"`);
  if (completeBy) chunks.push(completeBy);
  if (urgencyStatus) chunks.push(urgencyStatus);

  return chunks.join('\n\n');
}

/** Sign-off block (closing + team name). */
export function composeAssignmentEmailSignoff(
  closing: string,
  teamSignoff: string,
): string {
  return [closing.trim(), teamSignoff.trim()].filter(Boolean).join('\n');
}

export type AssignmentEmailComposedDraft = {
  subject: string;
  mainBody: string;
  signoff: string;
};

function mainBodyParagraphsToHtml(mainBody: string): string {
  const blocks = mainBody
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return '';
  return blocks
    .map((block) => {
      const isQuoted =
        block.startsWith('"') && block.endsWith('"') && block.length > 1;
      if (isQuoted) {
        return `<p style="font-style: italic; color: #475569; border-left: 2px solid #e2e8f0; padding-left: 16px; margin: 20px 0;">&quot;${escapeHtml(block.slice(1, -1))}&quot;</p>`;
      }
      const inner = escapeHtml(block).replace(/\n/g, '<br/>');
      return `<p>${inner}</p>`;
    })
    .join('');
}

export function buildAssignmentEmailFromComposed(
  pd: ProjectDetailCopy,
  opts: {
    subject: string;
    mainBody: string;
    signoff: string;
    magicLink: string;
  },
): { subject: string; text: string; html: string } {
  const subject = opts.subject.trim();
  const mainBody = opts.mainBody.trim();
  const signoff = opts.signoff.trim();
  const signoffLines = signoff.split('\n').map((l) => l.trim()).filter(Boolean);

  const text = [
    mainBody,
    '',
    `${pd.assignModalEmailButton}: ${opts.magicLink}`,
    '',
    signoff,
  ].join('\n');

  const signoffHtml =
    signoffLines.length > 1
      ? `<p>${escapeHtml(signoffLines[0])}<br/>${escapeHtml(signoffLines.slice(1).join('<br/>'))}</p>`
      : signoff
        ? `<p>${escapeHtml(signoff)}</p>`
        : '';

  const html = `
        <div style="font-family: Georgia, 'Times New Roman', serif; color: #1e293b; line-height: 1.65; max-width: 600px;">
          <p style="font-family: ui-sans-serif, system-ui, sans-serif; color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 8px;">${escapeHtml(pd.assignModalSubject)}</p>
          <p style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 18px; font-weight: 700; margin: 0 0 20px;">${escapeHtml(subject)}</p>
          <div style="height: 1px; background: #e2e8f0; margin: 20px 0;"></div>
          ${mainBodyParagraphsToHtml(mainBody)}
          <div style="margin: 28px 0;">
            <a href="${escapeHtml(opts.magicLink)}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-family: ui-sans-serif, system-ui, sans-serif;">${escapeHtml(pd.assignModalEmailButton)}</a>
          </div>
          ${signoffHtml}
        </div>
      `.trim();

  return { subject, text, html };
}

/** Map Brevo/API assignment email response to UI copy (localized success message). */
export function formatAssignmentEmailStatusMessage(
  payload: { success?: boolean; message?: string; error?: string },
  labels: { sentSuccess: string },
): string {
  const msg = String(payload.message || '').trim();
  const err = String(payload.error || '').trim();
  if (
    payload.success === true ||
    /email sent successfully/i.test(msg)
  ) {
    return labels.sentSuccess;
  }
  return err || msg || '';
}

export function isAssignmentEmailSuccessStatus(
  status: string,
  sentSuccessLabel: string,
): boolean {
  const s = status.trim().toLowerCase();
  if (!s) return false;
  if (s === sentSuccessLabel.trim().toLowerCase()) return true;
  return s.includes('success') || s.includes('başarı');
}

/** CC the logged-in assigner (hidden from UI); skip if same as primary recipient. */
export function assignmentAssignerCcRecipients(
  assignerEmail: string | undefined | null,
  assignerName: string | undefined | null,
  recipientEmail: string | undefined | null,
): { email: string; name: string }[] {
  const email = String(assignerEmail || '').trim().toLowerCase();
  const to = String(recipientEmail || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [];
  if (email === to) return [];
  const name = String(assignerName || '').trim() || email.split('@')[0] || email;
  return [{ email, name }];
}

/** Parse comma- or semicolon-separated CC addresses for Brevo. */
export function parseAssignmentEmailCcList(
  raw: string,
): { email: string; name: string }[] {
  const seen = new Set<string>();
  const out: { email: string; name: string }[] = [];
  for (const part of raw.split(/[,;]/)) {
    const email = part.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push({ email, name: email.split('@')[0] || email });
  }
  return out;
}

export function buildAssignmentEmailContent(
  pd: ProjectDetailCopy,
  opts: {
    recipientName: string;
    projectName: string;
    questionCount: number;
    instructionsOrRef: string;
    deadlineInput: string;
    magicLink: string;
    dateLocale?: string;
    draft?: AssignmentEmailDraftFields;
  },
): { subject: string; text: string; html: string } {
  const draft =
    opts.draft ??
    buildDefaultAssignmentEmailDraft(pd, {
      recipientName: opts.recipientName,
      projectName: opts.projectName,
      questionCount: opts.questionCount,
      instructionsOrRef: opts.instructionsOrRef,
      deadlineInput: opts.deadlineInput,
      dateLocale: opts.dateLocale,
    });

  const subject = draft.subject.trim();
  const hi = draft.greeting.trim();
  const intro = draft.bodyIntro.trim();
  const instr = draft.instructionsOrRef.trim();
  const completeByPlain = draft.completeBy.trim();
  const urgencyStatusPlain = draft.urgencyStatus.trim();
  const closing = draft.closing.trim();
  const signoff = draft.teamSignoff.trim();

  const quoted = instr ? `\n\n"${instr}"` : '';

  const text = [
    hi,
    '',
    intro,
    quoted,
    '',
    completeByPlain,
    urgencyStatusPlain,
    '',
    `${pd.assignModalEmailButton}: ${opts.magicLink}`,
    '',
    closing,
    signoff,
  ]
    .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
    .join('\n');

  const quotedHtml = instr
    ? `<p style="font-style: italic; color: #475569; border-left: 2px solid #e2e8f0; padding-left: 16px; margin: 20px 0;">&quot;${escapeHtml(instr)}&quot;</p>`
    : '';

  const html = `
        <div style="font-family: Georgia, 'Times New Roman', serif; color: #1e293b; line-height: 1.65; max-width: 600px;">
          <p style="font-family: ui-sans-serif, system-ui, sans-serif; color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 8px;">${escapeHtml(pd.assignModalSubject)}</p>
          <p style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 18px; font-weight: 700; margin: 0 0 20px;">${escapeHtml(subject)}</p>
          <div style="height: 1px; background: #e2e8f0; margin: 20px 0;"></div>
          <p>${escapeHtml(hi)}</p>
          <p>${escapeHtml(intro)}</p>
          ${quotedHtml}
          <p>${escapeHtml(completeByPlain)}</p>
          ${urgencyStatusPlain ? `<p><strong>${escapeHtml(urgencyStatusPlain)}</strong></p>` : ''}
          <div style="margin: 28px 0;">
            <a href="${escapeHtml(opts.magicLink)}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-family: ui-sans-serif, system-ui, sans-serif;">${escapeHtml(pd.assignModalEmailButton)}</a>
          </div>
          <p>${escapeHtml(closing)}<br/>${escapeHtml(signoff)}</p>
        </div>
      `.trim();

  return { subject, text, html };
}
