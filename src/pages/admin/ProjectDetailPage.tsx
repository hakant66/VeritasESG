/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Fragment,
  type ReactNode,
} from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Settings, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Send,
  Zap,
  Cog,
  ScrollText,
  Home,
  Search,
  MessageSquare,
  History,
  ClipboardList,
  FileUp,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Paperclip,
  Calendar,
  Lock,
  MoreVertical,
  Mail,
  Filter,
  Plus,
  Trash2,
  HelpCircle,
  Tags,
  Download,
  Archive,
  Lightbulb,
  CircleOff,
  Hourglass,
  UserCheck,
  RotateCcw,
  ArrowDown,
  ArrowUp,
  Building2,
  LayoutGrid,
  Link2,
  X,
  Tag,
  Camera,
  Pencil,
  Target,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  downloadSubmissionsZipArchive,
  resolvePageTitleForQuestion,
  sanitizeExportToken,
} from '../../lib/exportSubmissionsZip';
import {
  buildProjectQuestionCopyKod,
  buildProjectQuestionCopyPayload,
  questionsToBumpForProjectCopy,
} from '../../lib/copyProjectQuestion';
import {
  getRecommendedTemplatesForMaterialTopics,
  findTemplateByRecommendation,
} from '../../lib/materialityTemplateMapping';
import {
  DEFAULT_SORU_COGALTMA,
  normalizeQuestionSoruCogaltma,
} from '../../lib/questionSoruCogaltma';
import * as DB from '../../services/db';
import { logActivity } from '../../services/db';
import { apiRequest } from '../../lib/apiClient';
import * as Gemini from '../../services/gemini';
import { Project, ProjectPage, Question, Answer, QuestionWorkflowStatus, WorkflowStatusLogEntry, Contact, Assignment, PlatformUser, ProjectUserAssignment, AuditLog, Customer, Template, Domain } from '../../types';
import type { translations } from '../../lib/i18n';
import { OnBehalfResponseModal } from '../../components/project/OnBehalfResponseModal';
import { QuickAssignModal } from '../../components/project/QuickAssignModal';
import { ReassignSentAssignmentModal } from '../../components/project/ReassignSentAssignmentModal';
import { RecipientAssigneeNoticeBanner } from '../../components/project/RecipientAssigneeNoticeBanner';
import { FormsNotSentQuestionCallout } from '../../components/project/FormsNotSentQuestionCallout';
import { FormsAnswerReviewComments } from '../../components/project/FormsAnswerReviewComments';
import { AuditAnswerReviewPanel } from '../../components/project/AuditAnswerReviewPanel';
import { MergeAssignmentsStep } from '../../components/project/MergeAssignmentsStep';
import {
  QuestionGuidanceMaterialsModal,
  questionHasGuidanceMaterials,
} from '../../components/project/QuestionGuidanceMaterials';
import { resolveQuestionVideoEmbed } from '../../components/project/AciklamaVideoPlayer';
import { EditStakeholderModal } from '../../components/project/EditStakeholderModal';
import { ProjectUserCardRoleWatermark } from '../../components/project/ProjectUserCardRoleWatermark';
import { ProjectUserIdentity } from '../../components/project/ProjectUserIdentity';
import { EditPlatformUserModal } from '../../components/users/EditPlatformUserModal';
import { getVideoEmbed, videoIframeAllow } from '../../lib/helpVideoEmbed';
import { cn, formatPersonName } from '../../lib/utils';
import { parseApiErrorMessage } from '../../lib/parseApiError';
import { getAuthToken } from '../../lib/authToken';
import { HelpMarkdown } from '../../components/ui/HelpMarkdown';
import { MarkdownContent } from '../../components/ui/MarkdownContent';
import { MarkdownEditorModal } from '../../components/ui/MarkdownEditorModal';
import {
  QuestionGuidanceEditorModal,
  type QuestionGuidanceDraft,
  type QuestionGuidanceReferenceContext,
} from '../../components/project/QuestionGuidanceEditorModal';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  buildAssignmentEmailFromComposed,
  buildDefaultAssignmentEmailDraft,
  composeAssignmentEmailMainBody,
  composeAssignmentEmailSignoff,
  assignmentAssignerCcRecipients,
  formatAssignmentEmailStatusMessage,
  isAssignmentEmailSuccessStatus,
} from '../../lib/assignmentEmailContent';
import {
  assignmentDisplayStatusTone,
  labelForAssignmentDisplayStatus,
  normalizeAssignmentUrgency,
  resolveAssignmentDisplayStatus,
  type AssignmentUrgencyLevel,
} from '../../../lib/assignmentUrgency';
import { resolveAssignmentAccessLink } from '../../lib/assignmentAccessLink';
import { assignmentHasSubstantiveAnswers, answerHasSubstantiveContent } from '../../lib/assignmentAnswers';
import { resendAssignmentEmail, updateProjectAssignment } from '../../lib/assignmentManageApi';
import {
  comparePlatformUsersForProjectUnassignedList,
  isAuditorPlatformUser,
  isCustomerPortalPlatformUser,
  isAuditorProjectRole,
  platformUserCustomerIdMismatchForProject,
  platformUserLinkedToStakeholderContact,
  platformUserVisibleForProject,
  projectMemberRoleForSelect,
} from '../../lib/userRoles';
import {
  isAuditQuestionSetPage,
  isCustomerQuestionSetPage,
} from '../../lib/templatePageKind';
import { useSettings } from '../../lib/SettingsContext';
import Modal from '../../components/ui/Modal';
import { ProjectPlanTab } from '../../components/project/ProjectPlanTab';
import { ComplianceTab } from '../../components/project/ComplianceTab';
const ASSIGN_MODAL_BASLIK_EMPTY = '__assign_baslik_empty__';
const QUESTION_FORMS_BASLIK_EMPTY = '__question_forms_baslik_empty__';
const REMOVE_FROM_PROJECT_SELECT_VALUE = '__remove_from_project__';

/** Shared outline style for «Açık Atamalar» / «Soru Ata» on the users tab. */
const PROJECT_USER_ASSIGN_ACTION_BTN =
  'flex shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-900 transition-all hover:border-blue-300 hover:bg-blue-100';

type FormsWorkflowFilterId = 'all' | QuestionWorkflowStatus;

const FORMS_WORKFLOW_FILTER_STATUSES: QuestionWorkflowStatus[] = [
  'not_sent',
  'sent_pending',
  'customer_responded',
  'sent_back',
  'approved',
];

function getAnswerWorkflowState(
  q: Question,
  ans: Answer,
  assignmentList: Assignment[],
): QuestionWorkflowStatus {
  if (ans.workflowStatus) return ans.workflowStatus;
  if (ans.adminReviewStatus === 'sent_back') return 'sent_back';
  if (ans.adminReviewStatus === 'received') return 'customer_responded';
  if (ans.adminReviewStatus === 'pending') return 'sent_pending';
  return getQuestionWorkflowState(q, [ans], assignmentList);
}

function questionMatchesFormsWorkflowFilter(
  q: Question,
  answerList: Answer[],
  assignmentList: Assignment[],
  filter: FormsWorkflowFilterId,
): boolean {
  if (filter === 'all') return true;
  const questionAnswers = getAnswersForQuestion(q, answerList);
  if (questionAnswers.length > 0) {
    return questionAnswers.some(
      (ans) => getAnswerWorkflowState(q, ans, assignmentList) === filter,
    );
  }
  return getQuestionWorkflowState(q, answerList, assignmentList) === filter;
}
const ASSIGN_REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function initialsFromAssigner(nameOrEmail: string): string {
  const s = (nameOrEmail || '').trim();
  if (!s) return 'NA';
  if (s.includes('@')) {
    const local = (s.split('@')[0] || 'a').replace(/[^a-zA-Z0-9]/g, '');
    return (local.slice(0, 2) || 'NA').toUpperCase();
  }
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return (parts[0].slice(0, 2) || 'NA').toUpperCase();
}

function randomRefSuffix(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ASSIGN_REF_ALPHABET[Math.floor(Math.random() * ASSIGN_REF_ALPHABET.length)];
  }
  return out;
}

/** YYYYMMDDHHmm — assigner initials — unique alphanumeric (assignment REF). */
function buildAssignmentReference(assignerDisplayName: string): string {
  const n = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  const ymdhm = `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}${pad(n.getHours())}${pad(n.getMinutes())}`;
  return `${ymdhm}-${initialsFromAssigner(assignerDisplayName)}-${randomRefSuffix(5)}`;
}

/** Map question.pageId (project or template page id) to project `ProjectPage.id` for filters. */
function resolveAssignableQuestionProjectPageId(
  q: Question,
  projectPages: ProjectPage[],
): string | undefined {
  if (!q.pageId) return undefined;
  const direct = projectPages.find((p) => p.id === q.pageId);
  if (direct) return direct.id;
  const viaTemplate = projectPages.find((p) => p.sourceTemplatePageId === q.pageId);
  if (viaTemplate) return viaTemplate.id;
  return undefined;
}

function isAssignmentLinkSent(a: Assignment): boolean {
  return (
    (typeof a.sentAt === 'number' && a.sentAt > 0) || !!a.token
  );
}

function formatAssignmentQuestionCodes(
  questionIds: string[],
  questions: Question[],
): string {
  const codes = questionIds
    .map((id) => {
      const kod = questions.find((q) => q.id === id)?.kod?.trim();
      return kod ? `#${kod}` : null;
    })
    .filter((code): code is string => !!code);
  return codes.length > 0 ? codes.join(' / ') : '—';
}

function formatAssignmentDateDdMmYyyy(ts?: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatAssignmentDateRange(beginDate?: number, deadline?: number): string {
  return `${formatAssignmentDateDdMmYyyy(beginDate)}→${formatAssignmentDateDdMmYyyy(deadline)}`;
}

type SentPendingBannerInfo = {
  recipientName: string;
  sentAtLabel?: string;
};

function recordMatchesRecipientId(
  record: { id?: string; legacyFirebaseId?: string; contactId?: string },
  recipientId: string,
): boolean {
  const id = recipientId.trim();
  if (!id) return false;
  if (record.id === id) return true;
  if (record.legacyFirebaseId === id) return true;
  if (record.contactId === id) return true;
  return false;
}

function findAssignmentRecipient(
  recipientId: string,
  platformUsers: PlatformUser[],
  contacts: Contact[],
): PlatformUser | Contact | undefined {
  const id = recipientId.trim();
  if (!id) return undefined;

  const platformUser = (platformUsers || []).find((u) =>
    recordMatchesRecipientId(u, id),
  );
  if (platformUser) return platformUser;

  return (contacts || []).find((c) => recordMatchesRecipientId(c, id));
}

function resolveRecipientSentPendingDisplay(
  recipientId: string,
  platformUsers: PlatformUser[],
  contacts: Contact[],
): string {
  const recipient = findAssignmentRecipient(recipientId, platformUsers, contacts);
  const email = recipient?.email?.trim();
  if (email) return email;
  const name = recipient?.name?.trim();
  if (name) return name;
  return recipientId;
}

function resolveSentPendingBannerInfo(
  questionAssignments: Assignment[],
  platformUsers: PlatformUser[],
  contacts: Contact[],
  dateLocale: string,
): SentPendingBannerInfo | undefined {
  const sentAssignment = questionAssignments
    .filter(isAssignmentLinkSent)
    .sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0))[0];
  if (!sentAssignment) return undefined;

  const recipientName = resolveRecipientSentPendingDisplay(
    sentAssignment.recipientId,
    platformUsers,
    contacts,
  );
  const sentAtLabel =
    typeof sentAssignment.sentAt === 'number' && sentAssignment.sentAt > 0
      ? new Date(sentAssignment.sentAt).toLocaleString(dateLocale)
      : undefined;

  return { recipientName, sentAtLabel };
}

function computeRecipientAssignmentSummary(
  recipientAssignments: Assignment[],
  questions: Question[],
  answers: Answer[],
): {
  totalUnique: number;
  answered: number;
  pending: number;
  percent: number;
} {
  const uniqueQuestionIds = new Set<string>();
  for (const assignment of recipientAssignments) {
    for (const qid of assignment.questionIds || []) {
      uniqueQuestionIds.add(qid);
    }
  }
  const totalUnique = uniqueQuestionIds.size;
  let answered = 0;
  for (const qid of uniqueQuestionIds) {
    const q = questions.find((item) => item.id === qid);
    if (!q) continue;
    if (isWorkflowProgressCounted(q, answers, recipientAssignments)) {
      answered += 1;
    }
  }
  const pending = Math.max(0, totalUnique - answered);
  const percent =
    totalUnique > 0 ? Math.round((answered / totalUnique) * 100) : 0;
  return { totalUnique, answered, pending, percent };
}

function RecipientAssignmentSummary({
  recipientAssignments,
  questions,
  answers,
  labels,
}: {
  recipientAssignments: Assignment[];
  questions: Question[];
  answers: Answer[];
  labels: {
    total: string;
    answered: string;
    pending: string;
    percent: string;
  };
}) {
  if (recipientAssignments.length === 0) return null;

  const { totalUnique, answered, pending, percent } =
    computeRecipientAssignmentSummary(
      recipientAssignments,
      questions,
      answers,
    );

  const stats = [
    { label: labels.total, value: totalUnique, tone: 'text-slate-900' },
    { label: labels.answered, value: answered, tone: 'text-emerald-700' },
    { label: labels.pending, value: pending, tone: 'text-blue-700' },
    { label: labels.percent, value: `${percent}%`, tone: 'text-slate-900' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2">
      {stats.map((stat) => (
        <span
          key={stat.label}
          className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500"
        >
          <span className="uppercase tracking-wide">{stat.label}</span>
          <span className={cn('font-bold tabular-nums', stat.tone)}>{stat.value}</span>
        </span>
      ))}
    </div>
  );
}

function RecipientQuestionAssignments({
  recipientAssignments,
  questions,
  answers,
  recipientId,
  isProjectAdmin,
  canManageAssignmentDates,
  labels,
  onEditAssignment,
  onDeleteAssignment,
  onResendAssignmentEmail,
}: {
  recipientAssignments: Assignment[];
  questions: Question[];
  answers: Answer[];
  recipientId: string;
  isProjectAdmin: boolean;
  canManageAssignmentDates: boolean;
  labels: {
    noAssignments: string;
    status: string;
    focus: string;
    overdueStatus: string;
    completedStatus: string;
    pending: string;
      urgencyUrgent: string;
    urgencyNormal: string;
    statusApproaching: string;
    statusNoDeadline: string;
    awaitingApprovalStatus: string;
    points: string;
    editAssignment: string;
    deleteAssignment: string;
    deleteAssignmentBlocked: string;
    resendAssignmentEmail: string;
  };
  onEditAssignment: (assignment: Assignment) => void;
  onDeleteAssignment: (assignment: Assignment) => void;
  onResendAssignmentEmail: (assignment: Assignment) => void;
}) {
  if (recipientAssignments.length === 0) {
    return (
      <div className="border-t border-dashed border-slate-200 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {labels.noAssignments}
      </div>
    );
  }

  const displayLabels = {
    completed: labels.completedStatus,
    awaitingApproval: labels.awaitingApprovalStatus,
    overdue: labels.overdueStatus,
    noDeadline: labels.statusNoDeadline,
    urgent: labels.urgencyUrgent,
    approaching: labels.statusApproaching,
    normal: labels.urgencyNormal,
  };

  const toneClass = (tone: ReturnType<typeof assignmentDisplayStatusTone>) => {
    switch (tone) {
      case 'green':
        return 'bg-green-50 text-green-700';
      case 'violet':
        return 'bg-violet-50 text-violet-700';
      case 'red':
        return 'bg-red-50 text-red-700';
      case 'orange':
        return 'bg-orange-50 text-orange-700';
      case 'amber':
        return 'bg-amber-50 text-amber-800';
      case 'slate':
        return 'bg-slate-100 text-slate-600';
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-700';
    }
  };

  return (
    <div className="divide-y divide-slate-100 border-t border-slate-100">
      {recipientAssignments.map((assignment) => {
        const displayStatus = resolveAssignmentDisplayStatus({
          status: assignment.status,
          urgency: assignment.urgency,
          deadline: assignment.deadline,
        });
        const deleteBlocked = assignmentHasSubstantiveAnswers(
          assignment,
          answers,
          recipientId,
        );
        const statusLabel = labelForAssignmentDisplayStatus(displayStatus, displayLabels);

        return (
          <div
            key={`recipient-assign-${assignment.id}`}
            className="group flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50/80"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold',
                  toneClass(assignmentDisplayStatusTone(displayStatus)),
                )}
              >
                {statusLabel}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-700">
                {(assignment.questionIds || []).length} {labels.points}
              </span>
              <span className="min-w-0 truncate font-medium text-slate-600">
                {formatAssignmentQuestionCodes(assignment.questionIds || [], questions)}
              </span>
              <span className="shrink-0 tabular-nums text-slate-400">
                {formatAssignmentDateRange(assignment.beginDate, assignment.deadline)}
              </span>
            </div>
            {canManageAssignmentDates ? (
              <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                {isAssignmentLinkSent(assignment) ? (
                  <button
                    type="button"
                    onClick={() => onResendAssignmentEmail(assignment)}
                    className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-700"
                    title={labels.resendAssignmentEmail}
                  >
                    <Mail size={13} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onEditAssignment(assignment)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                  title={labels.editAssignment}
                >
                  <Settings size={13} />
                </button>
                {isProjectAdmin ? (
                <button
                  type="button"
                  disabled={deleteBlocked}
                  onClick={() => {
                    if (!deleteBlocked) onDeleteAssignment(assignment);
                  }}
                  className={cn(
                    'rounded p-1.5 transition-colors',
                    deleteBlocked
                      ? 'cursor-not-allowed text-slate-300 opacity-40'
                      : 'text-slate-400 hover:bg-red-50 hover:text-red-600',
                  )}
                  title={
                    deleteBlocked
                      ? labels.deleteAssignmentBlocked
                      : labels.deleteAssignment
                  }
                  aria-disabled={deleteBlocked}
                >
                  <Trash2 size={13} />
                </button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function assignmentsCoveringQuestion(
  q: Question,
  assignmentList: Assignment[],
): Assignment[] {
  return (assignmentList || []).filter((as) =>
    (as.questionIds || []).includes(q.id),
  );
}

/** Virtual dataset tab: aggregate questions from every visible page. */
const FORMS_ALL_PAGES_ID = '__forms_all_pages__';

function questionBelongsToProjectPage(q: Question, page: ProjectPage): boolean {
  if (!q.pageId) return false;
  const templateId = page.sourceTemplatePageId || '';
  return q.pageId === page.id || (!!templateId && q.pageId === templateId);
}

function questionsForProjectPage(
  page: ProjectPage,
  questionList: Question[],
): Question[] {
  return (questionList || []).filter((q) => questionBelongsToProjectPage(q, page));
}

function questionsForVisiblePages(
  pageList: ProjectPage[],
  questionList: Question[],
): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const page of pageList) {
    for (const q of questionsForProjectPage(page, questionList)) {
      if (!seen.has(q.id)) {
        seen.add(q.id);
        out.push(q);
      }
    }
  }
  return out;
}

function filterProjectPagesByKind(
  pageList: ProjectPage[],
  questionList: Question[],
  kind: 'customer' | 'audit',
): ProjectPage[] {
  const matchKind =
    kind === 'audit' ? isAuditQuestionSetPage : isCustomerQuestionSetPage;
  const safePages = pageList || [];
  const safeQuestions = questionList || [];
  return Array.from(
    new Map(
      safePages
        .filter(
          (page) =>
            page?.id &&
            matchKind(page) &&
            safeQuestions.some((q) => questionBelongsToProjectPage(q, page)),
        )
        .map((p) => [p.id, p]),
    ).values(),
  );
}

function resolveQuestionProjectPage(
  q: Question,
  pageList: ProjectPage[],
): ProjectPage | undefined {
  return pageList.find((p) => questionBelongsToProjectPage(q, p));
}

function getAnswersForQuestion(q: Question, answerList: Answer[]): Answer[] {
  return (answerList || [])
    .filter((a) => a.questionId === q.id)
    .sort(
      (a, b) =>
        (b.submittedAt || b.updatedAt || 0) -
        (a.submittedAt || a.updatedAt || 0),
    );
}

function pickPrimaryAnswer(questionAnswers: Answer[]): Answer | undefined {
  return (
    questionAnswers.find((a) => answerHasSubstantiveContent(a)) ||
    questionAnswers[0]
  );
}

function getQuestionWorkflowState(
  q: Question,
  answerList: Answer[],
  assignmentList: Assignment[],
): QuestionWorkflowStatus {
  const ans = pickPrimaryAnswer(getAnswersForQuestion(q, answerList));
  if (ans?.workflowStatus) return ans.workflowStatus;

  if (ans?.adminReviewStatus === 'sent_back') return 'sent_back';
  if (ans?.adminReviewStatus === 'received') return 'customer_responded';
  if (ans?.adminReviewStatus === 'pending') return 'sent_pending';

  const covering = assignmentsCoveringQuestion(q, assignmentList);
  const anySent = covering.some(isAssignmentLinkSent);

  if (!anySent) {
    if (ans?.latestAnswer) return 'customer_responded';
    return 'not_sent';
  }
  if (ans?.latestAnswer) return 'customer_responded';
  return 'sent_pending';
}

function isWorkflowProgressCounted(
  q: Question,
  answerList: Answer[],
  assignmentList: Assignment[],
): boolean {
  const s = getQuestionWorkflowState(q, answerList, assignmentList);
  return s === 'customer_responded' || s === 'approved';
}

type ProjectDetailStrings = (typeof translations)['en']['projectDetail'];

function workflowStatusBadgeClass(status: QuestionWorkflowStatus) {
  switch (status) {
    case 'customer_responded':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'sent_back':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'sent_pending':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function workflowStatusIcon(status: QuestionWorkflowStatus) {
  switch (status) {
    case 'customer_responded':
      return UserCheck;
    case 'approved':
      return CheckCircle2;
    case 'sent_back':
      return RotateCcw;
    case 'sent_pending':
      return Hourglass;
    default:
      return CircleOff;
  }
}

function workflowStatusLabel(
  status: QuestionWorkflowStatus,
  pd: ProjectDetailStrings,
): string {
  switch (status) {
    case 'not_sent':
      return pd.workflowStatusNotSent;
    case 'sent_pending':
      return pd.workflowStatusSentPending;
    case 'customer_responded':
      return pd.workflowStatusCustomerResponded;
    case 'sent_back':
      return pd.workflowStatusSentBack;
    case 'approved':
      return pd.workflowStatusApproved;
    default:
      return status;
  }
}

function FormsWorkflowStatusBanner({
  workflowState,
  pd,
  children,
  variant = 'forms',
  sentPendingInfo,
}: {
  workflowState: QuestionWorkflowStatus;
  pd: ProjectDetailStrings;
  children?: ReactNode;
  variant?: 'forms' | 'audit';
  sentPendingInfo?: SentPendingBannerInfo;
}) {
  if (variant === 'audit' && workflowState === 'not_sent') {
    const Icon = CircleOff;
    return (
      <div
        className={cn(
          'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2',
          children && 'space-y-2',
        )}
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Icon size={13} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700">
              {pd.auditNotEnteredBannerTitle}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{pd.auditNotEnteredBannerSubtitle}</p>
          </div>
        </div>
        {children}
      </div>
    );
  }
  if (variant === 'audit' && workflowState === 'customer_responded') {
    const Icon = UserCheck;
    return (
      <div
        className={cn(
          'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2',
          children && 'space-y-2',
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon size={13} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">{pd.auditEnteredBannerTitle}</p>
            <p className="mt-0.5 text-xs text-slate-500">{pd.auditEnteredBannerSubtitle}</p>
          </div>
        </div>
        {children}
      </div>
    );
  }
  if (workflowState === 'sent_back') {
    const Icon = RotateCcw;
    return (
      <div
        className={cn(
          'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2',
          children && 'space-y-2',
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Icon size={13} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">{pd.formsSentBackBannerTitle}</p>
            <p className="mt-0.5 text-xs text-slate-500">{pd.formsSentBackBannerSubtitle}</p>
          </div>
        </div>
        {children}
      </div>
    );
  }
  if (workflowState === 'approved') {
    const Icon = CheckCircle2;
    return (
      <div
        className={cn(
          'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2',
          children && 'space-y-2',
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon size={13} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">{pd.formsApprovedBannerTitle}</p>
            <p className="mt-0.5 text-xs text-slate-500">{pd.formsApprovedBannerSubtitle}</p>
          </div>
        </div>
        {children}
      </div>
    );
  }
  if (workflowState === 'customer_responded') {
    const Icon = UserCheck;
    return (
      <div
        className={cn(
          'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2',
          children && 'space-y-2',
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon size={13} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">
              {pd.formsCustomerRespondedBannerTitle}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {pd.formsCustomerRespondedBannerSubtitle}
            </p>
          </div>
        </div>
        {children}
      </div>
    );
  }
  if (workflowState === 'sent_pending') {
    const Icon = Hourglass;
    return (
      <div
        className={cn(
          'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2',
          children && 'space-y-2',
        )}
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Icon size={13} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700">
              {pd.formsSentPendingBannerTitle}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {pd.formsSentPendingBannerSubtitle}
            </p>
            {sentPendingInfo ? (
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-700">
                  {pd.formsSentPendingRecipientLabel}:
                </span>{' '}
                {sentPendingInfo.recipientName}
                {sentPendingInfo.sentAtLabel ? (
                  <>
                    <br />
                    <span className="font-semibold text-slate-700">
                      {pd.formsSentPendingSentAtLabel}:
                    </span>{' '}
                    {sentPendingInfo.sentAtLabel}
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    );
  }
  return null;
}

function showFormsWorkflowStatusBanner(
  workflowState: QuestionWorkflowStatus,
  hasAnswers: boolean,
): boolean {
  if (
    workflowState === 'sent_back' ||
    workflowState === 'sent_pending' ||
    workflowState === 'approved'
  ) {
    return true;
  }
  if (workflowState === 'customer_responded' && hasAnswers) return true;
  return false;
}

function showWorkflowStatusBanner(
  workflowState: QuestionWorkflowStatus,
  hasAnswers: boolean,
  isAuditTab: boolean,
): boolean {
  if (isAuditTab) {
    if (!hasAnswers) return false;
    return (
      workflowState === 'sent_pending' ||
      workflowState === 'customer_responded' ||
      workflowState === 'sent_back' ||
      workflowState === 'approved'
    );
  }
  return showFormsWorkflowStatusBanner(workflowState, hasAnswers);
}

function buildWorkflowStatusLogEntry(
  from: QuestionWorkflowStatus,
  to: QuestionWorkflowStatus,
  authorId: string,
  authorName: string,
  pd: ProjectDetailStrings,
): WorkflowStatusLogEntry {
  const text = pd.workflowStatusChanged
    .replace('{user}', authorName)
    .replace('{from}', workflowStatusLabel(from, pd))
    .replace('{to}', workflowStatusLabel(to, pd));
  return {
    id: `wsl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fromStatus: from,
    toStatus: to,
    text,
    authorId,
    authorName,
    createdAt: Date.now(),
  };
}

function workflowSelectOptions(
  workflowState: QuestionWorkflowStatus,
  canPmReview: boolean,
  pd: ProjectDetailStrings,
  isAuditTab?: boolean,
): { value: QuestionWorkflowStatus; label: string }[] {
  // Simplified options for audit tab (auditor forms only)
  if (isAuditTab) {
    if (workflowState === 'customer_responded') {
      return [
        { value: 'customer_responded', label: pd.workflowStatusCustomerResponded },
        { value: 'approved', label: pd.workflowStatusApproved },
      ];
    }
    // For audit tab, only show approved option
    return [
      { value: 'customer_responded', label: pd.workflowStatusCustomerResponded },
      { value: 'approved', label: pd.workflowStatusApproved },
    ];
  }

  // Regular form statuses for questionnaire tab
  if (canPmReview && workflowState === 'customer_responded') {
    return [
      { value: 'customer_responded', label: pd.workflowStatusCustomerResponded },
      { value: 'sent_back', label: pd.workflowStatusSentBack },
      { value: 'approved', label: pd.workflowStatusApproved },
    ];
  }
  if (workflowState === 'customer_responded') {
    return [
      { value: 'customer_responded', label: pd.workflowStatusCustomerResponded },
      { value: 'sent_back', label: pd.workflowStatusSentBack },
    ];
  }
  return [
    { value: 'not_sent', label: pd.workflowStatusNotSent },
    { value: 'sent_pending', label: pd.workflowStatusSentPending },
    { value: 'customer_responded', label: pd.workflowStatusCustomerResponded },
    { value: 'sent_back', label: pd.workflowStatusSentBack },
    { value: 'approved', label: pd.workflowStatusApproved },
  ];
}

// Helper for Gantt Chart dates
function getDaysInDateRange(start: number, end: number) {
  const dates: Date[] = [];
  let current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const stop = new Date(end);
  stop.setHours(0, 0, 0, 0);
  
  while (current <= stop) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function auditLogMonthKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function auditLogMonthLabel(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

function personInitials(name: string): string {
  if (!name?.trim()) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProjectDetailPage() {
  const {
    user,
    profile: currentUser,
    isPlatformAdmin,
    isAdmin,
    canListAllProjects,
    refreshProfile,
  } = useAuth();
  const { t, lang } = useTranslation();
  const assignmentEmailDateLocale = lang === 'tr' ? 'tr-TR' : 'en-GB';
  const { settings } = useSettings();
  const { projectId } = useParams();
  const navigate = useNavigate();

  const goToTasksForProject = useCallback(
    (assignmentId?: string) => {
      if (!projectId) return;
      navigate('/tasks', {
        state: {
          projectId,
          ...(assignmentId ? { highlightAssignmentId: assignmentId } : {}),
        },
      });
    },
    [navigate, projectId],
  );

  const isCustomerPortalUser = isCustomerPortalPlatformUser(currentUser?.role);
  const projectHeaderBackTo = isCustomerPortalUser ? '/' : '/projects';
  const projectHeaderBackLabel = isCustomerPortalUser
    ? t.projectDetail.backToDashboard
    : t.projectDetail.backToProjectsList;

  const { isSidebarCollapsed = false } =
    useOutletContext<{ isSidebarCollapsed?: boolean }>() ?? {};
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px)').matches
      : true,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktopViewport(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const showCustomerAsIcon = isSidebarCollapsed || !isDesktopViewport;

  const [project, setProject] = useState<Project | null>(null);
  const isServiceProject = project?.category === 'Service';
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [pages, setPages] = useState<ProjectPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<ProjectPage | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'forms' | 'audit' | 'plan' | 'users' | 'activity' | 'compliance'
  >('overview');
  const [questionFormsWorkflowFilter, setQuestionFormsWorkflowFilter] =
    useState<FormsWorkflowFilterId>('all');
  const [guidanceExamplesVisible, setGuidanceExamplesVisible] = useState(false);
  const [exportingSubmissionsWithFiles, setExportingSubmissionsWithFiles] =
    useState(false);
  const formsScrollRef = useRef<HTMLDivElement>(null);
  /** Sticky group header height fallback (matches min-h-[3.35rem] + border). */
  const FORMS_STICKY_GROUP_OFFSET_PX = 56;

  const scrollFormsTarget = useCallback((elementId: string) => {
    const scrollEl = formsScrollRef.current;
    const target = document.getElementById(elementId);
    if (!scrollEl || !target) return;

    const targetTop =
      target.getBoundingClientRect().top -
      scrollEl.getBoundingClientRect().top +
      scrollEl.scrollTop;

    const isGroupHeader = elementId.startsWith('forms-group-hdr-');
    let offset = 0;
    if (!isGroupHeader) {
      const groupHeader = target
        .closest('[data-forms-group-section]')
        ?.querySelector<HTMLElement>('[id^="forms-group-hdr-"]');
      offset = groupHeader?.offsetHeight ?? FORMS_STICKY_GROUP_OFFSET_PX;
    }

    scrollEl.scrollTo({
      top: Math.max(0, targetTop - offset),
      behavior: 'smooth',
    });
  }, []);
  const [isEditingOverview, setIsEditingOverview] = useState(false);

  // Modal State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'danger' | 'confirm';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'info'
  });

  const [allTemplates, setAllTemplates] = useState<Template[]>([]);

  const [isRebuilding, setIsRebuilding] = useState(false);
  const [showRebuildModal, setShowRebuildModal] = useState(false);
  const [selectedRebuildTemplateId, setSelectedRebuildTemplateId] = useState<string>('');

  const [dmaConfig, setDmaConfig] = useState<{
    isApproved: boolean;
    materialTopics: string[];
    isE1Material: boolean;
  } | null>(null);
  const [templateSuggestion, setTemplateSuggestion] = useState<{
    templateId: string;
    templateName: string;
    topicId: string;
  } | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set(),
  );

  const showAlert = (title: string, description: string, type: 'info' | 'warning' | 'danger' = 'info') => {
    setModal({ isOpen: true, title, description, type });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void, type: 'confirm' | 'danger' = 'confirm') => {
    setModal({ isOpen: true, title, description, type, onConfirm });
  };
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [serviceCategorySegmentIds, setServiceCategorySegmentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isServiceProject) {
      setServiceCategorySegmentIds([]);
      return;
    }
    let cancelled = false;
    void DB.segments.list().then((segments) => {
      if (cancelled) return;
      setServiceCategorySegmentIds(
        segments
          .filter((s) => s.type === 'Service Category' || s.type === 'Kategori')
          .map((s) => s.id),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [isServiceProject]);

  const serviceCategorySectorId = useMemo(() => {
    if (!isServiceProject) return undefined;
    const fromLoadedTemplate = template?.sectorId?.trim();
    if (fromLoadedTemplate) return fromLoadedTemplate;
    const projectTemplateId = project?.templateId?.trim();
    if (projectTemplateId) {
      const linked = allTemplates.find((tmpl) => tmpl.id === projectTemplateId);
      const fromLinked = linked?.sectorId?.trim();
      if (fromLinked) return fromLinked;
    }
    const fromQuestion = questions.find((q) => q.sectorId?.trim())?.sectorId?.trim();
    return fromQuestion || undefined;
  }, [
    isServiceProject,
    template?.sectorId,
    project?.templateId,
    allTemplates,
    questions,
  ]);

  const rebuildSectorFilterIds = useMemo(() => {
    if (!isServiceProject) return [];
    if (serviceCategorySectorId) return [serviceCategorySectorId];
    const fromCustomer = (customer?.sectorIds || []).filter((id) =>
      serviceCategorySegmentIds.includes(id),
    );
    if (fromCustomer.length > 0) return fromCustomer;
    return serviceCategorySegmentIds;
  }, [
    isServiceProject,
    serviceCategorySectorId,
    customer?.sectorIds,
    serviceCategorySegmentIds,
  ]);

  const filteredRebuildTemplates = useMemo(() => {
    if (isServiceProject) {
      if (rebuildSectorFilterIds.length === 0) return [];
      return allTemplates.filter(
        (t) => t.sectorId && rebuildSectorFilterIds.includes(t.sectorId),
      );
    }
    // For regular projects, show all templates
    return allTemplates;
  }, [allTemplates, customer, isServiceProject, rebuildSectorFilterIds]);

  const [sectorRebuildTemplates, setSectorRebuildTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (!showRebuildModal || !isServiceProject || rebuildSectorFilterIds.length === 0) {
      setSectorRebuildTemplates([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const lists = await Promise.all(
        rebuildSectorFilterIds.map((sectorId) =>
          DB.templates.listBySector(sectorId, true),
        ),
      );
      const merged = Array.from(
        new Map(lists.flat().map((tmpl) => [tmpl.id, tmpl])).values(),
      ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (!cancelled) setSectorRebuildTemplates(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [showRebuildModal, isServiceProject, rebuildSectorFilterIds]);

  const rebuildTemplateOptions = useMemo(() => {
    if (isServiceProject) {
      return sectorRebuildTemplates.length > 0
        ? sectorRebuildTemplates
        : filteredRebuildTemplates;
    }
    return filteredRebuildTemplates;
  }, [isServiceProject, sectorRebuildTemplates, filteredRebuildTemplates]);

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const { workflowStepCounts, pageQuestionsTotal, pageProgressLabel, pageProgressPercent } =
    useMemo(() => {
    const empty: Record<QuestionWorkflowStatus, number> = {
      not_sent: 0,
      sent_pending: 0,
      customer_responded: 0,
      sent_back: 0,
      approved: 0,
    };
    if (!selectedPage) {
      return {
        workflowStepCounts: empty,
        pageQuestionsTotal: 0,
        pageProgressLabel: '0% (0/0)',
        pageProgressPercent: '0%',
      };
    }
    const visiblePagesForCounts =
      activeTab === 'audit'
        ? filterProjectPagesByKind(pages, questions, 'audit')
        : filterProjectPagesByKind(pages, questions, 'customer');
    const pageQs =
      selectedPage.id === FORMS_ALL_PAGES_ID
        ? questionsForVisiblePages(visiblePagesForCounts, questions || [])
        : questionsForProjectPage(selectedPage, questions || []);
    const counts = { ...empty };
    for (const q of pageQs) {
      const questionAnswers = getAnswersForQuestion(q, answers || []);
      if (questionAnswers.length === 0) {
        const s = getQuestionWorkflowState(q, answers || [], assignments || []);
        counts[s]++;
        continue;
      }
      for (const ans of questionAnswers) {
        const s = getAnswerWorkflowState(q, ans, assignments || []);
        counts[s]++;
      }
    }
    const answeredCount = pageQs.filter((q) =>
      isWorkflowProgressCounted(q, answers || [], assignments || []),
    ).length;
    const total = pageQs.length;
    const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    return {
      workflowStepCounts: counts,
      pageQuestionsTotal: total,
      pageProgressLabel: `${pct}% (${answeredCount}/${total})`,
      pageProgressPercent: `${pct}%`,
    };
  }, [
    activeTab,
    selectedPage?.id,
    selectedPage?.sourceTemplatePageId,
    pages,
    questions,
    answers,
    assignments,
  ]);
  const formsWorkflowFilterSteps = useMemo(
    () => {
      const visibleStatuses =
        activeTab === 'audit'
          ? ([
              'not_sent',
              'sent_pending',
              'customer_responded',
              'sent_back',
              'approved',
            ] as QuestionWorkflowStatus[])
          : FORMS_WORKFLOW_FILTER_STATUSES;

      return visibleStatuses.map((status) => ({
        key: status,
        label:
          status === 'not_sent'
            ? activeTab === 'audit'
              ? t.projectDetail.workflowFilterNotSent
              : t.projectDetail.workflowFilterNotSent
            : status === 'sent_pending'
              ? t.projectDetail.workflowFilterSentPending
              : status === 'customer_responded'
                ? t.projectDetail.workflowFilterCustomerResponded
                : status === 'sent_back'
                  ? t.projectDetail.workflowFilterSentBack
                  : t.projectDetail.workflowFilterApproved,
        Icon: workflowStatusIcon(status),
        count: workflowStepCounts[status],
      }));
    },
    [
      activeTab,
      workflowStepCounts,
      t.projectDetail.workflowFilterNotSent,
      t.projectDetail.workflowFilterSentPending,
      t.projectDetail.workflowFilterCustomerResponded,
      t.projectDetail.workflowFilterSentBack,
      t.projectDetail.workflowFilterApproved,
    ],
  );
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [showNewPlatformUser, setShowNewPlatformUser] = useState(false);
  const [editingPlatformUser, setEditingPlatformUser] = useState<PlatformUser | null>(null);
  const [editingStakeholderContact, setEditingStakeholderContact] =
    useState<Contact | null>(null);
  const [newPlatformUserRole, setNewPlatformUserRole] = useState('consultant');
  const [platformUserCustomers, setPlatformUserCustomers] = useState<Customer[]>([]);
  const [tempAvatarPreviewUrl, setTempAvatarPreviewUrl] = useState<string | null>(null);
  const [tempAvatarFile, setTempAvatarFile] = useState<File | null>(null);
  const [isSubmittingPlatformUser, setIsSubmittingPlatformUser] = useState(false);
  const [projectUserAssignments, setProjectUserAssignments] = useState<ProjectUserAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [allDomains, setAllDomains] = useState<Domain[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [pageSummaryModalOpen, setPageSummaryModalOpen] = useState(false);
  const [formsToolbarDrawerOpen, setFormsToolbarDrawerOpen] = useState(false);
  const [formsQuestionEditModal, setFormsQuestionEditModal] = useState<{
    questionId: string;
    draft: string;
  } | null>(null);

  const [questionGuidanceEditModal, setQuestionGuidanceEditModal] = useState<{
    questionId: string;
    draft: QuestionGuidanceDraft;
  } | null>(null);
  const [onBehalfModalQuestion, setOnBehalfModalQuestion] = useState<Question | null>(
    null,
  );
  const [onBehalfModalPrefill, setOnBehalfModalPrefill] = useState<{
    customerName: string;
    customerEmail: string;
    answerText: string;
  } | null>(null);
  const [quickAssignModal, setQuickAssignModal] = useState<{
    isOpen: boolean;
    question: Question | null;
    existingAssignment?: Assignment | null;
  }>({ isOpen: false, question: null });
  const [reassignSentModal, setReassignSentModal] = useState<{
    isOpen: boolean;
    question: Question | null;
    assignment: Assignment | null;
    currentRecipientLabel: string;
  }>({
    isOpen: false,
    question: null,
    assignment: null,
    currentRecipientLabel: '',
  });
  const [activityFilterUserId, setActivityFilterUserId] = useState<string>('all');
  const [activityFilterMonthKey, setActivityFilterMonthKey] = useState<string>('all');
  const [isSavingFormsQuestion, setIsSavingFormsQuestion] = useState(false);
  const [isSavingQuestionGuidance, setIsSavingQuestionGuidance] =
    useState(false);
  const [isCopyingQuestionGuidance, setIsCopyingQuestionGuidance] =
    useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [currentUserAssignment, setCurrentUserAssignment] = useState<Assignment | null>(null);

  // Clear Project Modal State
  const [clearModal, setClearModal] = useState<{
    isOpen: boolean;
    includeUsers: boolean;
    loading: boolean;
  }>({
    isOpen: false,
    includeUsers: false,
    loading: false
  });

  // Sidebar Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  /** Per page+group: when true, kılavuz/örnek satırları gizli (varsayılan: görünür). */
  const [formsGroupGuidanceHidden, setFormsGroupGuidanceHidden] = useState<
    Record<string, boolean>
  >({});
  const [formsGroupSectionsCollapsed, setFormsGroupSectionsCollapsed] = useState<
    Record<string, boolean>
  >({});
  const [formsGuidanceModalQuestion, setFormsGuidanceModalQuestion] = useState<Question | null>(
    null,
  );
  const guidanceMaterialsLabels = useMemo(
    () => ({
      sectionTitle: t.projectDetail.helpMaterialsSectionTitle,
      guidance: t.projectDetail.guidance,
      example: t.projectDetail.example,
      videoTitle: t.templates.aciklamaVideoUrlLabel,
      noContent: t.projectDetail.formsHelpNoExtraContent,
    }),
    [t],
  );
  const [formsQuestionsCollapsed, setFormsQuestionsCollapsed] = useState<
    Record<string, boolean>
  >({});
  const [savingReviewCommentAnswerId, setSavingReviewCommentAnswerId] = useState<
    string | null
  >(null);

  const formsGroupGuidanceKey = useCallback(
    (pageId: string, groupBaslik: string) => `${pageId}::${groupBaslik}`,
    [],
  );

  const isFormsGroupSectionCollapsed = useCallback(
    (pageId: string, groupBaslik: string) =>
      !!formsGroupSectionsCollapsed[formsGroupGuidanceKey(pageId, groupBaslik)],
    [formsGroupSectionsCollapsed, formsGroupGuidanceKey],
  );

  const toggleFormsGroupSectionCollapsed = useCallback(
    (pageId: string, groupBaslik: string) => {
      const storageKey = formsGroupGuidanceKey(pageId, groupBaslik);
      setFormsGroupSectionsCollapsed((prev) => {
        const next = { ...prev };
        if (next[storageKey]) delete next[storageKey];
        else next[storageKey] = true;
        return next;
      });
    },
    [formsGroupGuidanceKey],
  );

  const toggleAllFormsGroupSections = useCallback(
    (groupRefs: Array<{ pageId: string; groupBaslik: string }>) => {
      if (groupRefs.length === 0) return;
      setFormsGroupSectionsCollapsed((prev) => {
        const allCollapsed = groupRefs.every(
          ({ pageId, groupBaslik }) =>
            prev[formsGroupGuidanceKey(pageId, groupBaslik)],
        );
        const next = { ...prev };
        if (allCollapsed) {
          for (const { pageId, groupBaslik } of groupRefs) {
            delete next[formsGroupGuidanceKey(pageId, groupBaslik)];
          }
        } else {
          for (const { pageId, groupBaslik } of groupRefs) {
            next[formsGroupGuidanceKey(pageId, groupBaslik)] = true;
          }
        }
        return next;
      });
    },
    [formsGroupGuidanceKey],
  );

  const toggleAllFormsQuestionsInGroup = useCallback((questionIds: string[]) => {
    if (questionIds.length === 0) return;
    setFormsQuestionsCollapsed((prev) => {
      const allCollapsed = questionIds.every((id) => prev[id]);
      const next = { ...prev };
      if (allCollapsed) {
        for (const id of questionIds) delete next[id];
      } else {
        for (const id of questionIds) next[id] = true;
      }
      return next;
    });
  }, []);

  const isFormsQuestionCollapsed = useCallback(
    (questionId: string) => Boolean(formsQuestionsCollapsed[questionId]),
    [formsQuestionsCollapsed],
  );

  const toggleFormsQuestionCollapsed = useCallback((questionId: string) => {
    setFormsQuestionsCollapsed((prev) => {
      const next = { ...prev };
      if (next[questionId]) delete next[questionId];
      else next[questionId] = true;
      return next;
    });
  }, []);

  const expandFormsGroupSection = useCallback(
    (pageId: string, groupBaslik: string) => {
      const storageKey = formsGroupGuidanceKey(pageId, groupBaslik);
      setFormsGroupSectionsCollapsed((prev) => {
        if (!prev[storageKey]) return prev;
        const next = { ...prev };
        delete next[storageKey];
        return next;
      });
    },
    [formsGroupGuidanceKey],
  );

  const expandFormsQuestion = useCallback((questionId: string) => {
    setFormsQuestionsCollapsed((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  const scrollToNextFormsGroup = useCallback(
    (pageId: string, groupBaslik: string, orderedGroups: string[]) => {
      const idx = orderedGroups.indexOf(groupBaslik);
      const nextGroup = orderedGroups[idx + 1];
      if (!nextGroup) return;
      scrollFormsTarget(
        `forms-group-hdr-${pageId}-${encodeURIComponent(nextGroup)}`,
      );
    },
    [scrollFormsTarget],
  );

  const scrollToPreviousFormsGroup = useCallback(
    (pageId: string, groupBaslik: string, orderedGroups: string[]) => {
      const idx = orderedGroups.indexOf(groupBaslik);
      const prevGroup = orderedGroups[idx - 1];
      if (!prevGroup) return;
      scrollFormsTarget(
        `forms-group-hdr-${pageId}-${encodeURIComponent(prevGroup)}`,
      );
    },
    [scrollFormsTarget],
  );

  const scrollToFormsQuestion = useCallback(
    (questionId: string) => {
      expandFormsQuestion(questionId);
      scrollFormsTarget(`forms-question-${questionId}`);
    },
    [expandFormsQuestion, scrollFormsTarget],
  );

  const toggleGroupGuidanceSections = useCallback(
    (pageId: string, groupBaslik: string, questionsInGroup: Question[]) => {
      if (questionsInGroup.length === 0) return;
      const storageKey = formsGroupGuidanceKey(pageId, groupBaslik);
      const shown =
        guidanceExamplesVisible && !formsGroupGuidanceHidden[storageKey];

      const firstWithMaterials = questionsInGroup.find((q) =>
        questionHasGuidanceMaterials(q.aciklama, q.ornekYanit, q.aciklamaVideoUrl),
      );
      if (!firstWithMaterials) return;

      if (shown) {
        setFormsGroupGuidanceHidden((prev) => ({ ...prev, [storageKey]: true }));
        setFormsGuidanceModalQuestion(null);
        return;
      }

      setGuidanceExamplesVisible(true);
      setFormsGroupGuidanceHidden((prev) => {
        const next = { ...prev };
        delete next[storageKey];
        return next;
      });
      setFormsGuidanceModalQuestion(firstWithMaterials);
    },
    [guidanceExamplesVisible, formsGroupGuidanceHidden, formsGroupGuidanceKey],
  );
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX;
    if (newWidth > 200 && newWidth < 600) {
      setSidebarWidth(newWidth);
    }
  }, []);

  // Assignment Modal State
  const [assignmentModal, setAssignmentModal] = useState<{
    isOpen: boolean;
    recipient: { id: string; name: string; email: string; type: 'contact' | 'user' } | null;
    selectedQuestions: string[];
    beginDate: string;
    deadline: string;
    urgency: AssignmentUrgencyLevel;
    approver: { id: string; name: string; email: string; type: 'contact' | 'user' } | null;
    initialBeginDate: string;
    initialDeadline: string;
    editingAssignmentId: string | null;
    message: string;
    stage: 'merge' | 'select' | 'draft' | 'link';
    generatedLink?: string;
    emailStatus?: string;
    emailSubject: string;
    emailMainBody: string;
    emailSignoff: string;
    mergeFlow: boolean;
    openAssignmentsToMerge: Assignment[];
    mergeSelectedAssignmentIds: string[];
    mergeRecipientId?: string;
  }>({
    isOpen: false,
    recipient: null,
    selectedQuestions: [],
    beginDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    urgency: 'normal',
    approver: null,
    initialBeginDate: new Date().toISOString().split('T')[0],
    initialDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    editingAssignmentId: null,
    message: '',
    stage: 'select',
    emailSubject: '',
    emailMainBody: '',
    emailSignoff: '',
    mergeFlow: false,
    openAssignmentsToMerge: [],
    mergeSelectedAssignmentIds: [],
  });

  const [savingAssignmentDates, setSavingAssignmentDates] = useState(false);
  const [processingAssignment, setProcessingAssignment] = useState(false);
  const [processingMergeAssignment, setProcessingMergeAssignment] = useState(false);
  const processingAssignmentRef = useRef(false);
  const processingMergeAssignmentRef = useRef(false);

  const newAssignmentRef = useCallback(
    () => buildAssignmentReference(currentUser?.name || user?.email || 'Admin'),
    [currentUser?.name, user?.email],
  );

  const [assignQuestionSearch, setAssignQuestionSearch] = useState('');
  const [assignQuestionPageId, setAssignQuestionPageId] = useState('');
  const [assignQuestionBaslikKeys, setAssignQuestionBaslikKeys] = useState<
    string[]
  >([]);
  const [assignBaslikChipSort, setAssignBaslikChipSort] = useState<
    'label' | 'code'
  >('label');

  const [deleteAssignmentConfirm, setDeleteAssignmentConfirm] = useState<{
    isOpen: boolean;
    assignment: Assignment | null;
    recipientName: string;
  }>({
    isOpen: false,
    assignment: null,
    recipientName: ''
  });

  useEffect(() => {
    if (assignmentModal.isOpen && assignmentModal.stage === 'select') {
      setAssignQuestionSearch('');
      setAssignQuestionPageId('');
      setAssignQuestionBaslikKeys([]);
      setAssignBaslikChipSort('label');
    }
  }, [
    assignmentModal.isOpen,
    assignmentModal.stage,
    assignmentModal.recipient?.id,
  ]);

  const assignableQuestionsForModal = useMemo(() => {
    return (questions || []).filter((q) => {
      if (project?.allowMultipleAssignments) return true;
      const isAssigned = (assignments || []).some((a) =>
        a.questionIds?.includes(q.id),
      );
      return !isAssigned;
    });
  }, [questions, assignments, project?.allowMultipleAssignments]);

  const assignModalQuestionsForBaslikChips = useMemo(() => {
    const pageList = pages || [];
    if (!assignQuestionPageId) return assignableQuestionsForModal;
    return assignableQuestionsForModal.filter((q) => {
      const resolved = resolveAssignableQuestionProjectPageId(q, pageList);
      return resolved === assignQuestionPageId;
    });
  }, [assignableQuestionsForModal, assignQuestionPageId, pages]);

  const assignModalBaslikChipOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of assignModalQuestionsForBaslikChips) {
      const raw = q.baslik?.trim() || '';
      const key = raw || ASSIGN_MODAL_BASLIK_EMPTY;
      const label = raw || t.templates.fieldLabelUntagged;
      if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }),
    );
  }, [assignModalQuestionsForBaslikChips, t.templates.fieldLabelUntagged]);

  useEffect(() => {
    const validKeys = new Set(assignModalBaslikChipOptions.map(([key]) => key));
    setAssignQuestionBaslikKeys((prev) => {
      const next = prev.filter((k) => validKeys.has(k));
      return next.length === prev.length ? prev : next;
    });
  }, [assignQuestionPageId, assignModalBaslikChipOptions]);

  const assignModalBaslikChipOptionsSorted = useMemo(() => {
    if (assignBaslikChipSort === 'label') {
      return assignModalBaslikChipOptions;
    }
    const entries = [...assignModalBaslikChipOptions];
    const minKodForKey = (baslikKey: string) => {
      const kods = assignModalQuestionsForBaslikChips
        .filter((q) => {
          const raw = q.baslik?.trim() || '';
          const key = raw || ASSIGN_MODAL_BASLIK_EMPTY;
          return key === baslikKey;
        })
        .map((q) => String(q.kod || '').trim())
        .filter(Boolean);
      kods.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
      );
      return kods[0] || '';
    };
    entries.sort((a, b) =>
      minKodForKey(a[0]).localeCompare(minKodForKey(b[0]), undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
    return entries;
  }, [
    assignModalBaslikChipOptions,
    assignBaslikChipSort,
    assignModalQuestionsForBaslikChips,
  ]);

  const filteredAssignableQuestions = useMemo(() => {
    const s = assignQuestionSearch.trim().toLowerCase();
    const pageList = pages || [];
    return assignableQuestionsForModal.filter((q) => {
      if (assignQuestionPageId) {
        const resolved = resolveAssignableQuestionProjectPageId(q, pageList);
        if (resolved !== assignQuestionPageId) return false;
      }
      if (assignQuestionBaslikKeys.length > 0) {
        const raw = q.baslik?.trim() || '';
        const key = raw || ASSIGN_MODAL_BASLIK_EMPTY;
        if (!assignQuestionBaslikKeys.includes(key)) return false;
      }
      if (s) {
        const kod = (q.kod || '').toLowerCase();
        const soru = (q.soru || '').toLowerCase();
        const pageTitle = (() => {
          const pid = resolveAssignableQuestionProjectPageId(q, pageList);
          const pg = pid ? pageList.find((p) => p.id === pid) : pageList.find((p) => p.id === q.pageId || p.sourceTemplatePageId === q.pageId);
          return (pg?.title || '').toLowerCase();
        })();
        if (
          !kod.includes(s) &&
          !soru.includes(s) &&
          !pageTitle.includes(s)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    assignableQuestionsForModal,
    assignQuestionSearch,
    assignQuestionPageId,
    assignQuestionBaslikKeys,
    pages,
  ]);

  const assignModalPageOptions = useMemo(() => {
    const projectPageIds = new Set<string>();
    for (const q of assignableQuestionsForModal) {
      const id = resolveAssignableQuestionProjectPageId(q, pages || []);
      if (id) projectPageIds.add(id);
    }
    return (pages || []).filter((p) => projectPageIds.has(p.id));
  }, [assignableQuestionsForModal, pages]);

  const mergeModalQuestions = useMemo(() => {
    const ids = new Set(assignmentModal.selectedQuestions || []);
    return (questions || []).filter((q) => ids.has(q.id));
  }, [questions, assignmentModal.selectedQuestions]);

  const projectMemberRoleSelectOptions = useMemo(() => {
    const pd = t.projectDetail;
    const roles: Array<{ value: ProjectUserAssignment['role']; label: string }> = [
      { value: 'contributor', label: pd.projectContributor },
      { value: 'editor', label: pd.projectEditor },
      { value: 'auditor', label: pd.projectAuditor },
      { value: 'admin', label: pd.projectAdmin },
    ];
    const sortLocale = lang === 'tr' ? 'tr' : 'en';
    return [...roles].sort((a, b) =>
      a.label.localeCompare(b.label, sortLocale, { sensitivity: 'base' }),
    );
  }, [lang, t.projectDetail]);

  const assignModalQuestionsGrouped = useMemo(() => {
    const list = filteredAssignableQuestions;
    const keyFor = (q: Question) =>
      (q.baslik || '').trim() || ASSIGN_MODAL_BASLIK_EMPTY;
    const order: string[] = [];
    for (const q of list) {
      const k = keyFor(q);
      if (!order.includes(k)) order.push(k);
    }
    return order.map((key) => ({
      key,
      label:
        key === ASSIGN_MODAL_BASLIK_EMPTY
          ? t.templates.fieldLabelUntagged
          : key,
      items: list.filter((q) => keyFor(q) === key),
    }));
  }, [filteredAssignableQuestions, t.templates.fieldLabelUntagged]);

  const currentProjectAssignment = projectUserAssignments.find(a => a.userId === user?.uid);
  // Pure auditor view (only sees audit tab, not forms)
  const isAuditorProjectView =
    isAuditorPlatformUser(currentUser?.role) ||
    isAuditorProjectRole(currentProjectAssignment?.role);
  const isProjectAdmin =
    !isAuditorProjectView &&
    (isPlatformAdmin || currentProjectAssignment?.role === 'admin');
  /** Project managers + platform/consultant staff may edit assignment dates. */
  const canManageAssignmentDates =
    !isAuditorProjectView &&
    (isPlatformAdmin ||
      isAdmin ||
      currentProjectAssignment?.role === 'admin' ||
      currentProjectAssignment?.role === 'editor');
  const canEdit =
    isPlatformAdmin ||
    currentProjectAssignment?.role === 'admin' ||
    currentProjectAssignment?.role === 'editor';
  const canAccessAuditTab =
    isAuditorProjectView ||
    isPlatformAdmin ||
    currentProjectAssignment?.role === 'admin';
  // Auditors and project managers can review on Denetim (PM enabled for testing).
  const canEditAuditForm =
    activeTab === 'audit' &&
    (isAuditorPlatformUser(currentUser?.role) ||
      isAuditorProjectRole(currentProjectAssignment?.role) ||
      isProjectAdmin);
  const canEnterOnBehalfResponse = canEdit || canEditAuditForm;

  const canUpdateQuestionWorkflow =
    currentUser?.role === 'platform_admin' ||
    currentUser?.role === 'consultant_manager' ||
    (currentUser?.role === 'consultant' && !!currentProjectAssignment) ||
    currentUser?.role === 'auditor' ||
    currentProjectAssignment?.role === 'admin' ||
    currentProjectAssignment?.role === 'editor' ||
    currentProjectAssignment?.role === 'auditor' ||
    canEditAuditForm;

  useEffect(() => {
    if (!isServiceProject || activeTab !== 'audit') return;
    setActiveTab(isAuditorProjectView ? 'forms' : 'overview');
  }, [isServiceProject, activeTab, isAuditorProjectView]);

  const canPmReviewWorkflow =
    isPlatformAdmin ||
    currentUser?.role === 'consultant_manager' ||
    currentProjectAssignment?.role === 'admin';

  const formsReviewCommentLabels = useMemo(
    () => ({
      sectionTitle: t.projectDetail.formsReviewCommentsTitle,
      placeholder: t.projectDetail.formsReviewCommentPlaceholder,
      submit: t.projectDetail.formsReviewCommentSubmit,
      saving: t.projectDetail.formsReviewCommentSaving,
    }),
    [
      t.projectDetail.formsReviewCommentsTitle,
      t.projectDetail.formsReviewCommentPlaceholder,
      t.projectDetail.formsReviewCommentSubmit,
      t.projectDetail.formsReviewCommentSaving,
    ],
  );

  const auditReviewLabels = useMemo(
    () => ({
      notesTitle: t.projectDetail.auditReviewNotesTitle,
      notesPlaceholder: t.projectDetail.auditReviewNotesPlaceholder,
      notesSubmit: t.projectDetail.auditReviewNotesSubmit,
      notesSaving: t.projectDetail.auditReviewNotesSaving,
      accept: t.projectDetail.auditReviewAccept,
      reject: t.projectDetail.auditReviewReject,
      explanation: t.projectDetail.auditReviewExplanation,
      submitting: t.projectDetail.auditReviewSubmitting,
      acceptLog: t.projectDetail.auditReviewAcceptLog,
      rejectLog: t.projectDetail.auditReviewRejectLog,
      explanationLog: t.projectDetail.auditReviewExplanationLog,
      failed: t.projectDetail.auditReviewFailed,
    }),
    [t.projectDetail],
  );

  const handleAddAnswerReviewComment = useCallback(
    async (answerId: string, text: string) => {
      if (!projectId) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const canComment = canPmReviewWorkflow || canEditAuditForm;
      if (!canComment) return;
      const ans = (answers || []).find(
        (a) => a.id === answerId || a.legacyFirebaseId === answerId,
      );
      if (!ans) return;

      const answerKey = ans.legacyFirebaseId?.trim() || ans.id;
      setSavingReviewCommentAnswerId(ans.id);
      try {
        const saved = await DB.projects.addAnswerReviewComment(projectId, answerKey, {
          text: trimmed,
          authorId: user?.uid || '',
          authorName: currentUser?.name || user?.email || '—',
        });
        const savedId = saved.legacyFirebaseId?.trim() || saved.id;
        setAnswers((prev) =>
          prev.map((a) =>
            a.id === ans.id || a.legacyFirebaseId === answerKey || a.id === answerKey
              ? { ...a, ...saved, id: savedId, reviewComments: saved.reviewComments || [] }
              : a,
          ),
        );
        if (user && canEditAuditForm) {
          const q = (questions || []).find((item) => item.id === ans.questionId);
          const qLabel = q
            ? [q.kod, q.soru?.trim().slice(0, 100)].filter(Boolean).join(' — ')
            : '';
          const activityText = qLabel
            ? `Denetim — Not Ekle (${qLabel}): ${trimmed}`
            : `Denetim — Not Ekle: ${trimmed}`;
          await logActivity(
            user,
            'update',
            'answers',
            answerKey,
            activityText,
            projectId,
          );
          const freshLogs = await DB.auditLogs.list(projectId, undefined, 500);
          setAuditLogs(freshLogs);
        }
      } catch (err) {
        console.error(err);
        showAlert(t.common.error, t.common.errorOccurred, 'danger');
      } finally {
        setSavingReviewCommentAnswerId(null);
      }
    },
    [
      projectId,
      canPmReviewWorkflow,
      canEditAuditForm,
      answers,
      user,
      user?.uid,
      user?.email,
      currentUser?.name,
      questions,
      t.common.error,
      t.common.errorOccurred,
      showAlert,
    ],
  );

  const openAuditResponseModal = useCallback((q: Question, existing?: Answer | null) => {
    setOnBehalfModalPrefill({
      customerName: '',
      customerEmail: '',
      answerText: existing?.latestAnswer?.trim() || '',
    });
    setOnBehalfModalQuestion(q);
  }, []);

  const getPlatformRoleLabel = useCallback(
    (role: string) => {
      switch (role) {
        case 'platform_admin':
          return t.users.roles.platform_admin;
        case 'consultant_manager':
          return t.users.roles.consultant_manager;
        case 'consultant':
          return t.users.roles.consultant;
        case 'customer':
          return t.users.roles.customer;
        case 'contributor':
          return t.users.roles.contributor;
        case 'auditor':
          return t.users.roles.auditor;
        default:
          return role.replace(/_/g, ' ');
      }
    },
    [t],
  );

  const resolveCustomerName = useCallback(
    (customerId?: string | null) => {
      const id = customerId ?? project?.customerId;
      if (!id) return customer?.name;
      const fromList = platformUserCustomers.find((c) => c.id === id);
      if (fromList?.name) return fromList.name;
      if (customer?.id === id) return customer.name;
      return undefined;
    },
    [customer, platformUserCustomers, project?.customerId],
  );

  const customerRoleSuffix = useCallback(
    (platformUser: PlatformUser) =>
      platformUser.role === 'customer'
        ? resolveCustomerName(platformUser.customerId)
        : undefined,
    [resolveCustomerName],
  );

  const getUserCardInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const clearTempAvatar = useCallback(() => {
    if (tempAvatarPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(tempAvatarPreviewUrl);
    }
    setTempAvatarPreviewUrl(null);
    setTempAvatarFile(null);
  }, [tempAvatarPreviewUrl]);

  const handleAvatarFileSelect = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showAlert(t.common.error, 'Please select an image file.', 'warning');
        return;
      }
      if (tempAvatarPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(tempAvatarPreviewUrl);
      }
      setTempAvatarFile(file);
      setTempAvatarPreviewUrl(URL.createObjectURL(file));
    },
    [tempAvatarPreviewUrl, t.common.error],
  );

  const uploadProfileImage = async (file: File) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No active session found. Please sign in again.');
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/uploads/profile-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success || !payload?.data?.url) {
      throw new Error(payload?.error || 'Failed to upload image.');
    }
    return payload.data.url as string;
  };

  const closePlatformUserModal = useCallback(() => {
    setShowNewPlatformUser(false);
    setEditingPlatformUser(null);
    clearTempAvatar();
  }, [clearTempAvatar]);

  const openEditPlatformUser = useCallback(
    (platformUser: PlatformUser) => {
      clearTempAvatar();
      setShowNewPlatformUser(false);
      setEditingPlatformUser(platformUser);
      setNewPlatformUserRole(platformUser.role);
    },
    [clearTempAvatar],
  );

  const handleCreatePlatformUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formatPersonName(formData.get('name') as string);
    const email = (formData.get('email') as string).trim();
    const role = formData.get('role') as PlatformUser['role'];
    const language = formData.get('language') as 'en' | 'tr';
    const customerId =
      role === 'customer'
        ? (formData.get('customerId') as string) || project?.customerId || null
        : null;
    const departmentInput = formData.get('department') as string;
    const department =
      departmentInput?.trim() || (role === 'customer' ? 'Customer' : 'General');
    let avatarUrl = '';

    if (!name || !email) return;

    setIsSubmittingPlatformUser(true);
    try {
      const existing = await DB.platformUsers.getByEmail(email);
      if (existing) {
        showAlert(
          t.users.createFailed,
          t.users.emailAlreadyExists.replace('{name}', existing.name || email),
          'warning',
        );
        return;
      }

      if (tempAvatarFile) {
        avatarUrl = await uploadProfileImage(tempAvatarFile);
      }
      const newUserId = await DB.platformUsers.create({
        name,
        email,
        role,
        department,
        avatarUrl,
        language,
        customerId,
      });
      if (currentUser && newUserId) {
        await logActivity(
          currentUser,
          'create',
          'platformUsers',
          newUserId,
          `Invited user ${name} (${email}) as ${role}`,
          projectId,
        );
      }
      const list = await DB.platformUsers.list();
      setPlatformUsers(uniqueById(list || []));
      closePlatformUserModal();
      showAlert(t.common.saved, t.common.inviteMember);
    } catch (err: unknown) {
      const message = parseApiErrorMessage(err, t.common.errorOccurred);
      showAlert(t.users.createFailed, message, 'danger');
    } finally {
      setIsSubmittingPlatformUser(false);
    }
  };

  useEffect(() => {
    return () => {
      if (tempAvatarPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(tempAvatarPreviewUrl);
      }
    };
  }, [tempAvatarPreviewUrl]);

  useEffect(() => {
    if (!showNewPlatformUser && !editingPlatformUser) return;
    let cancelled = false;
    DB.customers
      .list()
      .then((data) => {
        if (!cancelled) setPlatformUserCustomers(data || []);
      })
      .catch(() => {
        if (!cancelled) setPlatformUserCustomers(customer ? [customer] : []);
      });
    return () => {
      cancelled = true;
    };
  }, [showNewPlatformUser, editingPlatformUser, customer]);

  const platformUserCustomersSorted = useMemo(() => {
    const sortLocale = lang === 'tr' ? 'tr' : 'en';
    return [...platformUserCustomers].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', sortLocale, { sensitivity: 'base' }),
    );
  }, [platformUserCustomers, lang]);

  const isLinkExpired = (tokenLink: string) => {
    try {
      const token = tokenLink.split('/').pop() || '';
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return Date.now() > payload.exp * 1000;
    } catch {
      return false;
    }
  };

  const uniqueById = <T extends { id: string }>(list: T[]): T[] => {
    const safeList = list || [];
    return Array.from(new Map(safeList.filter(item => item && item.id).map(item => [item.id, item])).values());
  };

  const formsVisiblePages = useMemo(
    () => uniqueById(filterProjectPagesByKind(pages, questions, 'customer')),
    [pages, questions],
  );
  const auditVisiblePages = useMemo(
    () => uniqueById(filterProjectPagesByKind(pages, questions, 'customer')),
    [pages, questions],
  );
  const visiblePages =
    !isServiceProject && activeTab === 'audit' ? auditVisiblePages : formsVisiblePages;

  const isFormsAllPagesView = selectedPage?.id === FORMS_ALL_PAGES_ID;

  const formsActivePageQuestions = useMemo(() => {
    if (!selectedPage) return [];
    if (isFormsAllPagesView) {
      return questionsForVisiblePages(visiblePages, questions || []);
    }
    return questionsForProjectPage(selectedPage, questions || []);
  }, [selectedPage, isFormsAllPagesView, visiblePages, questions]);

  const formsAllPagesTab = useMemo(
    (): ProjectPage => ({
      id: FORMS_ALL_PAGES_ID,
      projectId: projectId || '',
      sourceTemplatePageId: '',
      title: t.projectDetail.formsAllPagesTab,
      order: 99999,
      briefText: '',
      draftContent: '',
      draftStatus: 'pending',
      answerUpdatedFlag: false,
    }),
    [projectId, t.projectDetail.formsAllPagesTab],
  );

  const overviewHealthStats = useMemo(() => {
    const list =
      isAuditorProjectView && !isServiceProject ? auditVisiblePages : formsVisiblePages;
    const assign = assignments || [];
    return {
      qTotal: list.length,
      qApproved: list.filter((p) => p.draftStatus === 'approved').length,
      qDrafted: list.filter((p) => p.draftStatus === 'drafted').length,
      qPending: list.filter((p) => p.draftStatus === 'pending').length,
      aTotal: assign.length,
      aCompleted: assign.filter((a) => a.status === 'completed').length,
      aPending: assign.filter(
        (a) => a.status === 'pending' || a.status === 'overdue',
      ).length,
    };
  }, [isAuditorProjectView, formsVisiblePages, auditVisiblePages, assignments]);

  const projectTeamMembersCount = useMemo(() => {
    const ids = [...new Set((projectUserAssignments || []).map((a) => a.userId))];
    return ids.filter((id) => {
      const u = (platformUsers || []).find((x) => x.id === id);
      if (u) return u.role !== 'platform_admin';
      return (contacts || []).some((c) => c.id === id);
    }).length;
  }, [projectUserAssignments, platformUsers, contacts]);

  const assignmentRowLabels = useMemo(
    () => ({
      noAssignments: t.projectDetail.noAssignments,
      status: t.projectDetail.status,
      focus: t.projectDetail.focus,
      overdueStatus: t.projectDetail.overdueStatus,
      completedStatus: t.projectDetail.completedStatus,
      pending: t.projectDetail.pending,
      urgencyUrgent: t.projectDetail.urgencyUrgent,
      urgencyNormal: t.projectDetail.urgencyNormal,
      statusApproaching: t.projectDetail.statusApproaching,
      statusNoDeadline: t.projectDetail.statusNoDeadline,
      awaitingApprovalStatus: t.projectDetail.awaitingApprovalStatus,
      points: t.projectDetail.points,
      editAssignment: t.projectDetail.editAssignment,
      deleteAssignment: t.projectDetail.deleteAssignment,
      deleteAssignmentBlocked: t.projectDetail.deleteAssignmentBlocked,
      resendAssignmentEmail: t.tasks.resendAssignmentEmail,
    }),
    [t],
  );

  const assignmentSummaryLabels = useMemo(
    () => ({
      total: t.projectDetail.recipientAssignmentSummaryTotal,
      answered: t.projectDetail.recipientAssignmentSummaryAnswered,
      pending: t.projectDetail.recipientAssignmentSummaryPending,
      percent: t.projectDetail.recipientAssignmentSummaryPercent,
    }),
    [t],
  );

  const assigneeNoticeLabels = useMemo(
    () => ({
      title: t.projectDetail.assigneeNoticeTitle,
      fromUser: t.projectDetail.assigneeNoticeFromUser,
      sentAt: t.projectDetail.assigneeNoticeSentAt,
      hasNotes: t.projectDetail.assigneeNoticeHasNotes,
      hasEvidence: t.projectDetail.assigneeNoticeHasEvidence,
      clickReassign: t.projectDetail.assigneeNoticeClickReassign,
    }),
    [t],
  );

  const auditorActivityUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const assignment of projectUserAssignments || []) {
      if (isAuditorProjectRole(assignment.role)) {
        ids.add(assignment.userId);
      }
    }
    for (const u of platformUsers || []) {
      if (isAuditorPlatformUser(u.role)) {
        ids.add(u.id);
      }
    }
    return ids;
  }, [projectUserAssignments, platformUsers]);

  const projectPlatformUsers = useMemo(() => {
    const projectUserIds = new Set(
      (projectUserAssignments || []).map((a) => a.userId)
    );
    return (platformUsers || []).filter((u) => projectUserIds.has(u.id));
  }, [projectUserAssignments, platformUsers]);

  const assignedProjectUserIds = useMemo(
    () => new Set((projectUserAssignments || []).map((a) => a.userId)),
    [projectUserAssignments],
  );

  const unassignedPlatformUsersForProject = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    const sortLocale = lang === 'tr' ? 'tr' : 'en';
    return (platformUsers || [])
      .filter((u) => u.role !== 'platform_admin' && !assignedProjectUserIds.has(u.id))
      .filter((u) => platformUserVisibleForProject(u, project?.customerId))
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q),
      )
      .sort((a, b) =>
        comparePlatformUsersForProjectUnassignedList(a, b, sortLocale),
      );
  }, [
    platformUsers,
    assignedProjectUserIds,
    userSearchQuery,
    project?.customerId,
    lang,
  ]);

  const unassignedCustomerStakeholders = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    const sortLocale = lang === 'tr' ? 'tr' : 'en';
    return ((contacts || []).filter((c) => c.customerId === project?.customerId) || [])
      .filter((c) => {
        if (assignedProjectUserIds.has(c.id)) return false;
        const linkedUser = (platformUsers || []).find((u) =>
          platformUserLinkedToStakeholderContact(u, c),
        );
        if (linkedUser && assignedProjectUserIds.has(linkedUser.id)) return false;
        return true;
      })
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q),
      )
      .map((c) => {
        const linkedPlatformUser = (platformUsers || []).find((u) =>
          platformUserLinkedToStakeholderContact(u, c),
        );
        return { contact: c, linkedPlatformUser };
      })
      .sort((a, b) => {
        const aLinked = Boolean(a.linkedPlatformUser);
        const bLinked = Boolean(b.linkedPlatformUser);
        if (aLinked !== bLinked) return aLinked ? 1 : -1;
        return (a.contact.name || '').localeCompare(b.contact.name || '', sortLocale, {
          sensitivity: 'base',
        });
      });
  }, [
    contacts,
    project?.customerId,
    platformUsers,
    assignedProjectUserIds,
    userSearchQuery,
    lang,
  ]);

  const projectAuditLogs = useMemo(() => {
    const list = auditLogs || [];
    if (!isAuditorProjectView) return list;
    return list.filter((log) => auditorActivityUserIds.has(log.userId));
  }, [auditLogs, isAuditorProjectView, auditorActivityUserIds]);

  const sortedAuditLogs = useMemo(
    () => [...projectAuditLogs].sort((a, b) => b.timestamp - a.timestamp),
    [projectAuditLogs],
  );

  const overviewActivityLogs = useMemo(
    () => sortedAuditLogs.slice(0, 3),
    [sortedAuditLogs],
  );

  const overviewProgressPercent = useMemo(() => {
    if (!isAuditorProjectView) return project?.progress || 0;
    const auditQuestions = questionsForVisiblePages(
      auditVisiblePages,
      questions || [],
    );
    if (auditQuestions.length === 0) return 0;
    const answered = auditQuestions.filter((q) =>
      isWorkflowProgressCounted(q, answers || [], assignments || []),
    ).length;
    return Math.round((answered / auditQuestions.length) * 100);
  }, [
    isAuditorProjectView,
    project?.progress,
    auditVisiblePages,
    questions,
    answers,
    assignments,
  ]);

  const activityFilterOptions = useMemo(() => {
    const people = new Map<string, string>();
    const months = new Map<string, string>();
    for (const log of sortedAuditLogs) {
      const label =
        log.userName?.trim() || log.userEmail?.trim() || t.projectDetail.unknown;
      people.set(log.userId, label);
      const mk = auditLogMonthKey(log.timestamp);
      months.set(mk, auditLogMonthLabel(log.timestamp, assignmentEmailDateLocale));
    }
    return {
      people: [...people.entries()].sort((a, b) =>
        a[1].localeCompare(b[1], assignmentEmailDateLocale),
      ),
      months: [...months.entries()].sort((a, b) => b[0].localeCompare(a[0])),
    };
  }, [sortedAuditLogs, assignmentEmailDateLocale, t.projectDetail.unknown]);

  const filteredAuditLogs = useMemo(() => {
    return sortedAuditLogs.filter((log) => {
      if (activityFilterUserId !== 'all' && log.userId !== activityFilterUserId) {
        return false;
      }
      if (
        activityFilterMonthKey !== 'all' &&
        auditLogMonthKey(log.timestamp) !== activityFilterMonthKey
      ) {
        return false;
      }
      return true;
    });
  }, [sortedAuditLogs, activityFilterUserId, activityFilterMonthKey]);

  const FORMS_ALL_PAGES_COLOR = {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    divide: 'divide-slate-200',
    text: 'text-slate-700',
    activeBg: 'bg-slate-200',
    dot: 'bg-slate-500',
    bar: 'bg-slate-400',
  };

  const DATASET_COLORS = [
    { bg: 'bg-[#E3F2FD]', border: 'border-[#BBDEFB]', divide: 'divide-[#BBDEFB]', text: 'text-blue-900', activeBg: 'bg-[#BBDEFB]', dot: 'bg-blue-600', bar: 'bg-blue-500' },
    { bg: 'bg-[#F3E5F5]', border: 'border-[#E1BEE7]', divide: 'divide-[#E1BEE7]', text: 'text-purple-900', activeBg: 'bg-[#E1BEE7]', dot: 'bg-purple-600', bar: 'bg-purple-500' },
    { bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', divide: 'divide-[#C8E6C9]', text: 'text-green-900', activeBg: 'bg-[#C8E6C9]', dot: 'bg-green-600', bar: 'bg-green-500' },
    { bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', divide: 'divide-[#FFE0B2]', text: 'text-orange-900', activeBg: 'bg-[#FFE0B2]', dot: 'bg-orange-600', bar: 'bg-orange-500' },
    { bg: 'bg-[#E0F2F1]', border: 'border-[#B2DFDB]', divide: 'divide-[#B2DFDB]', text: 'text-teal-900', activeBg: 'bg-[#B2DFDB]', dot: 'bg-teal-600', bar: 'bg-teal-500' },
    { bg: 'bg-[#FFFDE7]', border: 'border-[#FFF9C4]', divide: 'divide-[#FFF9C4]', text: 'text-yellow-900', activeBg: 'bg-[#FFF9C4]', dot: 'bg-yellow-600', bar: 'bg-yellow-500' },
  ];

  const selectedPageIndex = visiblePages.findIndex((p) => p.id === selectedPage?.id);
  const currentPageColor = isFormsAllPagesView
    ? FORMS_ALL_PAGES_COLOR
    : selectedPageIndex !== -1
      ? DATASET_COLORS[selectedPageIndex % DATASET_COLORS.length]
      : DATASET_COLORS[0];


  useEffect(() => {
    if (projectId) loadProjectData();
  }, [projectId]);

  // Load DMA config and check for template recommendations
  useEffect(() => {
    if (!project || !customer) {
      setDmaConfig(null);
      setTemplateSuggestion(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const config = await apiRequest<{
          isApproved: boolean;
          materialTopics: string[];
          isE1Material: boolean;
          isDMAComplete: boolean;
        }>(`/api/materiality/config?customerId=${encodeURIComponent(project.customerId)}&year=${new Date().getFullYear()}`);

        if (cancelled) return;
        setDmaConfig(config);

        // Check if we should suggest loading a template
        if (config.isApproved && config.materialTopics.length > 0 && !project.templateId) {
          const recommendations = getRecommendedTemplatesForMaterialTopics(config.materialTopics);
          if (recommendations.length > 0 && allTemplates.length > 0) {
            const firstRec = recommendations[0];
            const matchingTemplate = findTemplateByRecommendation(allTemplates, firstRec);
            if (matchingTemplate && !dismissedSuggestions.has(matchingTemplate)) {
              setTemplateSuggestion({
                templateId: matchingTemplate,
                templateName: firstRec.templateNameTr,
                topicId: firstRec.esrsId,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load DMA config:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [project?.id, customer?.id, project?.templateId, allTemplates]);

  useEffect(() => {
    if (loading || !projectId || !user?.uid) return;
    if (!isAuditorPlatformUser(currentUser?.role)) return;
    const hasAuditorAssignment = (projectUserAssignments || []).some(
      (a) => a.userId === user.uid && isAuditorProjectRole(a.role),
    );
    if (!hasAuditorAssignment) {
      navigate('/projects', { replace: true });
    }
  }, [
    loading,
    projectId,
    projectUserAssignments,
    currentUser?.role,
    user?.uid,
    navigate,
  ]);

  useEffect(() => {
    if (visiblePages.length === 0) {
      setSelectedPage(null);
      return;
    }
    if (!selectedPage || !visiblePages.some((p) => p.id === selectedPage.id)) {
      setSelectedPage(visiblePages[0]);
    }
  }, [activeTab, visiblePages, selectedPage?.id]);

  useEffect(() => {
    setQuestionFormsWorkflowFilter('all');
    setGuidanceExamplesVisible(false);
    setExpandedSections({});
    setFormsGroupGuidanceHidden({});
    setFormsGroupSectionsCollapsed({});
    setFormsGuidanceModalQuestion(null);
  }, [selectedPage?.id]);

  async function loadProjectData() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const pData = await DB.projects.get(projectId, true); // Force fetch to get latest status
      
      if (pData) {
        if (currentUser && platformUserCustomerIdMismatchForProject(currentUser, pData.customerId)) {
          navigate('/projects', { replace: true });
          return;
        }
        setProject(pData);
        setEditedProject({
          name: pData.name,
          startDate: pData.startDate,
          endDate: pData.endDate,
          status: pData.status,
          helpVideoUrl: pData.helpVideoUrl,
          allowMultipleAssignments: pData.allowMultipleAssignments || false,
          domainIds: pData.domainIds || []
        });

        // Load all templates for rebuild questionnaire modal
        const tList = await DB.templates.listAll(true);
        setAllTemplates(tList);
        
        // Use Promise.allSettled or wrap in individual try-catches to prevent total failure
        const wrap = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
          try { return await p; } catch (e) { 
            console.warn("Partial project load failure:", e);
            return fallback; 
          }
        };

        const [pagesList, cList, qList, aList, assignList, uList, puAssignList, logs, customerData, templateData, domainsList] = await Promise.all([
          wrap(DB.projects.listPages(projectId), []),
          wrap(DB.contacts.listByCustomer(pData.customerId), []),
          wrap(DB.questions.listForProject(projectId, pData.templateId), []),
          wrap(DB.projects.listAnswers(projectId), []),
          wrap(DB.projects.listAssignments(projectId), []),
          wrap(DB.platformUsers.list(), []),
          wrap(DB.projects.listUserAssignments(projectId), []),
          wrap(DB.auditLogs.list(projectId, undefined, 500), []),
          wrap(DB.customers.get(pData.customerId), null),
          wrap(
            pData.templateId?.trim()
              ? DB.templates.get(pData.templateId.trim())
              : Promise.resolve(null),
            null,
          ),
          wrap(DB.domains.list(), []),
        ]);

        setPages(uniqueById(pagesList));
        setContacts(uniqueById(cList));
        setQuestions(uniqueById(qList));
        setAnswers(uniqueById(aList));
        setAssignments(uniqueById(assignList));
        setPlatformUsers(uniqueById(uList));
        setProjectUserAssignments(uniqueById(puAssignList));
        setAuditLogs(uniqueById(logs));
        setCustomer(customerData);
        setTemplate(templateData);
        setAllDomains(uniqueById(domainsList));

        // Track current user's assignment for this project
        const myAssign = assignList.find(a => a.recipientId === user?.uid);
        setCurrentUserAssignment(myAssign || null);

        // Filter and set selected page safely
        const availableQuestions = uniqueById(qList);
        const customerPagesList = filterProjectPagesByKind(
          uniqueById(pagesList),
          availableQuestions,
          'customer',
        );
        const auditPagesList = filterProjectPagesByKind(
          uniqueById(pagesList),
          availableQuestions,
          'audit',
        );
        const myProjectRole = puAssignList.find((a) => a.userId === user?.uid)?.role;
        const loadAsAuditor =
          isAuditorPlatformUser(currentUser?.role) ||
          isAuditorProjectRole(myProjectRole);
        const initialPagesList = loadAsAuditor
          ? auditPagesList
          : customerPagesList.length > 0
            ? customerPagesList
            : auditPagesList;

        if (initialPagesList.length > 0) {
          setSelectedPage((prev) => {
            if (prev && initialPagesList.some((p) => p.id === prev.id)) {
              return prev;
            }
            return initialPagesList[0];
          });
        } else {
          setSelectedPage(null);
        }
      }
    } catch (err: any) {
      console.error("Project load error:", err);
      try {
        const detailed = JSON.parse(err.message);
        setError(detailed.error);
      } catch {
        setError("Failed to load project details.");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleClearProject = async () => {
    if (!projectId || !project) return;
    setClearModal(prev => ({ ...prev, loading: true }));
    try {
      const success = await DB.projects.clearData(projectId, clearModal.includeUsers);
      if (success) {
        if (user) {
          await DB.logActivity(
            user,
            'delete',
            'projects',
            projectId,
            `Cleared all data for project: ${project.name}. Include Users: ${clearModal.includeUsers}`,
            projectId
          );
        }
        setClearModal({ isOpen: false, includeUsers: false, loading: false });
        loadProjectData();
        showAlert(
          t.projectDetail.clearProjectSuccessTitle,
          t.projectDetail.clearProjectSuccessDescription,
        );
      }
    } catch (err) {
      console.error("Clear project failed:", err);
      showAlert(
        t.projectDetail.clearProjectFailedTitle,
        t.projectDetail.clearProjectFailedDescription,
        'danger',
      );
    } finally {
      setClearModal(prev => ({ ...prev, loading: false }));
    }
  };

  const buildSubmissionExportRows = useCallback(
    (answerList: Answer[]) =>
      answerList.map((answer) => {
        const assignment = (assignments || []).find((a) => a.id === answer.assignmentId);
        const question = (questions || []).find((q) => q.id === answer.questionId);

        const assigneeUser = (platformUsers || []).find((u) => u.id === assignment?.recipientId);
        const assigneeContact = (contacts || []).find((c) => c.id === assignment?.recipientId);

        const resolveActorName = (userId?: string) => {
          if (!userId) return 'Unknown';
          const u = (platformUsers || []).find((x) => x.id === userId);
          if (u) return u.name;
          const c = (contacts || []).find((x) => x.id === userId);
          if (c) return c.name;
          return userId;
        };

        const assigneeName =
          assignment?.recipientType === 'user'
            ? assigneeUser?.name || 'Unknown User'
            : assigneeContact?.name || 'Unknown Contact';
        const submittedByName = resolveActorName(
          answer.submittedByUserId || answer.contactId,
        );
        const onBehalfOfName = resolveActorName(
          answer.onBehalfOfUserId || answer.contactId,
        );

        const statusLogText = (answer.workflowStatusLog || [])
          .map((e) => e.text)
          .join('\n');

        return {
          'Question ID': question?.kod || 'N/A',
          'Question Title': question?.baslik || 'N/A',
          Assignee: assigneeName,
          'Assigned Date': assignment?.sentAt
            ? new Date(assignment.sentAt).toLocaleString()
            : 'N/A',
          Deadline: assignment?.deadline
            ? new Date(assignment.deadline).toLocaleDateString()
            : 'N/A',
          'Submitted By': submittedByName,
          'On Behalf Of': onBehalfOfName,
          'Submission Date': answer.submittedAt
            ? new Date(answer.submittedAt).toLocaleString()
            : 'N/A',
          Status: assignment?.status?.toUpperCase() || 'N/A',
          'Has Attachment': answer.latestFileUrl ? 'Yes' : 'No',
          'Attachment Name': answer.evidenceName || 'N/A',
          Comments: answer.comment || '',
          'Status updates': statusLogText,
          'Answer Text': answer.latestAnswer || '',
          'Latest Submission': 'Yes',
        };
      }),
    [assignments, questions, platformUsers, contacts],
  );

  const buildSubmissionsWorkbook = useCallback(
    (data: ReturnType<typeof buildSubmissionExportRows>) => {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');

      const maxWidths = data.reduce((acc: number[], row) => {
        Object.keys(row).forEach((key, i) => {
          const val = (row as Record<string, string>)[key]?.toString() ?? '';
          acc[i] = Math.max(acc[i] || 10, val.length + 2);
        });
        return acc;
      }, []);
      worksheet['!cols'] = maxWidths.map((w) => ({ wch: w }));

      return workbook;
    },
    [],
  );

  const submissionExportBaseName = useCallback(
    (fileLabel: string) => {
      const safeProject = sanitizeExportToken(project?.name || 'Project', 48);
      const date = new Date().toISOString().split('T')[0];
      return `${fileLabel}_${safeProject}_${date}`;
    },
    [project?.name],
  );

  const writeSubmissionsWorkbook = useCallback(
    (data: ReturnType<typeof buildSubmissionExportRows>, fileLabel: string) => {
      const workbook = buildSubmissionsWorkbook(data);
      XLSX.writeFile(workbook, `${submissionExportBaseName(fileLabel)}.xlsx`);
    },
    [buildSubmissionsWorkbook, submissionExportBaseName],
  );

  const canExportSubmissions = isAdmin || !!currentProjectAssignment;

  const handleExportSubmissions = () => {
    if (!canExportSubmissions) {
      alert("You don't have permission to export submissions.");
      return;
    }

    if (answers.length === 0) {
      alert('No submissions available to export.');
      return;
    }

    writeSubmissionsWorkbook(buildSubmissionExportRows(answers), 'Submissions');
  };

  const handleExportSubmissionsForSelectedPage = () => {
    if (!canExportSubmissions) {
      alert("You don't have permission to export submissions.");
      return;
    }
    if (!selectedPage) return;

    const pageQuestionIds = new Set(
      (isFormsAllPagesView
        ? questionsForVisiblePages(visiblePages, questions || [])
        : questionsForProjectPage(selectedPage, questions || [])
      ).map((q) => q.id),
    );
    const pageAnswers = (answers || []).filter((a) => pageQuestionIds.has(a.questionId));

    if (pageAnswers.length === 0) {
      alert('No submissions available to export for this section.');
      return;
    }

    const safeTitle = (
      isFormsAllPagesView
        ? t.projectDetail.formsAllPagesTab
        : selectedPage.title || 'Section'
    )
      .replace(/[^\w\-]+/g, '_')
      .slice(0, 40);
    writeSubmissionsWorkbook(
      buildSubmissionExportRows(pageAnswers),
      `Submissions_${safeTitle}`,
    );
  };

  const handleExportSubmissionsWithFilesForSelectedPage = async () => {
    if (!canExportSubmissions) {
      alert("You don't have permission to export submissions.");
      return;
    }
    if (!selectedPage || exportingSubmissionsWithFiles) return;

    const pageQuestionIds = new Set(
      (isFormsAllPagesView
        ? questionsForVisiblePages(visiblePages, questions || [])
        : questionsForProjectPage(selectedPage, questions || [])
      ).map((q) => q.id),
    );
    const pageAnswers = (answers || []).filter((a) => pageQuestionIds.has(a.questionId));

    if (pageAnswers.length === 0) {
      alert('No submissions available to export for this section.');
      return;
    }

    const sectionTitle = isFormsAllPagesView
      ? t.projectDetail.formsAllPagesTab
      : selectedPage.title || 'Section';
    const safeTitle = sanitizeExportToken(sectionTitle, 40);
    const fileLabel = `Submissions_${safeTitle}`;
    const exportRows = buildSubmissionExportRows(pageAnswers);
    const workbook = buildSubmissionsWorkbook(exportRows);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const baseName = submissionExportBaseName(fileLabel);

    const fallbackPageTitle = sectionTitle;
    const attachments = pageAnswers
      .filter((a) => !!a.latestFileUrl?.trim())
      .map((answer) => {
        const question = (questions || []).find((q) => q.id === answer.questionId);
        return {
          answer,
          question,
          pageTitle: resolvePageTitleForQuestion(
            question,
            visiblePages,
            fallbackPageTitle,
          ),
        };
      });

    setExportingSubmissionsWithFiles(true);
    try {
      const { addedFiles, skippedFiles } = await downloadSubmissionsZipArchive({
        excelBuffer,
        excelFileName: `${baseName}.xlsx`,
        zipFileName: `${baseName}.zip`,
        attachments,
      });
      if (attachments.length > 0 && addedFiles === 0 && skippedFiles > 0) {
        alert(
          'Export created, but attached files could not be downloaded. Check file URLs and storage access.',
        );
      }
    } catch (err) {
      console.error('Export submissions with files failed:', err);
      alert('Failed to export submissions with files.');
    } finally {
      setExportingSubmissionsWithFiles(false);
    }
  };

  const handleSaveOverview = async () => {
    if (!projectId || !project) return;
    try {
      await DB.projects.update(projectId, editedProject);
      if (user) {
        await logActivity(user, 'update', 'projects', projectId, `Updated project overview details`, projectId);
      }
      setProject({ ...project, ...editedProject });
      setIsEditingOverview(false);
      loadProjectData();
    } catch (err: any) {
      try {
        const firestoreError = JSON.parse(err.message);
        setError(firestoreError.error || "Failed to update project details.");
      } catch {
        setError(err.message || "Failed to update project details.");
      }
    }
  };

  const handleUpdateStatus = async (newStatus: 'active' | 'closed' | 'archived') => {
    if (!projectId || !project) return;
    try {
      await DB.projects.update(projectId, { status: newStatus });
      if (user) {
        await logActivity(user, 'update', 'projects', projectId, `Updated project status to ${newStatus}`, projectId);
      }
      setProject({ ...project, status: newStatus });
    } catch (err) {
      setError("Failed to update status.");
    }
  };

  const handleAssignUser = async (uId: string) => {
    if (!projectId) return;
    try {
      let targetUserId = uId;
      
      // Check if this is a contact and if they need a platform user record
      const contact = contacts.find(c => c.id === uId);
      if (contact) {
        // Find if a user already exists for this contact email or linked contactId
        const existingUser = platformUsers.find((u) =>
          platformUserLinkedToStakeholderContact(u, contact),
        );
        if (existingUser) {
          targetUserId = existingUser.id;
        } else {
          const byEmail = contact.email
            ? await DB.platformUsers.getByEmail(contact.email)
            : null;
          if (byEmail) {
            targetUserId = byEmail.id;
          } else {
            const newUserId = await DB.platformUsers.createPendingFromContact(contact);
            if (newUserId) {
              targetUserId = newUserId;
            }
          }
        }
      }

      await DB.projects.assignUser(projectId, targetUserId, 'contributor');
      if (user) {
        await logActivity(user, 'create', 'projectUserAssignments', `${projectId}_${targetUserId}`, `Assigned user to project`, projectId);
      }
      loadProjectData();
    } catch (err) {
      setError("Failed to assign user.");
    }
  };

  const handleUpdateUserRole = async (assignmentId: string, role: ProjectUserAssignment['role']) => {
    try {
      await DB.projects.updateUserRole(assignmentId, role);
      if (user) {
        await logActivity(user, 'update', 'projectUserAssignments', assignmentId, `Updated user role to ${role}`, projectId);
      }
      loadProjectData();
    } catch (err) {
      setError("Failed to update role.");
    }
  };

  const handleUnassignUser = async (projectUserAssignmentId: string) => {
    const puAssign = projectUserAssignments.find((a) => a.id === projectUserAssignmentId);
    if (!puAssign) return;
    const hasQuestionAssignments = (assignments || []).some(
      (a) => a.recipientId === puAssign.userId,
    );
    if (hasQuestionAssignments) {
      setError(t.projectDetail.removeUserBlocked);
      return;
    }
    try {
      await DB.projects.unassignUser(projectUserAssignmentId);
      loadProjectData();
    } catch (err) {
      setError("Failed to unassign user.");
    }
  };

  const handleProjectMemberRoleSelectChange = (
    projectUserAssignmentId: string,
    value: string,
  ) => {
    if (value === REMOVE_FROM_PROJECT_SELECT_VALUE) {
      void handleUnassignUser(projectUserAssignmentId);
      return;
    }
    void handleUpdateUserRole(
      projectUserAssignmentId,
      value as ProjectUserAssignment['role'],
    );
  };

  const openQuestionAssignmentFor = useCallback(
    (recipient: { id: string; name: string; email: string; type: 'contact' | 'user' }) => {
      const beginDate = new Date().toISOString().split('T')[0];
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setAssignmentModal({
        isOpen: true,
        recipient,
        selectedQuestions: [],
        beginDate,
        deadline,
        urgency: 'normal',
        approver: null,
        initialBeginDate: beginDate,
        initialDeadline: deadline,
        editingAssignmentId: null,
        message: newAssignmentRef(),
        stage: 'select',
        emailSubject: '',
        emailMainBody: '',
        emailSignoff: '',
        mergeFlow: false,
        openAssignmentsToMerge: [],
        mergeSelectedAssignmentIds: [],
      });
    },
    [newAssignmentRef],
  );

  const openMergeAssignmentsWizard = useCallback(
    (
      recipient: { id: string; name: string; email: string; type: 'contact' | 'user' },
      openAssignments: Assignment[],
      mergeRecipientId?: string,
    ) => {
      const uniqueQuestionIds = [
        ...new Set(openAssignments.flatMap((a) => a.questionIds || [])),
      ];
      const beginDate = new Date().toISOString().split('T')[0];
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      setAssignmentModal({
        isOpen: true,
        recipient,
        selectedQuestions: uniqueQuestionIds,
        beginDate,
        deadline,
        urgency: 'normal',
        approver: null,
        initialBeginDate: beginDate,
        initialDeadline: deadline,
        editingAssignmentId: null,
        message: newAssignmentRef(),
        stage: 'merge',
        emailSubject: '',
        emailMainBody: '',
        emailSignoff: '',
        mergeFlow: true,
        openAssignmentsToMerge: openAssignments,
        mergeSelectedAssignmentIds: openAssignments.map((a) => a.id),
        mergeRecipientId,
      });
    },
    [newAssignmentRef],
  );

  const handleSaveAssignmentDates = async () => {
    const { editingAssignmentId, beginDate, deadline, urgency } = assignmentModal;
    if (!editingAssignmentId || !projectId) return;
    if (beginDate && deadline && beginDate > deadline) {
      showAlert(t.common.error, t.projectDetail.beginDateBeforeDeadline, 'warning');
      return;
    }

    setSavingAssignmentDates(true);
    try {
      const beginMs = new Date(beginDate).getTime();
      const deadlineMs = new Date(deadline).getTime();
      const existing = (assignments || []).find((a) => a.id === editingAssignmentId);
      const nextUrgency = normalizeAssignmentUrgency(urgency);
      const nextStatus: Assignment['status'] =
        existing?.status === 'completed'
          ? 'completed'
          : deadlineMs < Date.now()
            ? 'overdue'
            : 'pending';

      const result = await updateProjectAssignment(projectId, editingAssignmentId, {
        beginDate,
        deadline,
        urgency: nextUrgency,
      });
      if (!result.success) {
        throw new Error(result.error || t.common.errorOccurred);
      }

      if (user) {
        await logActivity(
          user,
          'update',
          'assignments',
          editingAssignmentId,
          `Updated assignment dates (${beginDate} → ${deadline})`,
          projectId,
        );
      }

      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingAssignmentId
            ? {
                ...a,
                beginDate: beginMs,
                deadline: deadlineMs,
                urgency: nextUrgency,
                status: nextStatus,
                remindersSent: [],
                reminderCount: 0,
                lastReminderAt: undefined,
              }
            : a,
        ),
      );
      setAssignmentModal((prev) => ({
        ...prev,
        initialBeginDate: prev.beginDate,
        initialDeadline: prev.deadline,
      }));
      showAlert(t.common.saved, t.projectDetail.saveAssignmentDatesSuccess);
    } catch (err) {
      console.error('Save assignment dates error:', err);
      showAlert(t.common.error, t.common.errorOccurred, 'danger');
    } finally {
      setSavingAssignmentDates(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedPage || !project) return;
    setIsDrafting(true);
    try {
      // Find questions relevant to this page
      const pageQuestions = (questions || []).filter(q => q && q.pageId === selectedPage.sourceTemplatePageId);
      const pageAnswers = (answers || []).filter(a => a && pageQuestions.some(pq => pq.id === a.questionId));

      const draft = await Gemini.generatePageDraft(
        selectedPage.title,
        selectedPage.briefText,
        pageQuestions,
        pageAnswers,
        lang,
      );

      if (draft) {
        await DB.updateDoc(DB.doc(DB.db, `projects/${projectId}/pages`, selectedPage.id), {
          draftContent: draft,
          draftLanguage: lang,
          draftStatus: 'drafted',
        });
        if (user) {
          await logActivity(user, 'update', 'projectPages', selectedPage.id, `Generated AI draft for questionnaire "${selectedPage.title}"`, projectId);
        }
        setSelectedPage(prev =>
          prev ? ({ ...prev, draftContent: draft, draftLanguage: lang, draftStatus: 'drafted' }) : null,
        );
        loadProjectData();
      }
    } catch (err) {
      alert("Failed to generate draft. Please check your data and API key.");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleQuestionWorkflowChange = async (
    questionId: string,
    next: QuestionWorkflowStatus,
  ) => {
    if (!projectId || !canUpdateQuestionWorkflow) return;

    const q = (questions || []).find((x) => x.id === questionId);
    if (!q) return;

    const currentState = getQuestionWorkflowState(
      q,
      answers || [],
      assignments || [],
    );
    if (currentState === next) return;
    if (currentState === 'not_sent' || currentState === 'sent_pending') {
      return;
    }
    if (currentState === 'sent_back') {
      return;
    }
    if (
      currentState === 'customer_responded' &&
      next !== 'customer_responded' &&
      next !== 'sent_back' &&
      !(canPmReviewWorkflow && next === 'approved')
    ) {
      return;
    }

    const authorName = currentUser?.name || user?.email || 'Admin';
    const logEntry = buildWorkflowStatusLogEntry(
      currentState,
      next,
      user?.uid || '',
      authorName,
      t.projectDetail,
    );

    const covering = assignmentsCoveringQuestion(q, assignments || []);
    const primary =
      covering.find(isAssignmentLinkSent) || covering[0];

    const ans = (answers || []).find((a) => a.questionId === questionId);

    if (!ans) {
      if (!primary) {
        showAlert(
          t.common.error,
          t.projectDetail.workflowNeedAssignment,
          'warning',
        );
        return;
      }
      const ansId = `${primary.recipientId}_${questionId}`;
      const now = Date.now();
      const payload = {
        assignmentId: primary.id,
        questionId,
        projectId,
        contactId: primary.recipientId,
        latestAnswer: '',
        submittedAt: now,
        updatedAt: now,
        workflowStatus: next,
        workflowStatusLog: [logEntry],
      };
      try {
        await DB.setDoc(
          DB.doc(DB.db, `projects/${projectId}/answers`, ansId),
          payload,
          { merge: true },
        );
        setAnswers((prev) => [
          ...prev.filter((a) => a.questionId !== questionId),
          { id: ansId, ...payload } as Answer,
        ]);
      } catch (err) {
        console.error(err);
        showAlert(t.common.error, t.common.errorOccurred, 'danger');
      }
      return;
    }

    const nextLog = [...(ans.workflowStatusLog || []), logEntry];

    try {
      await DB.updateDoc(
        DB.doc(DB.db, `projects/${projectId}/answers`, ans.id),
        {
          workflowStatus: next,
          workflowStatusLog: nextLog,
          updatedAt: Date.now(),
        },
      );
      setAnswers((prev) =>
        prev.map((a) =>
          a.id === ans.id
            ? {
                ...a,
                workflowStatus: next,
                workflowStatusLog: nextLog,
                updatedAt: Date.now(),
              }
            : a,
        ),
      );
    } catch (err) {
      console.error(err);
      showAlert(t.common.error, t.common.errorOccurred, 'danger');
    }
  };

  const questionAuditFields = useCallback(() => {
    const now = Date.now();
    const label =
      currentUser?.name?.trim() ||
      user?.displayName?.trim() ||
      user?.email?.trim() ||
      '';
    return {
      updatedAt: now,
      ...(user?.uid ? { updatedBy: user.uid } : {}),
      ...(label ? { updatedByName: label } : {}),
    };
  }, [currentUser?.name, user?.displayName, user?.email, user?.uid]);

  const buildQuestionGuidanceDraft = useCallback(
    (q: Question): QuestionGuidanceDraft => ({
      kod: q.kod,
      baslik: q.baslik,
      pageId: q.pageId ?? '',
      domainIds: q.domainIds ?? [],
      ilgiliBirim: q.ilgiliBirim,
      soru: q.soru ?? '',
      aciklama: q.aciklama ?? '',
      ornekYanit: q.ornekYanit ?? '',
      aciklamaVideoUrl: q.aciklamaVideoUrl ?? '',
      answerFormat: q.answerFormat ?? 'textarea',
      soruCogaltma: normalizeQuestionSoruCogaltma(q.soruCogaltma),
    }),
    [],
  );

  const emptyQuestionGuidanceDraft: QuestionGuidanceDraft = {
    kod: '',
    baslik: '',
    pageId: '',
    domainIds: [],
    ilgiliBirim: '',
    soru: '',
    aciklama: '',
    ornekYanit: '',
    aciklamaVideoUrl: '',
    answerFormat: 'textarea',
    soruCogaltma: DEFAULT_SORU_COGALTMA,
  };

  const questionGuidanceReferenceContext =
    useMemo((): QuestionGuidanceReferenceContext | null => {
      if (!questionGuidanceEditModal || !template) return null;
      const q = (questions || []).find(
        (item) => item.id === questionGuidanceEditModal.questionId,
      );
      if (!q) return null;

      const templateId = project?.templateId || template.id;
      const sectorId = template.sectorId?.trim();
      if (!templateId || !sectorId) return null;

      const isProjectCopy = Boolean(q.projectId);
      const sourceQuestionId =
        q.sourceQuestionId?.trim() || (isProjectCopy ? '' : q.id);

      return {
        templateName: template.name,
        sourceQuestionId: sourceQuestionId || q.id,
        recordQuestionId: q.id,
        templateSectorId: sectorId,
        templateId,
      };
    }, [
      questionGuidanceEditModal,
      questions,
      template,
      project?.templateId,
    ]);

  const guidanceEditQuestion = useMemo(() => {
    if (!questionGuidanceEditModal) return null;
    return (
      (questions || []).find(
        (item) => item.id === questionGuidanceEditModal.questionId,
      ) ?? null
    );
  }, [questionGuidanceEditModal, questions]);

  const canCopyGuidanceQuestion =
    isPlatformAdmin && Boolean(guidanceEditQuestion?.projectId);

  const saveFormsQuestionSoru = async () => {
    if (!formsQuestionEditModal || !projectId) return;
    const { questionId, draft } = formsQuestionEditModal;
    const q = (questions || []).find((x) => x.id === questionId);
    if (!q) return;
    if (draft === (q.soru || '')) {
      setFormsQuestionEditModal(null);
      return;
    }
    setIsSavingFormsQuestion(true);
    const audit = questionAuditFields();
    try {
      await DB.updateDoc(DB.doc(DB.db, 'questions', questionId), {
        soru: draft,
        ...audit,
      });
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId ? { ...item, soru: draft, ...audit } : item,
        ),
      );
      if (user) {
        await logActivity(
          user,
          'update',
          'questions',
          questionId,
          `Updated question text (${q.kod || questionId}) on project form`,
          projectId,
        );
      }
      setFormsQuestionEditModal(null);
    } catch (err) {
      console.error('Failed to update question:', err);
      showAlert(t.common.error, t.common.errorOccurred, 'danger');
    } finally {
      setIsSavingFormsQuestion(false);
    }
  };

  const saveFormsQuestionGuidance = async () => {
    if (!questionGuidanceEditModal || !projectId) return;
    const { questionId, draft } = questionGuidanceEditModal;

    const q = (questions || []).find((x) => x.id === questionId);
    if (!q) return;

    const payload = {
      kod: draft.kod,
      baslik: draft.baslik,
      pageId: draft.pageId,
      domainIds: draft.domainIds,
      ilgiliBirim: draft.ilgiliBirim,
      soru: draft.soru,
      aciklama: draft.aciklama,
      aciklamaVideoUrl: draft.aciklamaVideoUrl,
      ornekYanit: draft.ornekYanit,
      answerFormat: draft.answerFormat,
      soruCogaltma: draft.soruCogaltma,
      ...questionAuditFields(),
    };

    setIsSavingQuestionGuidance(true);
    try {
      if (q.projectId) {
        await DB.projectQuestions.update(questionId, payload);
      } else {
        await DB.updateDoc(DB.doc(DB.db, 'questions', questionId), payload);
      }
      if (q.projectId) {
        await loadProjectData();
      } else {
        setQuestions((prev) =>
          prev.map((item) => (item.id === questionId ? { ...item, ...payload } : item)),
        );
      }
      if (user) {
        await logActivity(
          user,
          'update',
          q.projectId ? 'projectQuestions' : 'questions',
          questionId,
          `Updated question guidance (${q.kod || questionId}) on project form`,
          projectId,
        );
      }
      setQuestionGuidanceEditModal(null);
    } catch (err) {
      console.error('Failed to update question guidance:', err);
      showAlert(t.common.error, t.common.errorOccurred, 'danger');
    } finally {
      setIsSavingQuestionGuidance(false);
    }
  };

  const copyFormsQuestionGuidance = () => {
    if (!questionGuidanceEditModal || !projectId) return;
    const q = guidanceEditQuestion;
    if (!q?.projectId) {
      showAlert(
        t.common.error,
        t.templates.copyProjectQuestionUnavailable,
        'warning',
      );
      return;
    }

    const { draft } = questionGuidanceEditModal;
    const kodCopy = buildProjectQuestionCopyKod(draft.kod || q.kod);
    showConfirm(
      t.templates.copyProjectQuestionConfirmTitle,
      t.templates.copyProjectQuestionConfirmDescription.replace(
        '{kodCopy}',
        kodCopy,
      ),
      () => void performCopyFormsQuestionGuidance(q, draft, kodCopy),
    );
  };

  const performCopyFormsQuestionGuidance = async (
    source: Question,
    draft: QuestionGuidanceDraft,
    kodCopy: string,
  ) => {
    if (!projectId) return;

    setIsCopyingQuestionGuidance(true);
    try {
      const enrichedSource: Question = {
        ...source,
        templateId:
          source.templateId || project?.templateId || template?.id || '',
        sectorId: source.sectorId || template?.sectorId || '',
      };
      const payload = buildProjectQuestionCopyPayload(
        enrichedSource,
        draft,
        projectId,
      );
      const audit = questionAuditFields();
      const toBump = questionsToBumpForProjectCopy(
        questions,
        enrichedSource,
        payload.order,
      );

      const created = await DB.projectQuestions.create({
        ...payload,
        ...audit,
      });
      if (!created?.id) {
        throw new Error('Failed to create project question copy');
      }

      await Promise.all(
        toBump.map((item) =>
          DB.projectQuestions.update(item.id, {
            order: (typeof item.order === 'number' ? item.order : 0) + 1,
          }),
        ),
      );

      const newQuestion: Question = {
        ...created,
        templateId: created.sourceTemplateId,
        sourceQuestionId: created.sourceQuestionId,
        projectId: created.projectId,
      };

      setQuestions((prev) => {
        const bumped = prev.map((item) => {
          if (!toBump.some((candidate) => candidate.id === item.id)) return item;
          return { ...item, order: (item.order || 0) + 1 };
        });
        return [...bumped, newQuestion].sort(
          (a, b) => (a.order || 0) - (b.order || 0),
        );
      });

      if (user) {
        await logActivity(
          user,
          'create',
          'projectQuestions',
          created.id,
          `Copied project question (${source.kod || source.id}) as ${kodCopy}`,
          projectId,
        );
      }

      setQuestionGuidanceEditModal(null);
      showAlert(
        t.common.saved,
        t.templates.copyProjectQuestionSuccess.replace('{kod}', kodCopy),
      );
    } catch (err) {
      console.error('Failed to copy project question:', err);
      showAlert(t.common.error, t.common.errorOccurred, 'danger');
    } finally {
      setIsCopyingQuestionGuidance(false);
    }
  };

  const handleRebuildQuestionnaire = async () => {
    if (!projectId || !selectedRebuildTemplateId) return;
    setIsRebuilding(true);
    try {
      const ok = await DB.projects.rebuildFromTemplate(
        projectId,
        selectedRebuildTemplateId,
      );
      if (!ok) {
        showAlert(
          t.projectDetail.rebuildQuestionnaireAlertFailedTitle,
          t.projectDetail.rebuildQuestionnaireAlertFailedDescription,
          'danger',
        );
        return;
      }

      if (user) {
        const selectedTemplateName =
          allTemplates.find((tmpl) => tmpl.id === selectedRebuildTemplateId)?.name ||
          'Unknown';
        await logActivity(
          user,
          'update',
          'projects',
          projectId,
          `Rebuilt questionnaire data using template: ${selectedTemplateName}`,
          projectId,
        );
      }

      setShowRebuildModal(false);
      await loadProjectData();
      showAlert(
        t.projectDetail.rebuildQuestionnaireAlertSuccessTitle,
        t.projectDetail.rebuildQuestionnaireAlertSuccessDescription,
      );
    } catch (err) {
      console.error("Rebuild error:", err);
      showAlert(
        t.projectDetail.rebuildQuestionnaireAlertFailedTitle,
        t.projectDetail.rebuildQuestionnaireAlertFailedDescription,
        'danger',
      );
    } finally {
      setIsRebuilding(false);
    }
  };

  const [isCleaningAssignments, setIsCleaningAssignments] = useState(false);

  const handleCleanupContactAssignments = async () => {
    if (!projectId) return;

    // Find assignments that are either explicitly 'contact' or missing the type field (legacy)
    // For missing type, we verify the recipient is NOT a platform user to avoid collateral damage
    // ONLY consider completed assignments for cleanup to prevent deleting active tasks
    const contactAssignments = assignments.filter(a => {
      if (a.status !== 'completed') return false;
      if (a.recipientType === 'contact') return true;
      if (!a.recipientType) {
        const isPlatformUser = platformUsers.some(pu => pu.id === a.recipientId);
        return !isPlatformUser;
      }
      return false;
    });

    if (contactAssignments.length === 0) {
      showAlert("Cleanup Info", "No completed legacy contact assignments found to clean up.");
      return;
    }

    showConfirm(
      "Confirm Cleanup",
      `This will permanently remove ${contactAssignments.length} COMPLETED legacy contact assignments and any data submitted by these contacts. Registered project users and active assignments are not affected. Continue?`,
      async () => {
        setIsCleaningAssignments(true);
        try {
          // Process in small batches or individually to avoid Firestore limits
          for (const assignment of contactAssignments) {
            // 1. Delete the assignment
            await DB.deleteDoc(DB.doc(DB.db, `projects/${projectId}/assignments`, assignment.id));
            
            // 2. Delete related answers - handle both assignmentId and contactId joins
            const answersToDelete = answers.filter(ans => 
              ans.assignmentId === assignment.id || 
              (ans.contactId === assignment.recipientId && assignment.recipientType !== 'user')
            );

            for (const answer of answersToDelete) {
              await DB.deleteDoc(DB.doc(DB.db, `projects/${projectId}/answers`, answer.id));
            }
          }
          
          if (user) {
            await logActivity(user, 'delete', 'assignments', projectId, `Cleaned up ${contactAssignments.length} legacy contact assignments and related data`, projectId);
          }
          
          showAlert("Cleanup Successful", `Successfully cleaned up ${contactAssignments.length} legacy assignments.`);
          loadProjectData();
        } catch (err: any) {
          console.error("Cleanup error:", err);
          showAlert("Cleanup Failed", "Failed to complete cleanup. Error: " + (err.message || "Unknown error"), "danger");
        } finally {
          setIsCleaningAssignments(false);
        }
      },
      "danger"
    );
  };

  const resolveRecipientAssignmentAccess = useCallback(
    (
      recipient: { id: string; email: string; type: 'contact' | 'user' },
      respondMagicLink: string,
    ) => {
      const platformUser =
        recipient.type === 'user'
          ? platformUsers.find((u) => u.id === recipient.id)
          : undefined;
      const projectMemberRole = projectUserAssignments.find(
        (pua) => pua.userId === recipient.id && pua.projectId === projectId,
      )?.role;
      return resolveAssignmentAccessLink({
        origin: window.location.origin,
        projectId: projectId || '',
        recipientEmail: recipient.email,
        recipientType: recipient.type,
        respondMagicLink,
        platformRole: platformUser?.role,
        projectMemberRole,
      });
    },
    [platformUsers, projectUserAssignments, projectId],
  );

  const assignmentEmailPreviewLink = useMemo(() => {
    if (!assignmentModal.recipient || !projectId) return '';
    return resolveRecipientAssignmentAccess(assignmentModal.recipient, '').linkForEmail;
  }, [assignmentModal.recipient, projectId, resolveRecipientAssignmentAccess]);

  const handleProcessAssignment = async () => {
    if (processingAssignmentRef.current) return;
    if (!assignmentModal.recipient || (assignmentModal.selectedQuestions?.length || 0) === 0 || !projectId || !project) {
      showAlert("Selection Required", "You must select a recipient and at least one question.", "warning");
      return;
    }

    processingAssignmentRef.current = true;
    setProcessingAssignment(true);
    try {
      let magicLink = '';
      let token = '';

      // Only generate magic link for contacts
      if (assignmentModal.recipient.type === 'contact') {
        const res = await fetch('/api/auth/generate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: assignmentModal.recipient.id, projectId })
        });
        
        if (!res.ok) throw new Error('Failed to generate access token');
        const data = await res.json();
        token = data.token;
        magicLink = `${window.location.origin}/#/respond/${token}`;
      }
      
      const getExpiry = (t: string) => {
        try {
          const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          return p.exp * 1000;
        } catch { return Date.now() + 30 * 24 * 60 * 60 * 1000; }
      };

      const assignmentObj: any = {
        projectId,
        recipientId: assignmentModal.recipient.id,
        recipientType: assignmentModal.recipient.type,
        beginDate: new Date(assignmentModal.beginDate).getTime(),
        deadline: new Date(assignmentModal.deadline).getTime(),
        urgency: normalizeAssignmentUrgency(assignmentModal.urgency),
        ...(assignmentModal.approver
          ? {
              approverId: assignmentModal.approver.id,
              approverType: assignmentModal.approver.type,
            }
          : {}),
        message: assignmentModal.message,
        questionIds: assignmentModal.selectedQuestions,
        sentAt: Date.now(),
        assignedBy: user?.uid,
        assignedByName: currentUser?.name || 'Admin',
        status: 'pending'
      };

      if (token) {
        assignmentObj.token = token;
        assignmentObj.tokenExpiry = getExpiry(token);
      }

      // Use a unique ID for each assignment
      const assignmentId = DB.generateId();
      await DB.setDoc(DB.doc(DB.db, `projects/${projectId}/assignments`, assignmentId), assignmentObj);

      if (user) {
        await logActivity(user, 'update', 'assignments', assignmentId, `Assigned ${assignmentModal.selectedQuestions?.length || 0} questions to ${assignmentModal.recipient.name} (${assignmentModal.recipient.type}) with deadline ${assignmentModal.deadline}`, projectId);
      }

      const access = resolveRecipientAssignmentAccess(
        assignmentModal.recipient,
        magicLink,
      );
      const linkForEmail = access.linkForEmail;
      const localizedEmail = buildAssignmentEmailFromComposed(t.projectDetail, {
        subject: assignmentModal.emailSubject,
        mainBody: assignmentModal.emailMainBody,
        signoff: assignmentModal.emailSignoff,
        magicLink: linkForEmail,
      });

      const ccRecipients = assignmentAssignerCcRecipients(
        currentUser?.email || user?.email,
        currentUser?.name,
        assignmentModal.recipient.email,
      );

      // Email notification logic
      const emailPayload = {
        email: assignmentModal.recipient.email,
        name: assignmentModal.recipient.name,
        magicLink: linkForEmail,
        projectId,
        assignmentId,
        projectName: project?.name,
        message: assignmentModal.message,
        deadline: new Date(assignmentModal.deadline).toLocaleDateString(assignmentEmailDateLocale),
        questionCount: assignmentModal.selectedQuestions?.length || 0,
        isExternal: assignmentModal.recipient.type === 'contact',
        subject: localizedEmail.subject,
        text: localizedEmail.text,
        html: localizedEmail.html,
        cc: ccRecipients,
      };

      let emailStatus = 'Email queued...';
      try {
        const emailRes = await fetch('/api/email/send-assignment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
          },
          body: JSON.stringify(emailPayload)
        });
        const emailData = await emailRes.json();
        emailStatus = formatAssignmentEmailStatusMessage(emailData, {
          sentSuccess: t.projectDetail.emailSentSuccess,
        });
      } catch (err: any) {
        emailStatus = `Email Notification Error: ${err.message}`;
      }

      setAssignmentModal(prev => ({
        ...prev,
        stage: 'link',
        generatedLink: access.generatedLinkForModal,
        emailStatus,
      }));
      loadProjectData();

    } catch (err) {
      console.error("Assignment error:", err);
      alert("Failed to process assignment.");
    } finally {
      processingAssignmentRef.current = false;
      setProcessingAssignment(false);
    }
  };

  const handleProcessMergeAssignment = async () => {
    if (processingMergeAssignmentRef.current) return;
    const {
      recipient,
      mergeSelectedAssignmentIds,
      beginDate,
      deadline,
      urgency,
      message,
      selectedQuestions,
      emailSubject,
      emailMainBody,
      emailSignoff,
    } = assignmentModal;

    if (!recipient || !projectId || !project) {
      showAlert(
        t.common.error,
        'You must select a recipient and at least one assignment.',
        'warning',
      );
      return;
    }
    if (mergeSelectedAssignmentIds.length === 0) {
      showAlert(t.common.error, 'Select at least one assignment.', 'warning');
      return;
    }
    if (beginDate && deadline && beginDate > deadline) {
      showAlert(t.common.error, t.projectDetail.beginDateBeforeDeadline, 'warning');
      return;
    }

    processingMergeAssignmentRef.current = true;
    setProcessingMergeAssignment(true);
    try {
      const token = getAuthToken();
      const emailBodyMessage = message;
      const deadlineLabel = new Date(deadline).toLocaleDateString(
        assignmentEmailDateLocale,
      );
      const generateContactMagicLink = async () => {
        const res = await fetch('/api/auth/generate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: recipient.id, projectId }),
        });
        if (!res.ok) throw new Error('Failed to generate access token');
        const data = await res.json();
        return `${window.location.origin}/#/respond/${data.token}`;
      };
      const magicLink =
        recipient.type === 'contact' ? await generateContactMagicLink() : '';
      const questionCount = selectedQuestions?.length || 0;
      const access = resolveRecipientAssignmentAccess(recipient, magicLink);
      const localizedEmail = buildAssignmentEmailFromComposed(t.projectDetail, {
        subject: emailSubject,
        mainBody: emailMainBody,
        signoff: emailSignoff,
        magicLink: access.linkForEmail,
      });
      const ccRecipients = assignmentAssignerCcRecipients(
        currentUser?.email || user?.email,
        currentUser?.name,
        recipient.email,
      );

      const mergeRes = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/merge-assignments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            assignmentIds: mergeSelectedAssignmentIds,
            beginDate,
            deadline,
            urgency: normalizeAssignmentUrgency(urgency),
            ...(assignmentModal.approver
              ? {
                  approverId: assignmentModal.approver.id,
                  approverType: assignmentModal.approver.type,
                }
              : {}),
            message: message.trim() || undefined,
            email: {
              email: recipient.email,
              name: recipient.name,
              subject: localizedEmail.subject,
              text: localizedEmail.text,
              html: localizedEmail.html,
              cc: ccRecipients,
            },
          }),
        },
      );
      const mergePayload = await mergeRes.json().catch(() => ({}));
      if (!mergeRes.ok || !mergePayload?.success) {
        throw new Error(mergePayload?.error || 'Failed to merge assignments');
      }

      let emailStatus = mergePayload.emailSent
        ? t.projectDetail.emailSentSuccess
        : mergePayload.emailError
          ? `Email Notification Error: ${mergePayload.emailError}`
          : t.projectDetail.emailSentSuccess;

      if (!mergePayload.emailSent) {
        try {
          const emailRes = await fetch('/api/email/send-assignment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: recipient.email,
              name: recipient.name,
              magicLink: access.linkForEmail,
              projectName: project?.name,
              message: emailBodyMessage,
              deadline: deadlineLabel,
              questionCount,
              isExternal: recipient.type === 'contact',
              subject: localizedEmail.subject,
              text: localizedEmail.text,
              html: localizedEmail.html,
              cc: ccRecipients,
            }),
          });
          const emailData = await emailRes.json();
          emailStatus = formatAssignmentEmailStatusMessage(emailData, {
            sentSuccess: t.projectDetail.emailSentSuccess,
          });
        } catch (err: unknown) {
          emailStatus = `Email Notification Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
      }

      setAssignmentModal((prev) => ({
        ...prev,
        stage: 'link',
        generatedLink: access.generatedLinkForModal,
        emailStatus,
      }));

      loadProjectData();
    } catch (err) {
      console.error('Merge assignment error:', err);
      showAlert(
        t.common.error,
        err instanceof Error ? err.message : 'Failed to merge assignments.',
        'danger',
      );
    } finally {
      processingMergeAssignmentRef.current = false;
      setProcessingMergeAssignment(false);
    }
  };

  const handleResendAssignmentEmail = useCallback(
    (assignment: Assignment) => {
      if (!projectId) return;
      showConfirm(
        t.tasks.resendAssignmentEmail,
        t.tasks.resendAssignmentEmailConfirm,
        async () => {
          try {
            const result = await resendAssignmentEmail(projectId, assignment.id);
            if (!result.success) {
              showAlert(
                t.tasks.resendEmailFailed,
                result.error || t.tasks.resendEmailFailed,
                'danger',
              );
              return;
            }
            showAlert(
              t.tasks.resendAssignmentEmail,
              t.tasks.resendEmailSuccess.replace(
                '{email}',
                result.recipientEmail || '',
              ),
              'info',
            );
          } catch (err) {
            console.error('Resend assignment email failed:', err);
            showAlert(t.common.error, t.tasks.resendEmailFailed, 'danger');
          }
        },
      );
    },
    [projectId, showConfirm, showAlert, t],
  );

  const handleDeleteAssignment = async () => {
    const assignment = deleteAssignmentConfirm.assignment;
    if (!assignment || !projectId) return;
    if (
      assignmentHasSubstantiveAnswers(assignment, answers || [], assignment.recipientId)
    ) {
      alert(t.projectDetail.deleteAssignmentBlocked);
      setDeleteAssignmentConfirm({ isOpen: false, assignment: null, recipientName: '' });
      return;
    }

    setLoading(true);
    try {
      await DB.deleteDoc(DB.doc(DB.db, `projects/${projectId}/assignments`, deleteAssignmentConfirm.assignment.id));
      
      if (user) {
        await logActivity(user, 'delete', 'assignments', deleteAssignmentConfirm.assignment.id, `Deleted assignment for ${deleteAssignmentConfirm.recipientName}`, projectId);
      }
      
      setAssignments(prev => prev.filter(a => a.id !== deleteAssignmentConfirm.assignment?.id));
      setDeleteAssignmentConfirm({ isOpen: false, assignment: null, recipientName: '' });
    } catch (err: any) {
      console.error("Delete assignment error:", err);
      alert("Failed to delete assignment.");
    } finally {
      setLoading(false);
    }
  };


  const consultantNotOnProject =
    !loading &&
    !!project &&
    currentUser?.role === 'consultant' &&
    !canListAllProjects &&
    !(projectUserAssignments || []).some((a) => a.userId === user?.uid);

  if (consultantNotOnProject) {
    return (
      <div className="flex min-h-screen w-full max-w-none flex-col items-center justify-center space-y-6 px-4 py-12 text-center">
        <div className="rounded-full bg-amber-50 p-4 text-amber-600">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          {t.projectDetail.consultantNoProjectAccess}
        </h2>
        <p className="max-w-md text-slate-500">{t.projectDetail.consultantNoProjectAccessHint}</p>
        <Link
          to="/projects"
          className="minimal-button-primary flex items-center gap-2 bg-slate-900 px-8 py-3 text-white"
        >
          <ChevronLeft size={16} /> {t.projectDetail.backToProjectsList}
        </Link>
      </div>
    );
  }

  if (error && !project) {
    const isQuotaError = error.includes('Quota Exceeded') || error.includes('quota');
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-screen text-center w-full max-w-none space-y-6 px-4">
        <div className={cn("p-4 rounded-full", isQuotaError ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600")}>
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          {isQuotaError ? "Firebase Daily Limit Reached" : "Project Load Error"}
        </h2>
        <p className="text-slate-500">
          {isQuotaError 
            ? "Your Firebase project has reached the free daily read quota (50,000 reads). Even after upgrading, Firestore sometimes enforces a safety cap or the billing transition is still in progress."
            : "There was a problem loading this project's data. Please check your connection or try again later."
          }
        </p>
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left space-y-3 w-full">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommended Actions</h4>
          <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
            <li>Check your **Google Cloud Console** under "Quotas & System Limits" for `firestore.googleapis.com`.</li>
            <li>Wait for the quota to reset (Midnight Pacific Time).</li>
            <li>I have optimized the application code to use significantly fewer reads, following this fix.</li>
          </ul>
        </div>

        <Link to={projectHeaderBackTo} className="minimal-button-primary px-8 py-3 bg-slate-900 text-white flex items-center gap-2">
          <ChevronLeft size={16} /> {projectHeaderBackLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 flex-col relative">
      <AnimatePresence>
        {clearModal.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setClearModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6">
                  <AlertTriangle size={32} />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{t.projectDetail.clearProjectTitle}</h3>
                <p className="text-slate-500 mb-6 leading-relaxed text-left">
                  {t.projectDetail.clearProjectDescription.replace('{name}', project?.name || '')}
                </p>

                <div className="space-y-4 mb-8 text-left">
                  <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all select-none">
                    <input 
                      type="checkbox"
                      checked={clearModal.includeUsers}
                      onChange={(e) => setClearModal(prev => ({ ...prev, includeUsers: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-900">{t.projectDetail.includeProjectUsers}</span>
                      <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {t.projectDetail.includeProjectUsersHelp}
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleClearProject}
                    disabled={clearModal.loading}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {clearModal.loading ? <Loader2 size={18} className="animate-spin" /> : t.projectDetail.confirmClearData}
                  </button>
                  <button
                    onClick={() => setClearModal(prev => ({ ...prev, isOpen: false }))}
                    disabled={clearModal.loading}
                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHelpModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpModalOpen(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full h-full max-w-none flex flex-col p-4 sm:p-12 relative z-10"
            >
              <div className="flex items-center justify-between mb-8 text-white">
                <div>
                  <h3 className="text-3xl font-bold font-display tracking-tight">
                    {(activeTab === 'users' ? t.projectDetail.usersAndAssignments : 
                      activeTab === 'activity' ? t.projectDetail.activity : t.nav.projects) + ' ' + t.projectDetail.guidance}
                  </h3>
                  <div className="text-white/40 text-xs font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {t.projectDetail.interactiveTutorial}
                  </div>
                </div>
                <button 
                  onClick={() => setIsHelpModalOpen(false)}
                  className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95 group"
                >
                  <Plus size={24} className="rotate-45 group-hover:rotate-[135deg] transition-transform duration-500" />
                </button>
              </div>

              <div className={cn(
                "flex-1 min-h-0 grid gap-8",
                ((activeTab === 'users' && (settings.helpUsersMd || settings.helpAssignmentsMd)) || 
                 (activeTab === 'activity' && settings.helpActivitiesMd)) ? "lg:grid-cols-2" : "grid-cols-1"
              )}>
                {/* Video Column */}
                <div className="bg-black rounded-[32px] overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                  <div className="flex-1 relative">
                    <iframe 
                      src={(activeTab === 'users' ? (settings.helpUsersUrl || settings.helpAssignmentsUrl) : 
                            activeTab === 'activity' ? settings.helpActivitiesUrl : settings.helpUsersUrl) || settings.helpUsersUrl || settings.helpAssignmentsUrl} 
                      loading="lazy" 
                      title="Tutorial Video" 
                      allowFullScreen 
                      className="absolute inset-0 w-full h-full border-none"
                      allow="autoplay; encrypted-media; fullscreen; microphone; screen-wake-lock;" 
                    />
                  </div>
                </div>

                {/* Markdown Column (Conditional) */}
                {((activeTab === 'users' && (settings.helpUsersMd || settings.helpAssignmentsMd)) || 
                  (activeTab === 'activity' && settings.helpActivitiesMd)) && (
                  <div className="bg-white rounded-[32px] shadow-2xl border border-white/10 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      <HelpMarkdown>
                        {activeTab === 'users'
                          ? settings.helpUsersMd || settings.helpAssignmentsMd || ''
                          : activeTab === 'activity'
                            ? settings.helpActivitiesMd || ''
                            : ''}
                      </HelpMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
      <div className="flex flex-col bg-white border-b border-slate-200 z-20">
        {/* Row 1: Aligned Main Header */}
        <header className="px-6 h-[81px] flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Link
              to={projectHeaderBackTo}
              title={projectHeaderBackLabel}
              aria-label={projectHeaderBackLabel}
              className="text-gray-400 p-2 -ml-2 rounded-xl transition-colors shrink-0"
            >
              <ChevronLeft size={20} />
            </Link>
            
            <div className="flex min-w-0 flex-1 items-center gap-2.5 ml-0">
              <div className="hidden sm:flex w-9 h-9 bg-slate-900 text-white rounded-xl items-center justify-center font-bold text-sm shadow-md overflow-hidden border border-slate-50 shrink-0">
                {customer?.logoUrl ? (
                   <img 
                     src={customer.logoUrl} 
                     alt={customer.name} 
                     className="w-full h-full object-cover"
                     referrerPolicy="no-referrer"
                   />
                ) : (
                  <span>{customer?.name?.[0] || project?.name?.[0]}</span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-3">
                {customer?.name ? (
                  <>
                    {showCustomerAsIcon ? (
                      customer.id ? (
                        <Link
                          to={`/customers/${customer.id}`}
                          title={customer.name}
                          aria-label={customer.name}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-blue-700"
                        >
                          <Building2 size={18} strokeWidth={2} />
                        </Link>
                      ) : (
                        <span
                          title={customer.name}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                        >
                          <Building2 size={18} strokeWidth={2} />
                        </span>
                      )
                    ) : customer.id ? (
                      <Link
                        to={`/customers/${customer.id}`}
                        className="max-w-[min(12rem,40vw)] truncate text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700 hover:underline sm:max-w-[14rem]"
                        title={customer.name}
                      >
                        {customer.name}
                      </Link>
                    ) : (
                      <span
                        className="max-w-[min(12rem,40vw)] truncate text-sm font-semibold text-slate-500 sm:max-w-[14rem]"
                        title={customer.name}
                      >
                        {customer.name}
                      </span>
                    )}
                    <span className="shrink-0 text-slate-300" aria-hidden>
                      /
                    </span>
                  </>
                ) : null}
                <h1 className="min-w-0 max-w-full flex-1 basis-[12rem] truncate text-xl font-bold font-display tracking-tight text-slate-900 sm:basis-auto sm:flex-initial">
                  {project?.name}
                </h1>
                {project?.status ? (
                  <div
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest',
                      project.status === 'closed'
                        ? 'bg-emerald-50 text-emerald-600'
                        : project.status === 'active'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {project.status === 'closed'
                      ? t.projectDetail.projectStatusClosed
                      : project.status === 'archived'
                        ? t.projectDetail.projectStatusArchived
                        : t.projectDetail.projectStatusActive}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {(settings.helpAssignmentsUrl || settings.helpAssignmentsMd || settings.helpUsersUrl || settings.helpUsersMd || settings.helpActivitiesUrl || settings.helpActivitiesMd) && (
              <button 
                type="button"
                onClick={() => setIsHelpModalOpen(true)}
                className="self-start rounded-xl border border-transparent p-2 text-slate-400 transition-all hover:border-slate-100 hover:bg-slate-50 hover:text-slate-900"
                title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Guidance`}
              >
                <HelpCircle size={20} />
              </button>
            )}
            {error && <div className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-2 animate-pulse bg-red-50 px-4 py-2 rounded-xl border border-red-100">
              <AlertCircle size={14} /> {error}
            </div>}
          </div>
        </header>

        {/* Row 2: Navigation Bar — mobile: equal-width tabs; desktop: compact left-aligned */}
        <div className="flex w-full items-stretch gap-1.5 overflow-x-auto px-3 py-2 no-scrollbar sm:justify-start sm:gap-1 sm:px-6">
          <button 
            key="tab-overview"
            onClick={() => setActiveTab('overview')}
            title={t.projectDetail.overview}
            className={cn(
              "flex flex-1 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] font-bold uppercase tracking-wide shadow-sm transition-all sm:flex-none sm:shrink-0 sm:justify-start sm:gap-1.5 sm:px-3 sm:py-1.5",
              activeTab === 'overview' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-400 border-slate-100 hover:text-slate-600 hover:border-slate-200"
            )}
          >
            <Home size={12} />
            <span className="hidden sm:inline">{t.projectDetail.overview}</span>
          </button>
          {!isAuditorProjectView || isServiceProject ? (
          <button 
            key="tab-forms"
            onClick={() => setActiveTab('forms')}
            title={t.projectDetail.questionnaires}
            className={cn(
              "flex flex-1 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] font-bold uppercase tracking-wide shadow-sm transition-all sm:flex-none sm:shrink-0 sm:justify-start sm:gap-1.5 sm:px-3 sm:py-1.5",
              activeTab === 'forms' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-400 border-slate-100 hover:text-slate-600 hover:border-slate-200"
            )}
          >
            <ClipboardList size={12} />
            <span className="hidden sm:inline">{t.projectDetail.questionnaires} ({formsVisiblePages.length})</span>
            <span className="sm:hidden">{formsVisiblePages.length}</span>
          </button>
          ) : null}
          {isProjectAdmin && (
            <button 
              key="tab-users"
              onClick={() => setActiveTab('users')}
              title={t.projectDetail.usersAndAssignments}
              className={cn(
                "flex flex-1 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] font-bold uppercase tracking-wide shadow-sm transition-all sm:flex-none sm:shrink-0 sm:justify-start sm:gap-1.5 sm:px-3 sm:py-1.5",
                activeTab === 'users' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-400 border-slate-100 hover:text-slate-600 hover:border-slate-200"
              )}
            >
              <Users size={12} />
              <span className="hidden sm:inline">
                {t.projectDetail.users}({projectTeamMembersCount}) / {t.projectDetail.assignments}({assignments?.length || 0})
              </span>
              <span className="sm:hidden">
                {projectTeamMembersCount}/{assignments?.length || 0}
              </span>
            </button>
          )}
          {!isAuditorProjectView ? (
          <button 
            key="tab-plan"
            onClick={() => setActiveTab('plan')}
            title={isServiceProject ? t.projectDetail.calendarTab : t.projectDetail.plan}
            className={cn(
              "flex flex-1 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] font-bold uppercase tracking-wide shadow-sm transition-all sm:flex-none sm:shrink-0 sm:justify-start sm:gap-1.5 sm:px-3 sm:py-1.5",
              activeTab === 'plan' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-400 border-slate-100 hover:text-slate-600 hover:border-slate-200"
            )}
          >
            <Calendar size={12} />
            <span className="hidden sm:inline">
              {isServiceProject ? t.projectDetail.calendarTab : t.projectDetail.plan}
            </span>
          </button>
          ) : null}
          {!isServiceProject ? (
          <button 
            key="tab-audit"
            onClick={() => setActiveTab('audit')}
            title={t.projectDetail.auditTab}
            className={cn(
              "flex flex-1 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] font-bold uppercase tracking-wide shadow-sm transition-all sm:flex-none sm:shrink-0 sm:justify-start sm:gap-1.5 sm:px-3 sm:py-1.5",
              activeTab === 'audit' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-400 border-slate-100 hover:text-slate-600 hover:border-slate-200"
            )}
          >
            <FileText size={12} />
            <span className="hidden sm:inline">{t.projectDetail.auditTab} ({auditVisiblePages.length})</span>
            <span className="sm:hidden">{auditVisiblePages.length}</span>
          </button>
          ) : null}
          {!isAuditorProjectView && (
            <button
              key="tab-compliance"
              onClick={() => setActiveTab('compliance')}
              title={t.projectDetail.complianceTabTitle}
              className={cn(
                "flex flex-1 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] font-bold uppercase tracking-wide shadow-sm transition-all sm:flex-none sm:shrink-0 sm:justify-start sm:gap-1.5 sm:px-3 sm:py-1.5",
                activeTab === 'compliance' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-400 border-slate-100 hover:text-slate-600 hover:border-slate-200"
              )}
            >
              <Zap size={12} />
              <span className="hidden sm:inline">{t.projectDetail.complianceTab}</span>
            </button>
          )}
          {(isProjectAdmin || isAuditorProjectView) && (
            <button
              key="tab-activity"
              onClick={() => setActiveTab('activity')}
              title={t.projectDetail.activity}
              className={cn(
                "flex flex-1 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] font-bold uppercase tracking-wide shadow-sm transition-all sm:flex-none sm:shrink-0 sm:justify-start sm:gap-1.5 sm:px-3 sm:py-1.5",
                activeTab === 'activity' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-400 border-slate-100 hover:text-slate-600 hover:border-slate-200"
              )}
            >
              <History size={12} />
              <span className="hidden sm:inline">{t.projectDetail.activity}</span>
            </button>
          )}
        </div>
      </div>

      {/* Pane Area */}
      <div className="flex-1 overflow-hidden flex">
        {activeTab === 'overview' ? (
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/40">
            <div className="w-full space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-3 gap-3">
                <div>
                  <h2 className="text-xl font-bold font-display tracking-tight text-slate-900">
                    {isServiceProject ? t.projectDetail.serviceTitle : t.projectDetail.title}
                  </h2>
                  <p className="text-slate-500 mt-1 text-xs">
                    {isServiceProject
                      ? t.projectDetail.serviceDescription
                      : t.projectDetail.description}
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {isPlatformAdmin && !isEditingOverview && (
                    <button
                      onClick={() => setClearModal({ isOpen: true, includeUsers: false, loading: false })}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={16} />
                      {t.projectDetail.clearData}
                    </button>
                  )}
                  {(settings as { moduleImportanceEnabled?: boolean }).moduleImportanceEnabled !== false &&
                    !isEditingOverview &&
                    (isPlatformAdmin ||
                      isAdmin ||
                      currentUser?.role === 'consultant') && (
                      <button
                        type="button"
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (project?.customerId) {
                            params.set('customerId', project.customerId);
                          }
                          const startYear = project?.startDate
                            ? new Date(project.startDate).getFullYear()
                            : NaN;
                          params.set(
                            'year',
                            String(
                              Number.isFinite(startYear) && startYear > 2000
                                ? startYear
                                : new Date().getFullYear(),
                            ),
                          );
                          if (projectId) params.set('projectId', projectId);
                          navigate(`/materiality?${params.toString()}`, {
                            state: { sidebarNav: 'projects' },
                          });
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                      >
                        <Target size={16} />
                        {t.nav.materiality}
                      </button>
                    )}
                  {isProjectAdmin && (
                    <button 
                      onClick={() => {
                        if (isEditingOverview) handleSaveOverview();
                        else setIsEditingOverview(true);
                      }}
                      className={cn(
                        "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                        isEditingOverview 
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100" 
                          : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-100"
                      )}
                    >
                      {isEditingOverview ? <CheckCircle2 size={16} /> : <Settings size={16} />}
                      {isEditingOverview ? t.projectDetail.saveChanges : t.projectDetail.editProject}
                    </button>
                  )}
                </div>
              </div>

              {/* Template suggestion banner */}
              {templateSuggestion && !dismissedSuggestions.has(templateSuggestion.templateId) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 text-sm mb-1">
                      Önerilen Şablon
                    </h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Önemlilik Değerlendirmesi'nde {templateSuggestion.topicId} konusu önemli olarak işaretlenmiş.
                      <strong> {templateSuggestion.templateName}</strong> şablonunu yüklemek önerilir.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (project && isProjectAdmin) {
                            try {
                              // Update project with the suggested template
                              await DB.projects.update(project.id, {
                                templateId: templateSuggestion.templateId,
                              });
                              setTemplateSuggestion(null);
                              await loadProjectData();
                              showAlert(
                                'Şablon Yüklendi',
                                `${templateSuggestion.templateName} şablonu projeye eklendi.`,
                                'info',
                              );
                            } catch (err) {
                              showAlert(
                                'Hata',
                                'Şablon yüklenirken bir hata oluştu.',
                                'warning',
                              );
                            }
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors"
                      >
                        Yükle
                      </button>
                      <button
                        onClick={() => {
                          setDismissedSuggestions(
                            (prev) =>
                              new Set([
                                ...prev,
                                templateSuggestion.templateId,
                              ]),
                          );
                          setTemplateSuggestion(null);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-50 border border-blue-200 font-medium transition-colors"
                      >
                        Sonra
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                 {/* Left Column: basic info, overall progress & activity */}
                 <div className="space-y-4 xl:col-span-7">
                    <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-3">
                        <div
                          className={cn(
                            'space-y-1.5 min-w-0',
                            isEditingOverview && 'sm:col-span-2',
                          )}
                        >
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {isServiceProject ? t.projectDetail.serviceName : t.projectDetail.projectName}
                          </label>
                          {isEditingOverview ? (
                            <>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1 space-y-1.5">
                                  <input
                                    type="text"
                                    value={editedProject.name || ''}
                                    onChange={(e) =>
                                      setEditedProject({ ...editedProject, name: e.target.value })
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                                  />
                                </div>
                                <div className="min-w-0 space-y-1.5 sm:w-44 shrink-0">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {isServiceProject
                                      ? t.projectDetail.serviceStatus
                                      : t.projectDetail.projectStatus}
                                  </label>
                                  <select
                                    value={editedProject.status}
                                    onChange={(e) =>
                                      setEditedProject({
                                        ...editedProject,
                                        status: e.target.value as 'active' | 'closed' | 'archived',
                                      })
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer"
                                  >
                                    <option value="active">{t.projectDetail.projectStatusActive}</option>
                                    <option value="closed">{t.projectDetail.projectStatusClosed}</option>
                                    <option value="archived">{t.projectDetail.projectStatusArchived}</option>
                                  </select>
                                </div>
                              </div>
                              {!isServiceProject ? (
                              <div className="space-y-1.5 pt-3">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  {t.projectDetail.projectDomains}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {(allDomains || []).map((domain) => {
                                    const isChecked = (editedProject.domainIds || []).includes(domain.id);
                                    return (
                                      <label
                                        key={domain.id}
                                        className={cn(
                                          'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-wide transition-colors',
                                          isChecked
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300',
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          className="sr-only"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const currentIds = editedProject.domainIds || [];
                                            if (e.target.checked) {
                                              setEditedProject({
                                                ...editedProject,
                                                domainIds: [...currentIds, domain.id],
                                              });
                                            } else {
                                              setEditedProject({
                                                ...editedProject,
                                                domainIds: currentIds.filter((id) => id !== domain.id),
                                              });
                                            }
                                          }}
                                        />
                                        <Tags size={10} className={cn(isChecked ? 'text-blue-300' : 'text-slate-400')} />
                                        <span className="max-w-[10rem] truncate">{domain.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                {allDomains.length === 0 && (
                                  <p className="text-[10px] text-slate-400 italic">{t.projectDetail.noDomainsDefined}</p>
                                )}
                              </div>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <p className="text-lg font-bold text-slate-900 truncate" title={project?.name}>
                                {project?.name}
                              </p>
                              {!isServiceProject ? (
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {project?.domainIds &&
                                project.domainIds.length > 0 &&
                                allDomains.length > 0
                                  ? [...new Set(project.domainIds)].map((id) => {
                                      const domain = allDomains.find((d) => d.id === id);
                                      if (!domain) return null;
                                      return (
                                        <span
                                          key={`proj-domain-${id}`}
                                          className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-700"
                                        >
                                          <Tags size={10} className="shrink-0 text-slate-500" aria-hidden />
                                          <span className="truncate">{domain.name}</span>
                                        </span>
                                      );
                                    })
                                  : null}
                              </div>
                              ) : null}
                            </>
                          )}
                        </div>

                        {!isEditingOverview ? (
                        <div className="space-y-1.5 min-w-0">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.projectDetail.customer}</label>
                          <div className="flex items-center gap-3 min-w-0">
                             <div className="hidden sm:flex w-8 h-8 bg-slate-50 rounded-lg items-center justify-center font-bold text-xs text-slate-900 border border-slate-100 overflow-hidden shrink-0">
                                {customer?.logoUrl ? <img src={customer.logoUrl} alt={customer?.name || ''} className="w-full h-full object-cover" /> : (customer?.name?.[0] || project?.name?.[0])}
                             </div>
                             <p className="text-sm font-bold text-slate-900 truncate">{customer?.name}</p>
                          </div>
                        </div>
                        ) : null}

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.projectDetail.startDate}</label>
                          {isEditingOverview ? (
                            <input 
                              type="date" 
                              value={editedProject.startDate || ''}
                              onChange={e => setEditedProject({ ...editedProject, startDate: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            />
                          ) : (
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              {project?.startDate ? new Date(project.startDate).toLocaleDateString() : t.common.emptyMark}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.projectDetail.endDate}</label>
                          {isEditingOverview ? (
                            <input 
                              type="date" 
                              value={editedProject.endDate || ''}
                              onChange={e => setEditedProject({ ...editedProject, endDate: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            />
                          ) : (
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              {project?.endDate ? new Date(project.endDate).toLocaleDateString() : t.common.emptyMark}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5 min-w-0">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t.projectDetail.datasetUsed}
                          </label>
                          <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900">
                            <ClipboardList size={14} className="shrink-0 text-slate-400" />
                            <span className="min-w-0 truncate">
                              {(template?.name || '').trim() || t.common.emptyMark}
                            </span>
                          </p>
                        </div>

                        {!isEditingOverview ? (
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t.projectDetail.questionAssignment}
                          </label>
                          <span className="inline-flex max-w-full items-center gap-1 self-start truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wide text-slate-700">
                            <Tag size={10} className="shrink-0 text-slate-500" aria-hidden />
                            <span className="truncate">
                              {project?.allowMultipleAssignments
                                ? t.projectDetail.assignmentBadgeMulti
                                : t.projectDetail.assignmentBadgeSingle}
                            </span>
                          </span>
                        </div>
                        ) : null}
                      </div>
                    </section>

                    {!isAuditorProjectView && !isEditingOverview ? (
                    <section className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
                       {!isServiceProject ? (
                       <div className="mb-3 flex items-center gap-3">
                            <span className="shrink-0 text-xs font-semibold text-slate-500">{t.projectDetail.overviewOverallProgress}</span>
                            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                initial={{ width: 0 }}
                                animate={{ width: `${overviewProgressPercent}%` }}
                                className="h-full bg-blue-500"
                              />
                            </div>
                            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{overviewProgressPercent}%</span>
                       </div>
                       ) : null}

                       <div className="grid grid-cols-3 gap-2">
                         <button
                           type="button"
                           onClick={() => setActiveTab('forms')}
                           className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-slate-200 hover:bg-slate-100"
                         >
                            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                              {t.projectDetail.overviewCardForms}
                            </p>
                            <p className="text-lg font-bold tabular-nums">{overviewHealthStats.qTotal}</p>
                         </button>
                         <button
                           type="button"
                           onClick={() => setActiveTab('plan')}
                           className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-slate-200 hover:bg-slate-100"
                         >
                            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                              {t.projectDetail.overviewCardAssignments}
                            </p>
                            <p className="text-lg font-bold tabular-nums">{overviewHealthStats.aTotal}</p>
                         </button>
                         <button
                           type="button"
                           onClick={() => setActiveTab('users')}
                           className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-slate-200 hover:bg-slate-100"
                         >
                            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                              {t.projectDetail.overviewCardUsers}
                            </p>
                            <p className="text-lg font-bold tabular-nums text-blue-600">{projectTeamMembersCount}</p>
                         </button>
                       </div>
                    </section>
                    ) : null}

                    {!isEditingOverview ? (
                    <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
                       <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         {isServiceProject ? t.projectDetail.serviceActivity : t.projectDetail.projectActivity}
                       </h3>
                       <div className="space-y-2.5 max-h-48 overflow-y-auto">
                         {overviewActivityLogs.map((log, idx) => (
                           <div key={`side-log-${log.id}-${idx}`} className="flex gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              <div>
                                <p className="text-xs text-slate-700 line-clamp-2">{log.details}</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                  {log.userName?.trim() || log.userEmail?.trim() || t.projectDetail.unknown}
                                  {' · '}
                                  {new Date(log.timestamp).toLocaleDateString(
                                    assignmentEmailDateLocale,
                                  )}
                                </p>
                              </div>
                           </div>
                         ))}
                         {sortedAuditLogs.length === 0 && (
                           <p className="text-xs text-slate-400 italic">{t.projectDetail.noRecentActivity}</p>
                         )}
                         {sortedAuditLogs.length > 0 ? (
                         <button 
                          type="button"
                          onClick={() => setActiveTab('activity')}
                          className="w-full text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2 hover:text-slate-900 transition-colors"
                         >
                           {t.projectDetail.viewFullAudit}
                         </button>
                         ) : null}
                       </div>
                    </section>
                    ) : null}
                 </div>

                 {/* Right Column: help video & assignment */}
                 <div className="space-y-4 xl:col-span-5">
                    {currentUserAssignment && !isAuditorProjectView && (
                      <div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative overflow-hidden rounded-xl bg-blue-600 p-4 text-white shadow-md"
                      >
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-base font-bold tracking-tight">Your Assigned Task</h3>
                            <p className="text-xs text-blue-100/90">
                              {(currentUserAssignment.questionIds || []).length} questions for this cycle
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                              <div
                                className="h-full bg-white transition-all duration-500"
                                style={{ width: `${currentUserAssignment.status === 'completed' ? 100 : Math.round(Math.min(100, (answers.filter(a => a.assignmentId === currentUserAssignment?.id || a.contactId === user?.uid).length / ((currentUserAssignment.questionIds || []).length || 1)) * 100))}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold">{currentUserAssignment.status === 'completed' ? '100%' : `${Math.round(Math.min(100, (answers.filter(a => a.assignmentId === currentUserAssignment?.id || a.contactId === user?.uid).length / ((currentUserAssignment.questionIds || []).length || 1)) * 100))}%`}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => goToTasksForProject(currentUserAssignment.id)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-50"
                          >
                            <ClipboardList size={16} />
                            {t.dashboard.goToTasks}
                          </button>
                        </div>
                      </div>
                    )}

                    {!isAuditorProjectView ? (
                    <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.projectDetail.tutorialVideo}</label>
                          {isEditingOverview && (
                            <input 
                              type="url" 
                              placeholder="https://vimeo.com/..."
                              value={editedProject.helpVideoUrl || ''}
                              onChange={e => setEditedProject({ ...editedProject, helpVideoUrl: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            />
                          )}
                        </div>

                        {!isEditingOverview && project?.helpVideoUrl && getVideoEmbed(project.helpVideoUrl) ? (
                          <div className="aspect-video max-h-52 w-full overflow-hidden rounded-lg border border-slate-100 bg-slate-900">
                            {(() => {
                              const helpEmbed = getVideoEmbed(project.helpVideoUrl)!;
                              return helpEmbed.type === 'iframe' ? (
                              <iframe 
                                src={helpEmbed.url} 
                                className="w-full h-full border-0"
                                title={t.projectDetail.tutorialVideo}
                                allow={videoIframeAllow}
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                              />
                            ) : (
                              <video 
                                src={helpEmbed.url}
                                className="w-full h-full"
                                controls
                                playsInline
                              />
                            );
                            })()}
                          </div>
                        ) : !isEditingOverview ? (
                          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                             <p className="flex-1 truncate text-xs font-medium text-slate-600">{project?.helpVideoUrl || t.projectDetail.noHelpVideo}</p>
                             {project?.helpVideoUrl && (
                               <a href={project.helpVideoUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                 <ArrowRight size={16} />
                               </a>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </section>
                    ) : null}
                 </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'forms' || activeTab === 'audit' ? (
          <div
            className={cn(
              'flex-1 flex flex-col overflow-hidden transition-colors duration-300',
              'bg-[#F8F9FA]',
            )}
          >
            {/* Dataset tabs: compact row; selected tab slightly taller, title at top; bottom flush with gray (no slit) */}
            <div className="no-scrollbar flex shrink-0 items-end gap-1.5 overflow-x-auto overflow-y-hidden border-b border-slate-200/60 bg-[#F8F9FA] px-4 pb-0 pt-2 sm:px-6 lg:px-8">
              <div className="w-[30px] shrink-0 self-end" aria-hidden />
              {visiblePages.map((page, idx) => {
                const isSelected = selectedPage?.id === page.id;
                const color = DATASET_COLORS[idx % DATASET_COLORS.length];
                
                return (
                  <button
                    key={`nav-page-${page.id}-${idx}`}
                    onClick={() => setSelectedPage(page)}
                    className={cn(
                      'group relative flex w-[min(9.5rem,32vw)] max-w-[10.5rem] flex-shrink-0 flex-col justify-start rounded-t-[14px] rounded-b-none border-t-2 border-l-2 border-r-2 border-b-0 px-3 text-left outline-none transition-all duration-200',
                      color.bg,
                      color.border,
                      isSelected
                        ? 'z-20 mb-[-1px] min-h-[2.65rem] border-b-2 !border-b-[#F8F9FA] pt-2 pb-1.5 shadow-sm ring-1 ring-black/[0.05]'
                        : 'z-0 min-h-[2.05rem] border-b-0 py-1.5 opacity-[0.92] hover:z-[1] hover:opacity-100',
                    )}
                  >
                    <div className="min-w-0">
                      <h3
                        className={cn(
                          'truncate text-xs font-extrabold uppercase tracking-widest sm:text-[13px]',
                          color.text,
                          !isSelected && 'opacity-80 group-hover:opacity-100',
                        )}
                      >
                        {page.title.toUpperCase()}
                      </h3>
                    </div>
                  </button>
                );
              })}
              {visiblePages.length > 0 ? (
                <button
                  type="button"
                  key="nav-page-all"
                  onClick={() => setSelectedPage(formsAllPagesTab)}
                  className={cn(
                    'group relative ml-auto flex w-[min(7.5rem,26vw)] max-w-[8.5rem] flex-shrink-0 flex-col justify-start rounded-t-[14px] rounded-b-none border-t-2 border-l-2 border-r-2 border-b-0 px-3 text-left outline-none transition-all duration-200',
                    FORMS_ALL_PAGES_COLOR.bg,
                    FORMS_ALL_PAGES_COLOR.border,
                    isFormsAllPagesView
                      ? 'z-20 mb-[-1px] min-h-[2.65rem] border-b-2 !border-b-[#F8F9FA] pt-2 pb-1.5 shadow-sm ring-1 ring-black/[0.05]'
                      : 'z-0 min-h-[2.05rem] border-b-0 py-1.5 opacity-[0.92] hover:z-[1] hover:opacity-100',
                  )}
                >
                  <div className="min-w-0">
                    <h3
                      className={cn(
                        'truncate text-xs font-extrabold uppercase tracking-widest sm:text-[13px]',
                        FORMS_ALL_PAGES_COLOR.text,
                        !isFormsAllPagesView && 'opacity-80 group-hover:opacity-100',
                      )}
                    >
                      {t.projectDetail.formsAllPagesTab.toUpperCase()}
                    </h3>
                  </div>
                </button>
              ) : null}
            </div>

            {/* Main content: neutral gray canvas; tab strip uses same fill so selected tab has no visible gap */}
            <div
              className={cn(
                'flex flex-1 flex-col overflow-hidden transition-colors duration-300',
                'bg-[#F8F9FA]',
              )}
            >
              {visiblePages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center bg-gray-50/50">
                  <div className="p-6 bg-white rounded-full shadow-sm mb-6">
                    <ClipboardList size={48} className="text-gray-200" />
                  </div>
                  <h2 className="text-xl font-bold font-display text-gray-900 mb-2">{t.projectDetail.noQuestionnaires}</h2>
                  <p className="max-w-xs text-sm mb-8">{t.projectDetail.noQuestionnairesSubtitle}</p>
                  
                  {isPlatformAdmin && (
                    <button 
                      onClick={() => setShowRebuildModal(true)}
                      className="minimal-button-primary flex items-center gap-2"
                    >
                      <Zap size={16} /> {t.projectDetail.rebuildQuestionnaire}
                    </button>
                  )}
                </div>
              ) : !selectedPage ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center bg-gray-50/50">
                  <div className="p-6 bg-white rounded-full shadow-sm mb-6">
                    <FileText size={48} className="text-gray-200" />
                  </div>
                  <h2 className="text-xl font-bold font-display text-gray-900 mb-2">{t.projectDetail.selectQuestionnaire}</h2>
                  <p className="max-w-xs text-sm">{t.projectDetail.selectQuestionnaireSubtitle}</p>
                </div>
              ) : (
                <div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col h-full overflow-hidden"
                >
                  <div className="relative z-20 shrink-0 border-b border-slate-100 bg-white px-3 py-2 sm:px-4">
                    <div className="flex min-w-0 flex-row items-center gap-1">
                      <div className="flex min-h-8 min-w-0 flex-1 items-center gap-0 overflow-x-auto no-scrollbar">
                        <div
                          className="flex h-8 w-3 shrink-0 items-center justify-center text-slate-300/90"
                          aria-hidden
                        >
                          <ChevronRight size={14} strokeWidth={2} />
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuestionFormsWorkflowFilter('all')}
                          title={`${t.projectDetail.formsWorkflowFilterAll} ${pageProgressLabel}`}
                          aria-label={`${t.projectDetail.formsWorkflowFilterAll} ${pageProgressLabel}`}
                          className={cn(
                            'flex h-8 shrink-0 items-center gap-1 rounded-lg border border-transparent px-1.5 transition-all lg:gap-1.5 lg:px-2',
                            questionFormsWorkflowFilter === 'all'
                              ? currentPageColor.text
                              : 'text-slate-500 hover:border-slate-200 hover:bg-slate-50/80',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                              questionFormsWorkflowFilter === 'all'
                                ? cn(
                                    currentPageColor.activeBg,
                                    currentPageColor.border,
                                    currentPageColor.text,
                                  )
                                : 'border-slate-200/80 bg-slate-100 text-slate-500',
                            )}
                          >
                            <LayoutGrid size={12} strokeWidth={2} className="shrink-0" />
                          </span>
                          <span className="hidden whitespace-nowrap text-[9px] font-bold uppercase tracking-wide lg:inline">
                            {t.projectDetail.formsWorkflowFilterAll}
                          </span>
                          <span
                            className={cn(
                              'min-w-[1.125rem] shrink-0 rounded-md px-1 py-0.5 text-center text-[9px] font-bold leading-none tabular-nums whitespace-nowrap',
                              questionFormsWorkflowFilter === 'all'
                                ? cn(currentPageColor.activeBg, currentPageColor.text)
                                : 'bg-slate-200/70 text-slate-600',
                            )}
                          >
                            <span className="lg:hidden">{pageProgressPercent}</span>
                            <span className="hidden lg:inline">{pageProgressLabel}</span>
                          </span>
                        </button>
                        {formsWorkflowFilterSteps.map((step) => (
                          <Fragment key={step.key}>
                            <div
                              className="flex h-10 w-4 shrink-0 items-center justify-center text-slate-300/90"
                              aria-hidden
                            >
                              <ChevronRight size={16} strokeWidth={2} />
                            </div>
                            <button
                              type="button"
                              onClick={() => setQuestionFormsWorkflowFilter(step.key)}
                              title={step.label}
                              aria-label={`${step.label} (${step.count})`}
                              className={cn(
                                'flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-transparent px-1.5 transition-all lg:gap-2 lg:px-2.5',
                                questionFormsWorkflowFilter === step.key
                                  ? currentPageColor.text
                                  : 'text-slate-500 hover:border-slate-200 hover:bg-slate-50/80',
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                                  questionFormsWorkflowFilter === step.key
                                    ? cn(
                                        currentPageColor.activeBg,
                                        currentPageColor.border,
                                        currentPageColor.text,
                                      )
                                    : 'border-slate-200/80 bg-slate-100 text-slate-500',
                                )}
                              >
                                <step.Icon size={14} strokeWidth={2} className="shrink-0" />
                              </span>
                              <span className="hidden whitespace-nowrap text-[9px] font-bold uppercase leading-snug tracking-wide xl:inline">
                                {step.label}
                              </span>
                              <span
                                className={cn(
                                  'min-w-[1.125rem] shrink-0 rounded-md px-1 py-0.5 text-center text-[9px] font-bold leading-none tabular-nums',
                                  questionFormsWorkflowFilter === step.key
                                    ? cn(currentPageColor.activeBg, currentPageColor.text)
                                    : 'bg-slate-200/70 text-slate-600',
                                )}
                              >
                                {step.count}
                              </span>
                            </button>
                          </Fragment>
                        ))}
                      </div>
                      <div className="flex h-10 shrink-0 items-center border-l border-slate-100 pl-2 sm:pl-3">
                        <button
                          type="button"
                          onClick={() => setFormsToolbarDrawerOpen(true)}
                          title={t.projectDetail.formsToolbarMenu}
                          aria-label={t.projectDetail.formsToolbarMenu}
                          aria-expanded={formsToolbarDrawerOpen}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Zap size={18} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {formsToolbarDrawerOpen && (
                      <>
                        <motion.button
                          type="button"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          aria-label={t.common.close}
                          className="fixed inset-0 z-[85] cursor-default bg-slate-950/25"
                          onClick={() => setFormsToolbarDrawerOpen(false)}
                        />
                        <motion.aside
                          initial={{ x: '100%' }}
                          animate={{ x: 0 }}
                          exit={{ x: '100%' }}
                          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                          className="fixed right-0 top-0 z-[86] flex h-full w-[min(14.5rem,78vw)] flex-col border-l border-slate-200 bg-white shadow-2xl"
                          role="dialog"
                          aria-modal="true"
                          aria-label={t.projectDetail.formsToolbarMenu}
                        >
                          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              {t.projectDetail.formsToolbarMenu}
                            </p>
                            <button
                              type="button"
                              onClick={() => setFormsToolbarDrawerOpen(false)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                              aria-label={t.common.close}
                            >
                              <X size={18} strokeWidth={2} />
                            </button>
                          </div>
                          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPageSummaryModalOpen(true);
                                setFormsToolbarDrawerOpen(false);
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              <ScrollText size={18} strokeWidth={2} className="shrink-0 text-slate-500" />
                              <span className="min-w-0 leading-snug">{t.projectDetail.summarize}</span>
                            </button>
                            {canExportSubmissions && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleExportSubmissionsForSelectedPage();
                                  setFormsToolbarDrawerOpen(false);
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                <Download size={18} strokeWidth={2} className="shrink-0 text-slate-500" />
                                <span className="min-w-0 leading-snug">
                                  {t.projectDetail.exportPageSubmissions}
                                </span>
                              </button>
                            )}
                            {canExportSubmissions && (
                              <button
                                type="button"
                                disabled={exportingSubmissionsWithFiles}
                                onClick={() => {
                                  void handleExportSubmissionsWithFilesForSelectedPage();
                                  setFormsToolbarDrawerOpen(false);
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {exportingSubmissionsWithFiles ? (
                                  <Loader2
                                    size={18}
                                    strokeWidth={2}
                                    className="shrink-0 animate-spin text-slate-500"
                                  />
                                ) : (
                                  <Archive
                                    size={18}
                                    strokeWidth={2}
                                    className="shrink-0 text-slate-500"
                                  />
                                )}
                                <span className="min-w-0 leading-snug">
                                  {t.projectDetail.exportPageSubmissionsWithFiles}
                                </span>
                              </button>
                            )}
                          </nav>
                        </motion.aside>
                      </>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-1 overflow-hidden">
                    {/* Questions & Evidence — pane tint follows selected dataset tab */}
                    <div
                      ref={formsScrollRef}
                      className={cn(
                        'forms-pane-scroll flex flex-1 flex-col overflow-y-auto px-3 pb-8 pt-0 transition-colors duration-300 sm:px-4',
                        'bg-[#F8F9FA] [scroll-padding-top:3.75rem]',
                      )}
                    >
                      <div className="flex min-h-full w-full min-w-0 flex-1 flex-col max-w-none">
                        {/* Narrative Context Hidden as per request */}
                        {/* <div className="space-y-4">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Narrative Context</h3>
                          <div className="p-6 bg-white rounded-3xl border border-slate-100 text-sm italic text-slate-600 shadow-sm leading-relaxed border-l-4 border-l-blue-500">
                            {selectedPage.briefText || 'No template brief provided.'}
                          </div>
                        </div> */}

                        <div className="flex min-h-full flex-1 flex-col pt-0">
                          {(() => {
                            const pageId = isFormsAllPagesView
                              ? FORMS_ALL_PAGES_ID
                              : selectedPage.sourceTemplatePageId ||
                                selectedPage.id;
                            const pageQuestions = formsActivePageQuestions;
                            const formsEmptyPaneClass = cn(
                              'flex min-h-[calc(100vh-17.5rem)] flex-1 flex-col border-x-2 border-b-2 bg-white sm:min-h-[calc(100vh-16rem)]',
                              currentPageColor.border,
                            );
                            const formsEmptyPaneMessageClass =
                              'flex flex-1 items-center justify-center px-6 py-16 text-center text-sm font-medium text-slate-300';

                            if ((pageQuestions?.length || 0) === 0) {
                              return (
                                <div className={formsEmptyPaneClass}>
                                  <p className={formsEmptyPaneMessageClass}>
                                    {t.projectDetail.noQuestionsMapped}
                                  </p>
                                </div>
                              );
                            }

                            const filtered =
                              questionFormsWorkflowFilter === 'all'
                                ? pageQuestions
                                : pageQuestions.filter((q) =>
                                    questionMatchesFormsWorkflowFilter(
                                      q,
                                      answers,
                                      assignments,
                                      questionFormsWorkflowFilter,
                                    ),
                                  );

                            if (filtered.length === 0) {
                              return (
                                <div className={formsEmptyPaneClass}>
                                  <p className={formsEmptyPaneMessageClass}>
                                    {t.projectDetail.questionnaireFilterNoMatch}
                                  </p>
                                </div>
                              );
                            }

                            const baslikKeyFor = (q: Question) => {
                              const baslik =
                                (q.baslik || '').trim() ||
                                QUESTION_FORMS_BASLIK_EMPTY;
                              if (!isFormsAllPagesView) return baslik;
                              const scopePage = resolveQuestionProjectPage(
                                q,
                                visiblePages,
                              );
                              const scopeId = scopePage
                                ? scopePage.sourceTemplatePageId || scopePage.id
                                : q.pageId || '';
                              return `${scopeId}::${baslik}`;
                            };

                            const groupDisplayLabel = (groupKey: string) => {
                              if (!isFormsAllPagesView) {
                                return groupKey === QUESTION_FORMS_BASLIK_EMPTY
                                  ? t.templates.fieldLabelUntagged
                                  : groupKey;
                              }
                              const sep = groupKey.indexOf('::');
                              const scopeId =
                                sep >= 0 ? groupKey.slice(0, sep) : groupKey;
                              const baslikPart =
                                sep >= 0
                                  ? groupKey.slice(sep + 2)
                                  : groupKey;
                              const scopePage = visiblePages.find(
                                (p) =>
                                  p.id === scopeId ||
                                  p.sourceTemplatePageId === scopeId,
                              );
                              const pageTitle = scopePage?.title || scopeId;
                              const baslikLabel =
                                baslikPart === QUESTION_FORMS_BASLIK_EMPTY
                                  ? t.templates.fieldLabelUntagged
                                  : baslikPart;
                              return `${pageTitle} · ${baslikLabel}`;
                            };

                            const groupScopeId = (groupKey: string) => {
                              if (!isFormsAllPagesView) return pageId;
                              const sep = groupKey.indexOf('::');
                              return sep >= 0 ? groupKey.slice(0, sep) : pageId;
                            };

                            const baslikOrder: string[] = [];
                            for (const q of pageQuestions) {
                              const k = baslikKeyFor(q);
                              if (!baslikOrder.includes(k)) baslikOrder.push(k);
                            }

                            const groups = baslikOrder.filter((g) =>
                              filtered.some((q) => baslikKeyFor(q) === g),
                            );

                            const flatFilteredQuestions = groups.flatMap((g) =>
                              filtered.filter((q) => baslikKeyFor(q) === g),
                            );

                            const allGroupRefs = groups.map((g) => ({
                              pageId: groupScopeId(g),
                              groupBaslik: g,
                            }));

                            return (
                              <div
                                className={cn(
                                  'divide-y border-x-2 border-b-2 bg-white',
                                  currentPageColor.border,
                                  currentPageColor.divide,
                                )}
                              >
                                {groups.map((group, groupIdx) => {
                              const groupScope = groupScopeId(group);
                              const groupQuestions = filtered.filter(
                                (q) => baslikKeyFor(q) === group,
                              );
                              const groupSectionQuestionCount = pageQuestions.filter(
                                (q) => baslikKeyFor(q) === group,
                              ).length;
                              const groupSectionCollapsed = isFormsGroupSectionCollapsed(
                                groupScope,
                                group,
                              );
                              const isFirstGroup = groupIdx <= 0;
                              const isLastGroup = groupIdx >= groups.length - 1;
                              return (
                              <div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={`baslik-card-${group}-${groupIdx}-${selectedPage?.id}`}
                                data-forms-group-section
                                className="bg-white shadow-none rounded-none"
                              >
                                <div
                                  id={`forms-group-hdr-${groupScope}-${encodeURIComponent(group)}`}
                                  title={t.projectDetail.formsCollapseAllSectionsHint}
                                  onDoubleClick={(e) => {
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    toggleAllFormsGroupSections(allGroupRefs);
                                  }}
                                  className={cn(
                                    'sticky top-0 z-20 flex min-h-[2.5rem] cursor-default items-center justify-between gap-2 border-b px-4 py-2 shadow-sm',
                                    currentPageColor.bg,
                                    currentPageColor.border,
                                  )}
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                    <h3
                                      className={cn(
                                        'min-w-0 text-xs font-extrabold uppercase tracking-widest sm:text-[13px]',
                                        currentPageColor.text,
                                      )}
                                    >
                                      {groupDisplayLabel(group)}
                                    </h3>
                                    <span
                                      className={cn(
                                        'shrink-0 tabular-nums rounded-full px-2.5 py-0.5 text-[10px] font-bold leading-none',
                                        currentPageColor.activeBg,
                                        currentPageColor.text,
                                      )}
                                      title={t.projectDetail.formsGroupQuestionCount.replace(
                                        '{count}',
                                        String(groupSectionQuestionCount),
                                      )}
                                    >
                                      {groupSectionQuestionCount}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFormsGroupSectionCollapsed(groupScope, group);
                                      }}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      title={
                                        groupSectionCollapsed
                                          ? t.projectDetail.formsExpandGroupSection
                                          : t.projectDetail.formsCollapseGroupSection
                                      }
                                      aria-label={
                                        groupSectionCollapsed
                                          ? t.projectDetail.formsExpandGroupSection
                                          : t.projectDetail.formsCollapseGroupSection
                                      }
                                      aria-expanded={!groupSectionCollapsed}
                                      className={cn(
                                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all hover:bg-white',
                                        currentPageColor.border,
                                        currentPageColor.text,
                                        groupSectionCollapsed
                                          ? 'bg-white/70 opacity-80'
                                          : 'bg-white shadow-sm ring-1 ring-black/[0.06]',
                                      )}
                                    >
                                      <ChevronDown
                                        size={14}
                                        strokeWidth={2}
                                        className={cn(
                                          'transition-transform duration-200',
                                          groupSectionCollapsed && '-rotate-90',
                                        )}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isFirstGroup}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        scrollToPreviousFormsGroup(groupScope, group, groups);
                                      }}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      title={t.projectDetail.formsScrollToPreviousGroup}
                                      aria-label={t.projectDetail.formsScrollToPreviousGroup}
                                      className={cn(
                                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all',
                                        currentPageColor.border,
                                        currentPageColor.text,
                                        isFirstGroup
                                          ? 'cursor-not-allowed bg-white/40 opacity-40'
                                          : 'bg-white/70 hover:bg-white',
                                      )}
                                    >
                                      <ArrowUp size={14} strokeWidth={2} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isLastGroup}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        scrollToNextFormsGroup(groupScope, group, groups);
                                      }}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      title={t.projectDetail.formsScrollToNextGroup}
                                      aria-label={t.projectDetail.formsScrollToNextGroup}
                                      className={cn(
                                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all',
                                        currentPageColor.border,
                                        currentPageColor.text,
                                        isLastGroup
                                          ? 'cursor-not-allowed bg-white/40 opacity-40'
                                          : 'bg-white/70 hover:bg-white',
                                      )}
                                    >
                                      <ArrowDown size={14} strokeWidth={2} />
                                    </button>
                                  </div>
                                </div>
                                {!groupSectionCollapsed && (
                                <div className="divide-y divide-slate-100">
                                  {filtered
                                    .filter((q) => baslikKeyFor(q) === group)
                                    .map((q, qIdx) => {
                                      const questionAnswers = getAnswersForQuestion(
                                        q,
                                        answers || [],
                                      );
                                      const ans = pickPrimaryAnswer(questionAnswers);
                                      const questionAssignments = assignmentsCoveringQuestion(
                                        q,
                                        assignments || [],
                                      );
                                      const emptyAnswerLabel =
                                        activeTab === 'audit'
                                          ? canEditAuditForm
                                            ? (questionAssignments.length > 0
                                                ? t.projectDetail.waitingResponse
                                                : 'Denetim verisi girilmemiş')
                                            : 'Denetim verisi girilmemiş, denetim verilerini sadece denetçi rolünde olan kişiler girebilir'
                                          : questionAssignments.length > 0
                                            ? t.projectDetail.waitingResponse
                                            : t.projectDetail.noCustomerAssignment;
                                      const workflowState = getQuestionWorkflowState(
                                        q,
                                        answers,
                                        assignments,
                                      );
                                      const isAuditTab = activeTab === 'audit';
                                      const hasSubstantiveAnswers = questionAnswers.some((a) =>
                                        answerHasSubstantiveContent(a),
                                      );
                                      const showWorkflowBanner = showWorkflowStatusBanner(
                                        workflowState,
                                        hasSubstantiveAnswers,
                                        isAuditTab,
                                      );
                                      const workflowUsesStatusCardLayout = isAuditTab
                                        ? showWorkflowBanner
                                        : workflowState === 'sent_back' ||
                                          workflowState === 'approved' ||
                                          (workflowState === 'customer_responded' &&
                                            showWorkflowBanner);
                                      const questionAboveStatusCard =
                                        workflowUsesStatusCardLayout &&
                                        (isAuditTab ||
                                          workflowState === 'customer_responded' ||
                                          workflowState === 'sent_back' ||
                                          workflowState === 'approved');
                                      const showFormsReviewComments =
                                        activeTab === 'forms' &&
                                        canPmReviewWorkflow &&
                                        (workflowState === 'customer_responded' ||
                                          workflowState === 'sent_back');
                                      const showAuditReviewForAnswer = (
                                        subAns: Answer,
                                      ) =>
                                        isAuditTab &&
                                        canEditAuditForm &&
                                        answerHasSubstantiveContent(subAns);
                                      const isSentAwaitingResponse =
                                        activeTab !== 'audit' &&
                                        questionAssignments.length > 0 &&
                                        workflowState === 'sent_pending';
                                      const sentPendingBannerInfo =
                                        workflowState === 'sent_pending'
                                          ? resolveSentPendingBannerInfo(
                                              questionAssignments,
                                              platformUsers || [],
                                              contacts || [],
                                              assignmentEmailDateLocale,
                                            )
                                          : undefined;
                                      const workflowStatusLockedOnForm =
                                        workflowState === 'not_sent' ||
                                        workflowState === 'sent_pending' ||
                                        workflowState === 'sent_back';
                                      const workflowSelectDisabled =
                                        !canUpdateQuestionWorkflow ||
                                        workflowStatusLockedOnForm;
                                      const workflowSelectTitle =
                                        workflowState === 'not_sent'
                                          ? t.projectDetail.workflowSelectLockedNotSent
                                          : workflowState === 'sent_pending'
                                            ? t.projectDetail.workflowSelectLockedSentPending
                                            : workflowState === 'sent_back'
                                              ? t.projectDetail.workflowSelectLockedSentBack
                                              : undefined;
                                      const noSubstantiveAnswer = !questionAnswers.some((a) =>
                                        answerHasSubstantiveContent(a),
                                      );
                                      const openAssignmentForQuestion = (
                                        assignments || []
                                      ).find(
                                        (a) =>
                                          !a.sentAt &&
                                          !a.deadline &&
                                          (a.questionIds || []).includes(q.id),
                                      );
                                      const quickAssignRecipientName =
                                        openAssignmentForQuestion
                                          ? (platformUsers || []).find(
                                              (u) =>
                                                u.id ===
                                                openAssignmentForQuestion.recipientId,
                                            )?.name ??
                                            (contacts || []).find(
                                              (c) =>
                                                c.id ===
                                                openAssignmentForQuestion.recipientId,
                                            )?.name
                                          : null;
                                      const showOnBehalfBtn =
                                        !canEditAuditForm &&
                                        activeTab === 'forms' &&
                                        questionAssignments.length === 0 &&
                                        canEnterOnBehalfResponse &&
                                        noSubstantiveAnswer;
                                      const sentAssignmentForQuestion = questionAssignments
                                        .filter(isAssignmentLinkSent)
                                        .sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0))[0];
                                      const showQuickAssignBtn =
                                        (isPlatformAdmin || isProjectAdmin) &&
                                        activeTab === 'forms' &&
                                        noSubstantiveAnswer &&
                                        (workflowState === 'not_sent' ||
                                          Boolean(openAssignmentForQuestion));
                                      const showReassignBtn =
                                        (isPlatformAdmin || isProjectAdmin) &&
                                        activeTab === 'forms' &&
                                        noSubstantiveAnswer &&
                                        isSentAwaitingResponse &&
                                        Boolean(sentAssignmentForQuestion);
                                      const isNotSentWithoutAssignment =
                                        activeTab === 'forms' &&
                                        questionAssignments.length === 0 &&
                                        workflowState === 'not_sent';
                                      const globalQIdx = flatFilteredQuestions.findIndex(
                                        (fq) => fq.id === q.id,
                                      );
                                      const isFirstQuestion = globalQIdx <= 0;
                                      const isLastQuestion =
                                        globalQIdx >= flatFilteredQuestions.length - 1;
                                      const resolveActorName = (id?: string) => {
                                        if (!id) return '—';
                                        const u = (platformUsers || []).find(
                                          (x) => x.id === id,
                                        );
                                        if (u) return u.name;
                                        const c = (contacts || []).find(
                                          (x) => x.id === id,
                                        );
                                        return c?.name || id;
                                      };

                                      const resolveActorSubmittedByDisplay = (
                                        id?: string,
                                      ) => {
                                        if (!id) return '—';
                                        const u = (platformUsers || []).find(
                                          (x) => x.id === id,
                                        );
                                        if (u) {
                                          return `${u.name}${u.email ? ` ${u.email}` : ''}`;
                                        }
                                        const c = (contacts || []).find(
                                          (x) => x.id === id,
                                        );
                                        if (c) {
                                          return `${c.name}${c.email ? ` ${c.email}` : ''}`;
                                        }
                                        return id;
                                      };

                                      const resolveActorOnBehalfDisplay = (
                                        id?: string,
                                      ) => {
                                        if (!id) return '—';
                                        const u = (platformUsers || []).find(
                                          (x) => x.id === id,
                                        );
                                        if (u) {
                                          return `${u.name}${u.email ? ` - ${u.email}` : ''}`;
                                        }
                                        const c = (contacts || []).find(
                                          (x) => x.id === id,
                                        );
                                        if (c) {
                                          return `${c.name}${c.email ? ` - ${c.email}` : ''}`;
                                        }
                                        return id;
                                      };

                                      const isOnBehalfAnswer = (subAns: Answer) => {
                                        const submittedById =
                                          subAns.submittedByUserId || subAns.contactId;
                                        const onBehalfId =
                                          subAns.onBehalfOfUserId || subAns.contactId;
                                        return submittedById !== onBehalfId;
                                      };

                                      const resolveSubmissionRecipient = (
                                        subAns: Answer,
                                      ) => {
                                        const assignment = (assignments || []).find(
                                          (a) => a.id === subAns.assignmentId,
                                        );
                                        if (assignment) {
                                          const u = (platformUsers || []).find(
                                            (x) => x.id === assignment.recipientId,
                                          );
                                          if (u) return u.name;
                                          const c = (contacts || []).find(
                                            (x) => x.id === assignment.recipientId,
                                          );
                                          if (c) return c.name;
                                        }
                                        return resolveActorName(
                                          subAns.onBehalfOfUserId || subAns.contactId,
                                        );
                                      };
                                      const prevQuestionId =
                                        globalQIdx > 0
                                          ? flatFilteredQuestions[globalQIdx - 1]?.id
                                          : undefined;
                                      const nextQuestionId =
                                        globalQIdx >= 0 &&
                                        globalQIdx < flatFilteredQuestions.length - 1
                                          ? flatFilteredQuestions[globalQIdx + 1]?.id
                                          : undefined;
                                      const questionCollapsed = isFormsQuestionCollapsed(q.id);
                                      const formsQuestionToolbarBtn = cn(
                                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all',
                                      );

                                      return (
                                        <div
                                          id={`forms-question-${q.id}`}
                                          key={`question-${q.id}-${groupIdx}-${qIdx}`}
                                          className={cn(
                                            'scroll-mt-[3rem] space-y-3 px-4 py-3 group transition-colors',
                                            isAuditTab && noSubstantiveAnswer
                                              ? 'opacity-45 text-slate-400'
                                              : 'hover:bg-slate-50/50',
                                          )}
                                        >
                                          <header
                                            className="flex flex-col gap-1.5"
                                            title={t.projectDetail.formsCollapseAllQuestionsHint}
                                            onDoubleClick={(e) => {
                                              if ((e.target as HTMLElement).closest('button')) {
                                                return;
                                              }
                                              toggleAllFormsQuestionsInGroup(
                                                groupQuestions.map((gq) => gq.id),
                                              );
                                            }}
                                          >
                                            <div className="flex min-w-0 items-center justify-between gap-3">
                                              <div className="flex min-w-0 items-center gap-1.5">
                                                <p className="text-[11px] font-bold tabular-nums tracking-wide text-slate-600">
                                                  {qIdx + 1}: {q.kod}
                                                </p>
                                                {isPlatformAdmin && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setQuestionGuidanceEditModal({
                                                        questionId: q.id,
                                                        draft: buildQuestionGuidanceDraft(q),
                                                      })
                                                    }
                                                    title={t.templates.openQuestionGuidanceEditor}
                                                    aria-label={t.templates.openQuestionGuidanceEditor}
                                                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                                                  >
                                                    <Pencil size={14} strokeWidth={2} aria-hidden />
                                                  </button>
                                                )}
                                              </div>
                                              <div className="flex shrink-0 items-center gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFormsQuestionCollapsed(q.id);
                                                  }}
                                                  title={
                                                    questionCollapsed
                                                      ? t.projectDetail.formsExpandQuestion
                                                      : t.projectDetail.formsCollapseQuestion
                                                  }
                                                  aria-label={
                                                    questionCollapsed
                                                      ? t.projectDetail.formsExpandQuestion
                                                      : t.projectDetail.formsCollapseQuestion
                                                  }
                                                  aria-expanded={!questionCollapsed}
                                                  className={cn(
                                                    formsQuestionToolbarBtn,
                                                    currentPageColor.border,
                                                    currentPageColor.text,
                                                    questionCollapsed
                                                      ? 'bg-white/70 opacity-80'
                                                      : 'bg-white shadow-sm ring-1 ring-black/[0.06]',
                                                  )}
                                                >
                                                  <ChevronDown
                                                    size={14}
                                                    strokeWidth={2}
                                                    className={cn(
                                                      'transition-transform duration-200',
                                                      questionCollapsed && '-rotate-90',
                                                    )}
                                                  />
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={isFirstQuestion || !prevQuestionId}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (prevQuestionId) {
                                                      const prevQ =
                                                        flatFilteredQuestions[globalQIdx - 1];
                                                      if (prevQ) {
                                                        const prevGroup = baslikKeyFor(prevQ);
                                                        expandFormsGroupSection(
                                                          groupScopeId(prevGroup),
                                                          prevGroup,
                                                        );
                                                      }
                                                      scrollToFormsQuestion(prevQuestionId);
                                                    }
                                                  }}
                                                  title={t.projectDetail.formsQuestionPrevious}
                                                  aria-label={
                                                    t.projectDetail.formsQuestionPrevious
                                                  }
                                                  className={cn(
                                                    formsQuestionToolbarBtn,
                                                    currentPageColor.border,
                                                    currentPageColor.text,
                                                    isFirstQuestion || !prevQuestionId
                                                      ? 'cursor-not-allowed bg-white/40 opacity-40'
                                                      : 'bg-white/70 hover:bg-white',
                                                  )}
                                                >
                                                  <ArrowUp size={14} strokeWidth={2} />
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={isLastQuestion || !nextQuestionId}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (nextQuestionId) {
                                                      const nextQ =
                                                        flatFilteredQuestions[globalQIdx + 1];
                                                      if (nextQ) {
                                                        const nextGroup = baslikKeyFor(nextQ);
                                                        expandFormsGroupSection(
                                                          groupScopeId(nextGroup),
                                                          nextGroup,
                                                        );
                                                      }
                                                      scrollToFormsQuestion(nextQuestionId);
                                                    }
                                                  }}
                                                  title={t.projectDetail.formsQuestionNext}
                                                  aria-label={t.projectDetail.formsQuestionNext}
                                                  className={cn(
                                                    formsQuestionToolbarBtn,
                                                    currentPageColor.border,
                                                    currentPageColor.text,
                                                    isLastQuestion || !nextQuestionId
                                                      ? 'cursor-not-allowed bg-white/40 opacity-40'
                                                      : 'bg-white/70 hover:bg-white',
                                                  )}
                                                >
                                                  <ArrowDown size={14} strokeWidth={2} />
                                                </button>
                                              </div>
                                            </div>
                                          </header>
                                          {!questionCollapsed ? (
                                          isAuditTab && noSubstantiveAnswer ? (
                                            <div className="min-w-0 max-w-none text-sm leading-relaxed text-slate-400/90">
                                              <HelpMarkdown>{q.soru || ''}</HelpMarkdown>
                                            </div>
                                          ) : (
                                          <>
                                          {workflowUsesStatusCardLayout ? (
                                            <>
                                              {questionAboveStatusCard ? (
                                                <div className="mb-3 min-w-0 max-w-none text-sm text-slate-800">
                                                  <HelpMarkdown>{q.soru || ''}</HelpMarkdown>
                                                </div>
                                              ) : null}
                                              <FormsWorkflowStatusBanner
                                                workflowState={workflowState}
                                                pd={t.projectDetail}
                                                variant={isAuditTab ? 'audit' : 'forms'}
                                                sentPendingInfo={sentPendingBannerInfo}
                                              >
                                                {!questionAboveStatusCard ? (
                                                  <div className="min-w-0 max-w-none text-sm text-slate-800">
                                                    <HelpMarkdown>{q.soru || ''}</HelpMarkdown>
                                                  </div>
                                                ) : null}
                                                {questionAnswers.length > 0
                                                  ? questionAnswers.map((subAns) => {
                                                    const subWorkflowState =
                                                      getAnswerWorkflowState(
                                                        q,
                                                        subAns,
                                                        assignments,
                                                      );
                                                    const submittedById =
                                                      subAns.submittedByUserId ||
                                                      subAns.contactId;
                                                    const onBehalfId =
                                                      subAns.onBehalfOfUserId ||
                                                      subAns.contactId;
                                                    const isOnBehalfEntry =
                                                      isOnBehalfAnswer(subAns);
                                                    const SubStatusIcon =
                                                      workflowStatusIcon(subWorkflowState);
                                                    const submittedAtFormatted =
                                                      subAns.submittedAt
                                                        ? new Date(
                                                            subAns.submittedAt,
                                                          ).toLocaleString(
                                                            assignmentEmailDateLocale,
                                                          )
                                                        : null;
                                                    return (
                                                      <div
                                                        key={`submission-${subAns.id}`}
                                                        className="space-y-3"
                                                      >
                                                        <div
                                                          className={cn(
                                                            'w-full rounded-lg border border-slate-200/90 bg-white text-sm leading-relaxed text-slate-800',
                                                            subAns.latestAnswer?.trim()
                                                              ? 'min-h-[80px] p-4'
                                                              : 'flex min-h-[48px] items-center justify-center border-dashed px-4 py-3 italic text-slate-400',
                                                          )}
                                                        >
                                                          {subAns.latestAnswer?.trim() ||
                                                            t.projectDetail.noResponseYet}
                                                        </div>
                                                        {answerHasSubstantiveContent(subAns) ? (
                                                          <div className="space-y-2 border-t border-slate-200/80 pt-3">
                                                            <p className="text-[10px] leading-relaxed text-slate-600">
                                                              <span className="font-semibold text-slate-700">
                                                                {
                                                                  t.projectDetail
                                                                    .submittedByLabel
                                                                }
                                                                :
                                                              </span>{' '}
                                                              {isOnBehalfEntry
                                                                ? resolveActorSubmittedByDisplay(
                                                                    submittedById,
                                                                  )
                                                                : resolveActorName(
                                                                    submittedById,
                                                                  )}
                                                              <br />
                                                              <span className="font-semibold text-slate-700">
                                                                {
                                                                  t.projectDetail
                                                                    .onBehalfOfLabel
                                                                }
                                                                :
                                                              </span>{' '}
                                                              {isOnBehalfEntry
                                                                ? resolveActorOnBehalfDisplay(
                                                                    onBehalfId,
                                                                  )
                                                                : resolveActorName(onBehalfId)}
                                                              {isOnBehalfEntry ? (
                                                                <span className="mt-1 block text-blue-700/90">
                                                                  {
                                                                    t.projectDetail
                                                                      .enteredOnBehalfByConsultant
                                                                  }
                                                                  {submittedAtFormatted
                                                                    ? ` - ${submittedAtFormatted}`
                                                                    : ''}
                                                                </span>
                                                              ) : null}
                                                            </p>
                                                          </div>
                                                        ) : null}
                                                        {showFormsReviewComments ? (
                                                          <FormsAnswerReviewComments
                                                            answer={subAns}
                                                            canComment
                                                            dateLocale={
                                                              assignmentEmailDateLocale
                                                            }
                                                            labels={formsReviewCommentLabels}
                                                            saving={
                                                              savingReviewCommentAnswerId ===
                                                              subAns.id
                                                            }
                                                            onAddComment={
                                                              handleAddAnswerReviewComment
                                                            }
                                                          />
                                                        ) : null}
                                                        {showAuditReviewForAnswer(subAns) ? (
                                                          <AuditAnswerReviewPanel
                                                            projectId={projectId || ''}
                                                            question={q}
                                                            answer={subAns}
                                                            dateLocale={assignmentEmailDateLocale}
                                                            labels={auditReviewLabels}
                                                            savingNote={
                                                              savingReviewCommentAnswerId ===
                                                              subAns.id
                                                            }
                                                            onAddNote={handleAddAnswerReviewComment}
                                                            authorName={
                                                              currentUser?.name ||
                                                              user?.email ||
                                                              'Denetçi'
                                                            }
                                                            onReviewComplete={() => {
                                                              void loadProjectData();
                                                            }}
                                                          />
                                                        ) : null}
                                                        {(subAns.workflowStatusLog?.length ??
                                                          0) > 0 && (
                                                          <div className="rounded-lg border border-slate-200/80 bg-white/80 p-4">
                                                            <p className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                                                              <History size={12} />{' '}
                                                              {isOnBehalfEntry
                                                                ? t.projectDetail
                                                                    .recordHistoryTitle
                                                                : t.projectDetail
                                                                    .workflowStatusLogTitle}
                                                            </p>
                                                            <ul className="space-y-2">
                                                              {[
                                                                ...(subAns.workflowStatusLog ||
                                                                  []),
                                                              ]
                                                                .sort(
                                                                  (a, b) =>
                                                                    b.createdAt - a.createdAt,
                                                                )
                                                                .map((entry) => (
                                                                  <li
                                                                    key={entry.id}
                                                                    className="text-xs font-medium leading-relaxed text-slate-600"
                                                                  >
                                                                    {entry.text}
                                                                  </li>
                                                                ))}
                                                            </ul>
                                                          </div>
                                                        )}
                                                        {subAns.comment ? (
                                                          <div className="rounded-lg border border-blue-100/80 bg-blue-50/80 p-4">
                                                            <p className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-blue-600">
                                                              <MessageSquare size={12} />{' '}
                                                              {t.projectDetail.clientNote}
                                                            </p>
                                                            <p className="text-xs font-medium leading-relaxed text-slate-600">
                                                              {subAns.comment}
                                                            </p>
                                                          </div>
                                                        ) : null}
                                                        {subAns.evidenceName ? (
                                                          <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/90 p-4 text-emerald-700">
                                                            <div className="rounded-lg border border-emerald-100 bg-white p-2">
                                                              <Paperclip size={16} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                                                                {t.projectDetail.evidenceFile}
                                                              </p>
                                                              <p className="truncate text-xs font-bold">
                                                                {subAns.evidenceName}
                                                              </p>
                                                            </div>
                                                            {subAns.latestFileUrl ? (
                                                              <a
                                                                href={subAns.latestFileUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="rounded-lg border border-emerald-100 bg-white/50 px-3 py-1 text-xs font-bold underline transition-colors hover:text-emerald-900"
                                                              >
                                                                {t.projectDetail.download}
                                                              </a>
                                                            ) : null}
                                                          </div>
                                                        ) : null}
                                                      </div>
                                                    );
                                                  })
                                                  : null}
                                              </FormsWorkflowStatusBanner>
                                            </>
                                          ) : (
                                          <>
                                          <div className="min-w-0 max-w-none text-xs leading-relaxed text-slate-800">
                                            <HelpMarkdown>{q.soru || ''}</HelpMarkdown>
                                          </div>

                                          {questionAnswers.length > 0 ? (
                                            <div className="space-y-3">
                                              {showWorkflowBanner ? (
                                                <FormsWorkflowStatusBanner
                                                  workflowState={workflowState}
                                                  pd={t.projectDetail}
                                                  variant="forms"
                                                  sentPendingInfo={sentPendingBannerInfo}
                                                />
                                              ) : null}
                                              {!questionAnswers.every(isOnBehalfAnswer) ? (
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                                  {t.projectDetail.questionSubmissionsTitle} (
                                                  {questionAnswers.length})
                                                </p>
                                              ) : null}
                                              {questionAnswers.map((subAns) => {
                                                const subWorkflowState =
                                                  getAnswerWorkflowState(
                                                    q,
                                                    subAns,
                                                    assignments,
                                                  );
                                                const submittedById =
                                                  subAns.submittedByUserId ||
                                                  subAns.contactId;
                                                const onBehalfId =
                                                  subAns.onBehalfOfUserId ||
                                                  subAns.contactId;
                                                const isOnBehalfEntry =
                                                  isOnBehalfAnswer(subAns);
                                                const SubStatusIcon =
                                                  workflowStatusIcon(subWorkflowState);
                                                const submittedAtFormatted = subAns.submittedAt
                                                  ? new Date(subAns.submittedAt).toLocaleString(
                                                      assignmentEmailDateLocale,
                                                    )
                                                  : null;
                                                return (
                                                  <div
                                                    key={`submission-${subAns.id}`}
                                                    className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
                                                  >
                                                    {!isOnBehalfEntry ? (
                                                      <p className="text-[10px] font-semibold text-slate-600">
                                                        <span className="font-bold uppercase tracking-widest text-slate-400">
                                                          {
                                                            t.projectDetail
                                                              .submissionRecipientLabel
                                                          }
                                                          :{' '}
                                                        </span>
                                                        {resolveSubmissionRecipient(subAns)}
                                                      </p>
                                                    ) : null}
                                                    <div
                                                      className={cn(
                                                        'w-full rounded-none border border-slate-200 bg-slate-50 text-sm leading-relaxed',
                                                        subAns.latestAnswer?.trim()
                                                          ? 'min-h-[120px] p-5'
                                                          : 'flex min-h-[48px] items-center justify-center border-dashed px-5 py-3 italic text-slate-300',
                                                      )}
                                                    >
                                                      {subAns.latestAnswer?.trim() ||
                                                        t.projectDetail.noResponseYet}
                                                    </div>
                                                    {answerHasSubstantiveContent(subAns) ? (
                                                      <div className="space-y-2 border-t border-slate-100 pt-3">
                                                        {activeTab !== 'audit' &&
                                                        !isOnBehalfEntry ? (
                                                          <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                                              {
                                                                t.projectDetail
                                                                  .submissionRecordStatus
                                                              }
                                                              :
                                                            </span>
                                                            <span
                                                              className={cn(
                                                                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest',
                                                                workflowStatusBadgeClass(
                                                                  subWorkflowState,
                                                                ),
                                                              )}
                                                            >
                                                              <SubStatusIcon
                                                                size={12}
                                                                strokeWidth={2}
                                                                aria-hidden
                                                              />
                                                              {workflowStatusLabel(
                                                                subWorkflowState,
                                                                t.projectDetail,
                                                              )}
                                                            </span>
                                                            {submittedAtFormatted ? (
                                                              <span className="text-[10px] tabular-nums text-slate-400">
                                                                {submittedAtFormatted}
                                                              </span>
                                                            ) : null}
                                                          </div>
                                                        ) : null}
                                                        <p className="text-[10px] leading-relaxed text-slate-500">
                                                          <span className="font-semibold text-slate-600">
                                                            {t.projectDetail.submittedByLabel}:
                                                          </span>{' '}
                                                          {isOnBehalfEntry
                                                            ? resolveActorSubmittedByDisplay(
                                                                submittedById,
                                                              )
                                                            : resolveActorName(submittedById)}
                                                          {' · '}
                                                          <span className="font-semibold text-slate-600">
                                                            {t.projectDetail.onBehalfOfLabel}:
                                                          </span>{' '}
                                                          {isOnBehalfEntry
                                                            ? resolveActorOnBehalfDisplay(
                                                                onBehalfId,
                                                              )
                                                            : resolveActorName(onBehalfId)}
                                                          {isOnBehalfEntry ? (
                                                            <span className="mt-1 block text-blue-700/90">
                                                              {
                                                                t.projectDetail
                                                                  .enteredOnBehalfByConsultant
                                                              }
                                                              {submittedAtFormatted
                                                                ? ` - ${submittedAtFormatted}`
                                                                : ''}
                                                            </span>
                                                          ) : null}
                                                        </p>
                                                      </div>
                                                    ) : null}
                                                    {showFormsReviewComments ? (
                                                      <FormsAnswerReviewComments
                                                        answer={subAns}
                                                        canComment
                                                        dateLocale={assignmentEmailDateLocale}
                                                        labels={formsReviewCommentLabels}
                                                        saving={
                                                          savingReviewCommentAnswerId ===
                                                          subAns.id
                                                        }
                                                        onAddComment={handleAddAnswerReviewComment}
                                                      />
                                                    ) : null}
                                                    {showAuditReviewForAnswer(subAns) ? (
                                                      <AuditAnswerReviewPanel
                                                        projectId={projectId || ''}
                                                        question={q}
                                                        answer={subAns}
                                                        dateLocale={assignmentEmailDateLocale}
                                                        labels={auditReviewLabels}
                                                        savingNote={
                                                          savingReviewCommentAnswerId ===
                                                          subAns.id
                                                        }
                                                        onAddNote={handleAddAnswerReviewComment}
                                                        authorName={
                                                          currentUser?.name ||
                                                          user?.email ||
                                                          'Denetçi'
                                                        }
                                                        onReviewComplete={() => {
                                                          void loadProjectData();
                                                        }}
                                                      />
                                                    ) : null}
                                                    {(subAns.workflowStatusLog?.length ?? 0) >
                                                      0 && (
                                                      <div className="p-4 bg-slate-50 rounded-none border border-slate-200">
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                          <History size={12} />{' '}
                                                          {isOnBehalfEntry
                                                            ? t.projectDetail.recordHistoryTitle
                                                            : t.projectDetail
                                                                .workflowStatusLogTitle}
                                                        </p>
                                                        <ul className="space-y-2">
                                                          {[
                                                            ...(subAns.workflowStatusLog || []),
                                                          ]
                                                            .sort(
                                                              (a, b) =>
                                                                b.createdAt - a.createdAt,
                                                            )
                                                            .map((entry) => (
                                                              <li
                                                                key={entry.id}
                                                                className="text-xs text-slate-600 leading-relaxed font-medium"
                                                              >
                                                                {entry.text}
                                                              </li>
                                                            ))}
                                                        </ul>
                                                      </div>
                                                    )}
                                                    {subAns.comment ? (
                                                      <div className="p-4 bg-blue-50/50 rounded-none border border-blue-100/80">
                                                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                          <MessageSquare size={12} />{' '}
                                                          {t.projectDetail.clientNote}
                                                        </p>
                                                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                                          {subAns.comment}
                                                        </p>
                                                      </div>
                                                    ) : null}
                                                    {subAns.evidenceName ? (
                                                      <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-none border border-emerald-100">
                                                        <div className="p-2 bg-white rounded-none border border-emerald-100 shadow-none">
                                                          <Paperclip size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">
                                                            {t.projectDetail.evidenceFile}
                                                          </p>
                                                          <p className="text-xs font-bold truncate">
                                                            {subAns.evidenceName}
                                                          </p>
                                                        </div>
                                                        {subAns.latestFileUrl ? (
                                                          <a
                                                            href={subAns.latestFileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-bold underline hover:text-emerald-900 transition-colors bg-white/50 px-3 py-1 rounded-none border border-emerald-100"
                                                          >
                                                            {t.projectDetail.download}
                                                          </a>
                                                        ) : null}
                                                      </div>
                                                    ) : null}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : isAuditTab ? (
                                            <div className="rounded-md border border-dashed border-slate-200/80 bg-slate-50/50 px-3 py-2 text-xs italic text-slate-400">
                                              {t.projectDetail.auditUnansweredHint}
                                            </div>
                                          ) : isNotSentWithoutAssignment ? (
                                            <FormsNotSentQuestionCallout
                                              labels={t.projectDetail}
                                              showOnBehalfBtn={showOnBehalfBtn}
                                              showQuickAssignBtn={showQuickAssignBtn}
                                              quickAssignRecipientName={
                                                quickAssignRecipientName
                                              }
                                              onGoToAssignmentsTab={() =>
                                                setActiveTab('users')
                                              }
                                              onOnBehalf={() => {
                                                setOnBehalfModalPrefill(null);
                                                setOnBehalfModalQuestion(q);
                                              }}
                                              onQuickAssign={() =>
                                                setQuickAssignModal({
                                                  isOpen: true,
                                                  question: q,
                                                  existingAssignment:
                                                    openAssignmentForQuestion ?? null,
                                                })
                                              }
                                            />
                                          ) : isSentAwaitingResponse ? (
                                            <FormsWorkflowStatusBanner
                                              workflowState="sent_pending"
                                              pd={t.projectDetail}
                                              variant="forms"
                                              sentPendingInfo={sentPendingBannerInfo}
                                            />
                                          ) : (
                                            <div className="flex w-full items-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs italic text-slate-400">
                                              {emptyAnswerLabel}
                                            </div>
                                          )}
                                          </>
                                          )}

                                          {(() => {
                                            if (isNotSentWithoutAssignment) {
                                              return null;
                                            }

                                            if (!showOnBehalfBtn && !showQuickAssignBtn && !showReassignBtn) {
                                              return null;
                                            }

                                            return (
                                              <div className="flex flex-wrap items-center justify-end gap-3">
                                                {showOnBehalfBtn ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setOnBehalfModalPrefill(null);
                                                      setOnBehalfModalQuestion(q);
                                                    }}
                                                    className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-100"
                                                  >
                                                    {t.projectDetail.enterResponseOnBehalf}
                                                  </button>
                                                ) : null}
                                                {showReassignBtn && sentAssignmentForQuestion ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setReassignSentModal({
                                                        isOpen: true,
                                                        question: q,
                                                        assignment: sentAssignmentForQuestion,
                                                        currentRecipientLabel:
                                                          sentPendingBannerInfo?.recipientName ||
                                                          resolveRecipientSentPendingDisplay(
                                                            sentAssignmentForQuestion.recipientId,
                                                            platformUsers || [],
                                                            contacts || [],
                                                          ),
                                                      })
                                                    }
                                                    className="inline-flex items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-violet-800 transition-colors hover:border-violet-300 hover:bg-violet-100"
                                                  >
                                                    {t.projectDetail.reassignSentAssignmentButton}
                                                  </button>
                                                ) : null}
                                                {showQuickAssignBtn ? (
                                                  <button
                                                    type="button"
                                                    title={
                                                      quickAssignRecipientName
                                                        ? t.projectDetail
                                                            .quickAssignOpenButtonNamedTooltip
                                                        : undefined
                                                    }
                                                    onClick={() =>
                                                      setQuickAssignModal({
                                                        isOpen: true,
                                                        question: q,
                                                        existingAssignment:
                                                          openAssignmentForQuestion ?? null,
                                                      })
                                                    }
                                                    className="inline-flex items-center justify-center rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-green-800 transition-colors hover:border-green-300 hover:bg-green-100"
                                                  >
                                                    {quickAssignRecipientName
                                                      ? t.projectDetail.quickAssignOpenButtonNamed.replace(
                                                          '{name}',
                                                          quickAssignRecipientName,
                                                        )
                                                      : t.projectDetail.quickAssignOpenButton}
                                                  </button>
                                                ) : null}
                                              </div>
                                            );
                                          })()}


                                          {(() => {
                                            if (activeTab === 'audit') return null;

                                            const options = workflowSelectOptions(
                                              workflowState,
                                              canPmReviewWorkflow,
                                              t.projectDetail,
                                              false,
                                            );
                                            
                                            // Hide dropdown if only 1 option or if disabled
                                            if (options.length <= 1 || workflowSelectDisabled) {
                                              return null;
                                            }
                                            
                                            return (
                                              <div className="pt-1">
                                                <label className="sr-only">
                                                  {t.projectDetail.workflowStatusCustomerResponded}
                                                </label>
                                                <select
                                                  value={workflowState}
                                                  title={workflowSelectTitle}
                                                  disabled={workflowSelectDisabled}
                                                  onChange={(e) => {
                                                    void handleQuestionWorkflowChange(
                                                      q.id,
                                                      e.target.value as QuestionWorkflowStatus,
                                                    );
                                                  }}
                                                  className={cn(
                                                    'w-full max-w-md rounded-none border border-slate-200 bg-white py-2 pl-3 pr-8 text-[9px] font-bold uppercase tracking-widest text-slate-700 shadow-none focus:outline-none focus:ring-1 focus:ring-slate-400',
                                                    workflowSelectDisabled &&
                                                      'cursor-not-allowed opacity-80',
                                                    (workflowState as QuestionWorkflowStatus) === 'sent_back' &&
                                                      'border-amber-200 bg-amber-50/80 text-amber-900',
                                                    (workflowState as QuestionWorkflowStatus) === 'approved' &&
                                                      'border-emerald-200 bg-emerald-50/90 text-emerald-900',
                                                  )}
                                                >
                                                  {options.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                      {opt.label}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                            );
                                          })()}
                                          </>
                                          )
                                          ) : null}
                                        </div>
                                      );

                                    })}
                                </div>
                                )}
                              </div>
                              );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'plan' ? (
          <ProjectPlanTab
            projectId={projectId!}
            project={project}
            assignments={assignments}
            questions={questions}
            answers={answers}
            pages={pages}
            platformUsers={platformUsers}
            contacts={contacts}
            getPlatformRoleLabel={getPlatformRoleLabel}
            onOpenTasks={goToTasksForProject}
          />
        ) : activeTab === 'compliance' ? (
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <div className="w-full max-w-6xl">
              {project && <ComplianceTab project={project} />}
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/40">
            <div className="w-full space-y-3">
              <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-slate-700" />
                    <h2 className="text-lg font-bold text-slate-900">{t.projectDetail.usersAndAssignments}</h2>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{t.projectDetail.usersAndAssignmentsSubtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsHelpModalOpen(true)}
                    className="rounded-lg border border-transparent p-1.5 text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-900"
                    title={t.projectDetail.helpTutorial}
                  >
                    <HelpCircle size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pb-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative group min-w-0 flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-700" size={14} />
                  <input
                    type="text"
                    placeholder={t.projectDetail.searchUsers}
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {canExportSubmissions && (
                    <button
                      type="button"
                      onClick={handleExportSubmissions}
                      className="minimal-button-secondary !py-2 px-4 flex items-center gap-2 h-10"
                      title={t.projectDetail.exportSubmissions}
                    >
                      <Download size={14} /> {t.projectDetail.exportSubmissions}
                    </button>
                  )}
                  {isProjectAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          clearTempAvatar();
                          setEditingPlatformUser(null);
                          setNewPlatformUserRole('consultant');
                          setShowNewPlatformUser(true);
                        }}
                        className="minimal-button-primary !py-2 px-6 flex items-center gap-2 h-10"
                      >
                        <Plus size={14} /> {t.projectDetail.newPlatformUser}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                {/* Section: Assigned */}
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Users size={12} className="text-slate-400" /> {t.projectDetail.assignedUsersTeamSection}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {(projectUserAssignments || [])
                      .filter((pu) => {
                        const u =
                          (platformUsers || []).find((x) => x.id === pu.userId) ||
                          (contacts || []).find((c) => c.id === pu.userId);
                        if (!u) return false;
                        const q = userSearchQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          (u.name || '').toLowerCase().includes(q) ||
                          (u.email || '').toLowerCase().includes(q)
                        );
                      })
                      .map((pu) => {
                        const u =
                          (platformUsers || []).find((user) => user.id === pu.userId) ||
                          (contacts || []).find((c) => c.id === pu.userId);
                        if (!u) return null;
                        const platformUser = (platformUsers || []).find((user) => user.id === u.id);
                        const recipientAssignments = (assignments || []).filter(
                          (a) => a.recipientId === u.id,
                        );
                        const removeUserBlocked = recipientAssignments.length > 0;
                        const email = u.email || '';
                        const recipientType: 'user' | 'contact' = platformUser
                          ? 'user'
                          : 'contact';

                        // Get open assignments for this user
                        const userOpenAssignments = (assignments || []).filter(
                          (a) => a.recipientId === u.id && !a.sentAt && !a.deadline
                        );

                        return (
                          <div
                            key={`assigned-block-${pu.id}`}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="minimal-card overflow-hidden border-l-4 border-l-emerald-500 bg-white"
                          >
                            {platformUser && platformUser.role !== 'platform_admin' ? (
                              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                                <ProjectUserIdentity
                                  className="min-w-0 flex-1"
                                  compact
                                  name={platformUser.name}
                                  email={platformUser.email}
                                  roleLabel={getPlatformRoleLabel(platformUser.role)}
                                  roleSuffix={customerRoleSuffix(platformUser)}
                                  avatarUrl={platformUser.avatarUrl}
                                  stackedUserInfo
                                  roleLabelPrefix={t.projectDetail.userRoleLabelPrefix}
                                  editable={isProjectAdmin}
                                  onAvatarClick={() => openEditPlatformUser(platformUser)}
                                  avatarTitle={isProjectAdmin ? t.users.editUserTitle : undefined}
                                  avatarBadge={
                                    pu.role === 'admin' ? (
                                      <span
                                        className="absolute -top-1 -right-1 rounded-full border-2 border-white bg-yellow-400 p-0.5 text-white"
                                        title="Project Admin"
                                      >
                                        <Zap size={8} strokeWidth={4} />
                                      </span>
                                    ) : undefined
                                  }
                                  nameExtras={
                                    <>
                                      {pu.role === 'admin' && (
                                        <span className="shrink-0 rounded border border-yellow-100 bg-yellow-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-yellow-700">
                                          Project Admin
                                        </span>
                                      )}
                                      {platformUser.isConfirmed === false && (
                                        <span className="flex shrink-0 items-center gap-1 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                                          <Clock size={8} /> Unconfirmed
                                        </span>
                                      )}
                                    </>
                                  }
                                />
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                                  {isProjectAdmin && (
                                    <>
                                      {userOpenAssignments.length > 0 ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openMergeAssignmentsWizard(
                                              {
                                                id: platformUser.id,
                                                name: platformUser.name,
                                                email: platformUser.email,
                                                type: 'user',
                                              },
                                              userOpenAssignments,
                                              platformUser.id,
                                            )
                                          }
                                          className={cn(PROJECT_USER_ASSIGN_ACTION_BTN, '!px-2.5 !py-1.5')}
                                        >
                                          <AlertCircle
                                            size={13}
                                            className="shrink-0 text-blue-600"
                                            aria-hidden
                                          />
                                          {t.projectDetail.openAssignmentsMergeButton.replace(
                                            '{count}',
                                            String(userOpenAssignments.length),
                                          )}
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openQuestionAssignmentFor({
                                            id: platformUser.id,
                                            name: platformUser.name,
                                            email: platformUser.email,
                                            type: 'user',
                                          })
                                        }
                                        className={cn(PROJECT_USER_ASSIGN_ACTION_BTN, '!px-2.5 !py-1.5')}
                                      >
                                        <Mail size={13} className="shrink-0 text-blue-600" aria-hidden />
                                        {t.projectDetail.assignQuestionsShort}
                                      </button>
                                      {isProjectAdmin ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEditPlatformUser(platformUser);
                                          }}
                                          title={t.users.editUserTitle}
                                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50"
                                        >
                                          <Pencil size={14} strokeWidth={2} aria-hidden />
                                        </button>
                                      ) : null}
                                      <select
                                        value={projectMemberRoleForSelect(pu.role)}
                                        onChange={(e) =>
                                          handleProjectMemberRoleSelectChange(
                                            pu.id,
                                            e.target.value,
                                          )
                                        }
                                        className="cursor-pointer rounded-md border-none bg-slate-50 p-1.5 text-[10px] font-bold uppercase tracking-wide focus:ring-0 hover:bg-slate-100"
                                      >
                                        <optgroup label={t.projectDetail.projectRolesGroup}>
                                          {projectMemberRoleSelectOptions.map((roleOpt) => (
                                            <option key={roleOpt.value} value={roleOpt.value}>
                                              {roleOpt.label}
                                            </option>
                                          ))}
                                        </optgroup>
                                        {!removeUserBlocked ? (
                                          <optgroup
                                            label={t.projectDetail.removeFromProjectGroup}
                                          >
                                            <option
                                              value={REMOVE_FROM_PROJECT_SELECT_VALUE}
                                            >
                                              {t.users.removeFromProject}
                                            </option>
                                          </optgroup>
                                        ) : null}
                                      </select>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : !platformUser ? (
                              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                                <ProjectUserIdentity
                                  className="min-w-0 flex-1"
                                  compact
                                  name={u.name}
                                  email={email}
                                  roleLabel={t.projectDetail.customerContact}
                                  roleSuffix={resolveCustomerName(
                                    'customerId' in u ? u.customerId : project?.customerId,
                                  )}
                                  avatarUrl={
                                    (platformUsers || []).find((pu) =>
                                      platformUserLinkedToStakeholderContact(pu, {
                                        id: u.id,
                                        email: u.email,
                                      }),
                                    )?.avatarUrl
                                  }
                                  stackedUserInfo
                                  roleLabelPrefix={t.projectDetail.userRoleLabelPrefix}
                                />
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                                  {isProjectAdmin && (
                                    <>
                                      {userOpenAssignments.length > 0 ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openMergeAssignmentsWizard(
                                              {
                                                id: u.id,
                                                name: u.name,
                                                email,
                                                type: 'contact',
                                              },
                                              userOpenAssignments,
                                              u.id,
                                            )
                                          }
                                          className={cn(PROJECT_USER_ASSIGN_ACTION_BTN, '!px-2.5 !py-1.5')}
                                        >
                                          <AlertCircle
                                            size={13}
                                            className="shrink-0 text-blue-600"
                                            aria-hidden
                                          />
                                          {t.projectDetail.openAssignmentsMergeButton.replace(
                                            '{count}',
                                            String(userOpenAssignments.length),
                                          )}
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openQuestionAssignmentFor({
                                            id: u.id,
                                            name: u.name,
                                            email,
                                            type: 'contact',
                                          })
                                        }
                                        className={cn(PROJECT_USER_ASSIGN_ACTION_BTN, '!px-2.5 !py-1.5')}
                                      >
                                        <Mail size={13} className="shrink-0 text-blue-600" aria-hidden />
                                        {t.projectDetail.assignQuestionsShort}
                                      </button>
                                      {!removeUserBlocked ? (
                                        <select
                                          value=""
                                          onChange={(e) =>
                                            handleProjectMemberRoleSelectChange(
                                              pu.id,
                                              e.target.value,
                                            )
                                          }
                                          className="text-[10px] font-bold uppercase tracking-widest bg-slate-50 border-none rounded-lg p-2 focus:ring-0 cursor-pointer hover:bg-slate-100 transition-colors text-red-600"
                                          aria-label={t.users.removeFromProject}
                                        >
                                          <option value="" disabled hidden>
                                            ⋯
                                          </option>
                                          <optgroup
                                            label={t.projectDetail.removeFromProjectGroup}
                                          >
                                            <option
                                              value={REMOVE_FROM_PROJECT_SELECT_VALUE}
                                            >
                                              {t.users.removeFromProject}
                                            </option>
                                          </optgroup>
                                        </select>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : null}

                            <RecipientAssigneeNoticeBanner
                              recipientAssignments={recipientAssignments}
                              questions={questions || []}
                              answers={answers || []}
                              labels={assigneeNoticeLabels}
                              dateLocale={assignmentEmailDateLocale}
                              onReassignQuestion={(assignment, question) =>
                                setReassignSentModal({
                                  isOpen: true,
                                  question,
                                  assignment,
                                  currentRecipientLabel: resolveRecipientSentPendingDisplay(
                                    assignment.recipientId,
                                    platformUsers || [],
                                    contacts || [],
                                  ),
                                })
                              }
                            />
                            <RecipientAssignmentSummary
                              recipientAssignments={recipientAssignments}
                              questions={questions || []}
                              answers={answers || []}
                              labels={assignmentSummaryLabels}
                            />
                            <RecipientQuestionAssignments
                              recipientAssignments={recipientAssignments}
                              questions={questions || []}
                              answers={answers || []}
                              recipientId={u.id}
                              isProjectAdmin={isProjectAdmin}
                              canManageAssignmentDates={canManageAssignmentDates}
                              labels={assignmentRowLabels}
                              onEditAssignment={(assignment) => {
                                const beginDate = assignment.beginDate
                                  ? new Date(assignment.beginDate).toISOString().split('T')[0]
                                  : new Date().toISOString().split('T')[0];
                                const deadline = assignment.deadline
                                  ? new Date(assignment.deadline).toISOString().split('T')[0]
                                  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                      .toISOString()
                                      .split('T')[0];
                                setAssignmentModal({
                                  isOpen: true,
                                  recipient: {
                                    id: u.id,
                                    name: u.name,
                                    email,
                                    type: recipientType,
                                  },
                                  selectedQuestions: assignment.questionIds,
                                  beginDate,
                                  deadline,
                                  urgency: normalizeAssignmentUrgency(assignment.urgency),
                                  approver: assignment.approverId
                                    ? {
                                        id: assignment.approverId,
                                        name:
                                          (platformUsers || []).find(
                                            (pu) => pu.id === assignment.approverId,
                                          )?.name ||
                                          (contacts || []).find(
                                            (c) => c.id === assignment.approverId,
                                          )?.name ||
                                          assignment.approverId,
                                        email:
                                          (platformUsers || []).find(
                                            (pu) => pu.id === assignment.approverId,
                                          )?.email ||
                                          (contacts || []).find(
                                            (c) => c.id === assignment.approverId,
                                          )?.email ||
                                          '',
                                        type: (assignment.approverType || 'user') as
                                          | 'user'
                                          | 'contact',
                                      }
                                    : null,
                                  initialBeginDate: beginDate,
                                  initialDeadline: deadline,
                                  editingAssignmentId: assignment.id,
                                  message: assignment.message || '',
                                  stage: 'select',
                                  emailSubject: '',
                                  emailMainBody: '',
                                  emailSignoff: '',
                                  mergeFlow: false,
                                  openAssignmentsToMerge: [],
                                  mergeSelectedAssignmentIds: [],
                                });
                              }}
                              onDeleteAssignment={(assignment) => {
                                if (
                                  assignmentHasSubstantiveAnswers(
                                    assignment,
                                    answers || [],
                                    u.id,
                                  )
                                ) {
                                  return;
                                }
                                setDeleteAssignmentConfirm({
                                  isOpen: true,
                                  assignment,
                                  recipientName: u.name,
                                });
                              }}
                              onResendAssignmentEmail={handleResendAssignmentEmail}
                            />
                          </div>
                        );
                      })}
                    {projectUserAssignments.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-4">{t.projectDetail.noUsersAssigned}</p>
                    )}
                  </div>
                </div>
                
                {/* Section: Contacts with Open Assignments */}
                {(() => {
                  // Find all open assignments
                  const openAssignments = (assignments || []).filter(
                    (a) => !a.sentAt && !a.deadline
                  );
                  
                  // Get recipient IDs that are NOT in projectUserAssignments
                  const assignedUserIds = new Set(
                    (projectUserAssignments || []).map((pu) => pu.userId)
                  );
                  
                  const openAssignmentContacts = openAssignments
                    .filter((a) => !assignedUserIds.has(a.recipientId))
                    .reduce((acc, a) => {
                      if (!acc.some((item) => item.recipientId === a.recipientId)) {
                        const contact = (contacts || []).find((c) => c.id === a.recipientId);
                        const platformUser = (platformUsers || []).find((u) => u.id === a.recipientId);
                        if (contact || platformUser) {
                          acc.push({
                            recipientId: a.recipientId,
                            user: platformUser || contact,
                            assignments: openAssignments.filter((oa) => oa.recipientId === a.recipientId),
                          });
                        }
                      }
                      return acc;
                    }, [] as Array<{ recipientId: string; user: any; assignments: Assignment[] }>);

                  if (openAssignmentContacts.length === 0) return null;

                  return (
                    <>
                      <div className="h-px bg-slate-100 mx-1" />
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                          <AlertCircle size={12} className="text-amber-600" /> Açık Atamalı Kişiler
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          {openAssignmentContacts.map(({ recipientId, user, assignments: userAssignments }) => {
                            const totalQuestions = userAssignments.reduce(
                              (sum, a) => sum + (a.questionIds?.length || 0),
                              0
                            );

                            return (
                              <div
                                key={`open-contact-${recipientId}`}
                                className="space-y-2"
                              >
                                <div className="minimal-card p-4 bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 group">
                                  <ProjectUserIdentity
                                    className="min-w-0 flex-1"
                                    name={user.name}
                                    email={user.email || ''}
                                    roleLabel="Açık Atama"
                                    avatarUrl={user.avatarUrl}
                                    stackedUserInfo
                                    roleLabelPrefix={t.projectDetail.userRoleLabelPrefix}
                                  />
                                  <div className="text-xs text-amber-800 font-semibold">
                                    {userAssignments.length} atama • {totalQuestions} soru
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const recipientType = (platformUsers || []).some(
                                      (pu) => pu.id === recipientId,
                                    )
                                      ? ('user' as const)
                                      : ('contact' as const);
                                    openMergeAssignmentsWizard(
                                      {
                                        id: recipientId,
                                        name: user.name,
                                        email: user.email || '',
                                        type: recipientType,
                                      },
                                      userAssignments,
                                      recipientId,
                                    );
                                  }}
                                  className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-900 transition-all hover:bg-amber-100 flex items-center justify-center gap-2"
                                >
                                  <AlertCircle size={14} className="text-amber-600" />
                                  Açık Atamaları Birleştir ve Email Gönder
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="h-px bg-slate-100 mx-1" />

                {/* Section: Not Assigned */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Users size={12} className="text-slate-400" /> {t.projectDetail.notAssignedTitle}
                  </h3>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {t.projectDetail.notAssignedPlatformUsersHeading}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {unassignedPlatformUsersForProject.map((u) => (
                        <div
                          key={`unassigned-u-${u.id}`}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="minimal-card group relative flex items-center justify-between gap-3 overflow-hidden bg-white px-3 py-2.5"
                        >
                          <ProjectUserCardRoleWatermark
                            variant="platform"
                            platformRole={u.role}
                          />
                          <div className="relative z-10 flex min-w-0 flex-1 items-center justify-between gap-4">
                            <ProjectUserIdentity
                              className="min-w-0 flex-1"
                              compact
                              name={u.name}
                              email={u.email}
                              roleLabel={getPlatformRoleLabel(u.role)}
                              roleSuffix={customerRoleSuffix(u)}
                              avatarUrl={u.avatarUrl}
                              stackedUserInfo
                              roleLabelPrefix={t.projectDetail.userRoleLabelPrefix}
                              editable={isProjectAdmin}
                              onAvatarClick={() => openEditPlatformUser(u)}
                              avatarTitle={isProjectAdmin ? t.users.editUserTitle : undefined}
                            />

                            {isPlatformAdmin ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditPlatformUser(u);
                                }}
                                title={t.users.editUserTitle}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50"
                              >
                                <Pencil size={14} strokeWidth={2} aria-hidden />
                              </button>
                            ) : null}

                            {isProjectAdmin ? (
                              <button
                                type="button"
                                onClick={() => void handleAssignUser(u.id)}
                                className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-900 transition-all hover:border-slate-900 hover:bg-slate-50"
                              >
                                {t.projectDetail.addToProject}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {t.projectDetail.notAssignedCustomerStakeholdersHeading}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {unassignedCustomerStakeholders.map(({ contact: c, linkedPlatformUser }) => {
                        const linkedPlatformUserCustomerMismatch =
                          linkedPlatformUser &&
                          platformUserCustomerIdMismatchForProject(
                            linkedPlatformUser,
                            project?.customerId,
                          );
                        return (
                          <div
                            key={`unassigned-c-${c.id}`}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="minimal-card group relative flex flex-col gap-2 overflow-hidden border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <ProjectUserCardRoleWatermark variant="stakeholder" />
                            <div className="relative z-10 min-w-0 flex-1">
                              <ProjectUserIdentity
                                className="min-w-0 flex-1"
                                compact
                                name={c.name}
                                email={c.email}
                                roleLabel={
                                  linkedPlatformUser
                                    ? linkedPlatformUserCustomerMismatch
                                      ? t.projectDetail.stakeholderPlatformUserWrongCustomerRoleLabel
                                      : t.projectDetail.stakeholderPlatformUserRoleLabel
                                    : t.projectDetail.customerStakeholderRoleLabel
                                }
                                roleSuffix={
                                  linkedPlatformUser
                                    ? undefined
                                    : resolveCustomerName(c.customerId)
                                }
                                roleLabelClassName={
                                  linkedPlatformUser ? 'text-red-600' : undefined
                                }
                                avatarUrl={linkedPlatformUser?.avatarUrl}
                                stackedUserInfo
                                roleLabelPrefix={t.projectDetail.userRoleLabelPrefix}
                              />
                            </div>

                            {isProjectAdmin ? (
                              <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingStakeholderContact(c)}
                                  title={t.customers.editStakeholderTooltip}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50"
                                >
                                  <Pencil size={16} strokeWidth={2} aria-hidden />
                                </button>
                                {!linkedPlatformUser ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleAssignUser(c.id)}
                                    className="rounded-lg border border-slate-200 px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-slate-900 hover:bg-white hover:text-slate-900"
                                  >
                                    {t.projectDetail.addToProject}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {unassignedPlatformUsersForProject.length === 0 &&
                  unassignedCustomerStakeholders.length === 0 ? (
                    <p className="py-2 text-xs italic text-slate-400">
                      {t.projectDetail.noUnassignedUsers}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVITY Tab */
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            <div className="w-full space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                    <History size={20} className="text-slate-900" />
                  </div>
                  <h2 className="text-xl font-bold font-display text-slate-900">
                    {isServiceProject ? t.projectDetail.serviceActivities : t.projectDetail.projectActivities}
                  </h2>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-slate-500 text-[11px]">{t.projectDetail.activitiesSubtitle}</p>
                  <button 
                    onClick={() => setIsHelpModalOpen(true)}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100"
                    title={t.projectDetail.helpTutorial}
                  >
                    <HelpCircle size={18} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="flex min-w-[min(100%,14rem)] flex-1 flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {t.projectDetail.activityFilterPerson}
                  </span>
                  <select
                    value={activityFilterUserId}
                    onChange={(e) => setActivityFilterUserId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="all">{t.projectDetail.activityFilterAllPeople}</option>
                    {activityFilterOptions.people.map(([id, name]) => (
                      <option key={`activity-person-${id}`} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-[min(100%,14rem)] flex-1 flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {t.projectDetail.activityFilterPeriod}
                  </span>
                  <select
                    value={activityFilterMonthKey}
                    onChange={(e) => setActivityFilterMonthKey(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="all">{t.projectDetail.activityFilterAllPeriods}</option>
                    {activityFilterOptions.months.map(([key, label]) => (
                      <option key={`activity-month-${key}`} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {(activityFilterUserId !== 'all' || activityFilterMonthKey !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setActivityFilterUserId('all');
                      setActivityFilterMonthKey('all');
                    }}
                    className="minimal-button-secondary flex items-center gap-2 self-end py-2 px-3 text-[10px]"
                  >
                    <X size={12} />
                    {t.projectDetail.activityFilterClear}
                  </button>
                )}
              </div>

              <div className="relative">
                <div
                  className="pointer-events-none absolute bottom-2 left-[4.5rem] top-2 w-px bg-slate-200"
                  aria-hidden
                />
                {sortedAuditLogs.length === 0 ? (
                  <div className="ml-[4.5rem] rounded-2xl border-2 border-dashed border-slate-100 bg-white py-20 text-center">
                     <History size={40} className="mx-auto mb-4 text-slate-200" />
                     <p className="font-medium text-slate-500">{t.projectDetail.noActivityRecorded}</p>
                  </div>
                ) : filteredAuditLogs.length === 0 ? (
                  <div className="ml-[4.5rem] rounded-2xl border-2 border-dashed border-slate-100 bg-white py-16 text-center">
                    <Filter size={32} className="mx-auto mb-3 text-slate-200" />
                    <p className="font-medium text-slate-500">
                      {t.projectDetail.activityFilterNoMatch}
                    </p>
                  </div>
                ) : (
                  filteredAuditLogs.map((log, idx) => {
                    const showMonthLabel =
                      idx === 0 ||
                      auditLogMonthKey(log.timestamp) !==
                        auditLogMonthKey(filteredAuditLogs[idx - 1].timestamp);
                    const actor = platformUsers.find((u) => u.id === log.userId);
                    const displayName = log.userName || actor?.name || t.projectDetail.unknown;
                    const avatarUrl = actor?.avatarUrl;

                    return (
                      <div
                        key={`log-full-${log.id}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-0 py-4"
                      >
                        <div className="flex items-start justify-end pr-2 pt-5">
                          {showMonthLabel ? (
                            <span className="max-w-full text-right text-[9px] font-bold uppercase leading-tight tracking-wide text-slate-400">
                              {auditLogMonthLabel(log.timestamp, assignmentEmailDateLocale)}
                            </span>
                          ) : null}
                        </div>
                        <div className="relative pl-8">
                          <div
                            className="absolute left-0 top-6 z-10 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-white bg-slate-400"
                            aria-hidden
                          />
                          <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-200">
                            <div className="relative shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-slate-500">
                                    {personInitials(displayName)}
                                  </span>
                                )}
                              </div>
                              <span
                                className={cn(
                                  'absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-md border border-white text-white shadow-sm',
                                  log.action === 'create'
                                    ? 'bg-emerald-500'
                                    : log.action === 'update'
                                      ? 'bg-blue-500'
                                      : 'bg-red-500',
                                )}
                                aria-hidden
                              >
                                {log.action === 'create' ? (
                                  <Plus size={10} strokeWidth={2.5} />
                                ) : log.action === 'update' ? (
                                  <Settings size={10} strokeWidth={2.5} />
                                ) : (
                                  <Trash2 size={10} strokeWidth={2.5} />
                                )}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900">{log.details}</p>
                                  <p className="mt-1 text-[10px] font-bold uppercase tracking-tight text-slate-400">
                                    {t.projectDetail.by} {displayName} • {log.userEmail}
                                  </p>
                                </div>
                                <span className="shrink-0 whitespace-nowrap rounded bg-slate-50 px-2 py-1 text-[10px] text-slate-400">
                                  {new Date(log.timestamp).toLocaleString(
                                    assignmentEmailDateLocale,
                                    { dateStyle: 'medium', timeStyle: 'short' },
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Assignment Modal */}
      <AnimatePresence>
        {assignmentModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAssignmentModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <div 
              initial={{ opacity: 0, scale: 0.98, y: 16 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 16 }}
              className="relative flex w-full max-w-[min(1400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_90px_-24px_rgba(15,23,42,0.45)] max-h-[min(92vh,1080px)] sm:rounded-3xl"
            >
              {/* Modal Header */}
              <div className="flex shrink-0 flex-col gap-0 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md sm:h-12 sm:w-12">
                      <Send size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                        {t.projectDetail.assignQuestionsTo.replace(
                          '{name}',
                          assignmentModal.recipient?.name || '',
                        )}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs font-mono break-all">
                        {t.projectDetail.assignModalReferenceLine.replace(
                          '{ref}',
                          assignmentModal.message?.trim() || '—',
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignmentModal((prev) => ({ ...prev, isOpen: false }))}
                    className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    aria-label={t.common.cancel}
                  >
                    <X size={22} />
                  </button>
                </div>

                {/* Wizard steps: icons + chevrons (under title) */}
                <div className="flex flex-wrap items-center gap-x-1 gap-y-3 border-t border-slate-100/80 px-4 py-3.5 sm:px-8 sm:py-4">
                  {(
                    assignmentModal.mergeFlow
                      ? [
                          {
                            id: 'merge' as const,
                            Icon: ClipboardList,
                            label: t.projectDetail.assignQuestionsStepScope.replace(
                              '{label}',
                              t.projectDetail.scope,
                            ),
                          },
                          {
                            id: 'draft' as const,
                            Icon: Mail,
                            label: t.projectDetail.assignQuestionsStepEmail.replace(
                              '{label}',
                              t.projectDetail.email,
                            ),
                          },
                          {
                            id: 'link' as const,
                            Icon: Link2,
                            label: t.projectDetail.assignQuestionsStepLink.replace(
                              '{label}',
                              t.projectDetail.link,
                            ),
                          },
                        ]
                      : [
                          {
                            id: 'select' as const,
                            Icon: ClipboardList,
                            label: t.projectDetail.assignQuestionsStepScope.replace(
                              '{label}',
                              t.projectDetail.scope,
                            ),
                          },
                          {
                            id: 'draft' as const,
                            Icon: Mail,
                            label: t.projectDetail.assignQuestionsStepEmail.replace(
                              '{label}',
                              t.projectDetail.email,
                            ),
                          },
                          {
                            id: 'link' as const,
                            Icon: Link2,
                            label: t.projectDetail.assignQuestionsStepLink.replace(
                              '{label}',
                              t.projectDetail.link,
                            ),
                          },
                        ]
                  ).map((step, idx) => {
                    const stepIdx = assignmentModal.mergeFlow
                      ? assignmentModal.stage === 'merge'
                        ? 0
                        : assignmentModal.stage === 'draft'
                          ? 1
                          : 2
                      : assignmentModal.stage === 'select'
                        ? 0
                        : assignmentModal.stage === 'draft'
                          ? 1
                          : 2;
                    const active = idx === stepIdx;
                    const done = idx < stepIdx;
                    const StepIcon = step.Icon;
                    return (
                      <Fragment key={step.id}>
                        {idx > 0 ? (
                          <ChevronRight
                            className="mx-0.5 h-5 w-5 shrink-0 text-slate-300 sm:mx-1"
                            strokeWidth={2}
                            aria-hidden
                          />
                        ) : null}
                        <div
                          className={cn(
                            'flex min-w-0 max-w-[11rem] items-center gap-2 rounded-xl border px-2.5 py-2 sm:max-w-none sm:gap-2.5 sm:px-3 sm:py-2.5',
                            active
                              ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                              : done
                                ? 'border-emerald-200 bg-emerald-50/90 text-emerald-900'
                                : 'border-slate-200 bg-white text-slate-500',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                              active
                                ? 'border-white/30 bg-white/15 text-white'
                                : done
                                  ? 'border-emerald-300 bg-white text-emerald-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-400',
                            )}
                          >
                            {done ? (
                              <CheckCircle2 size={18} strokeWidth={2} />
                            ) : (
                              <StepIcon size={18} strokeWidth={2} />
                            )}
                          </span>
                          <span
                            className={cn(
                              'min-w-0 text-[9px] font-bold uppercase leading-tight tracking-wide sm:text-[10px] sm:tracking-widest',
                              active ? 'text-white' : done ? 'text-emerald-900' : 'text-slate-500',
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Modal Body */}
              <div
                className={cn(
                  'custom-scrollbar min-h-0 flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9',
                  assignmentModal.stage === 'select' ||
                  assignmentModal.stage === 'merge'
                    ? 'flex min-h-0 flex-col overflow-hidden'
                    : 'overflow-y-auto',
                )}
              >
                {assignmentModal.stage === 'merge' ? (
                  <MergeAssignmentsStep
                    assignments={assignmentModal.openAssignmentsToMerge}
                    selectedAssignmentIds={assignmentModal.mergeSelectedAssignmentIds}
                    onToggleAssignment={(id) =>
                      setAssignmentModal((prev) => {
                        const selected = new Set(prev.mergeSelectedAssignmentIds);
                        if (selected.has(id)) selected.delete(id);
                        else selected.add(id);
                        const mergeSelectedAssignmentIds = [...selected];
                        const selectedSet = new Set(mergeSelectedAssignmentIds);
                        const selectedQuestions = [
                          ...new Set(
                            prev.openAssignmentsToMerge
                              .filter((a) => selectedSet.has(a.id))
                              .flatMap((a) => a.questionIds || []),
                          ),
                        ];
                        return {
                          ...prev,
                          mergeSelectedAssignmentIds,
                          selectedQuestions,
                        };
                      })
                    }
                    beginDate={assignmentModal.beginDate}
                    deadline={assignmentModal.deadline}
                    urgency={assignmentModal.urgency}
                    approverKey={
                      assignmentModal.approver
                        ? `${assignmentModal.approver.type}:${assignmentModal.approver.id}`
                        : ''
                    }
                    approverOptions={[
                      ...(projectPlatformUsers || [])
                        .filter((u) => u.role !== 'platform_admin')
                        .map((u) => ({
                          key: `user:${u.id}`,
                          label: `${u.name || u.email} (${u.email})`,
                        })),
                      ...(contacts || [])
                        .filter(
                          (c) =>
                            !project?.customerId || c.customerId === project.customerId,
                        )
                        .map((c) => ({
                          key: `contact:${c.id}`,
                          label: `${c.name || c.email} — ${t.tasks.stakeholder}`,
                        })),
                    ]}
                    onBeginDateChange={(beginDate) =>
                      setAssignmentModal((prev) => ({ ...prev, beginDate }))
                    }
                    onDeadlineChange={(deadline) =>
                      setAssignmentModal((prev) => ({ ...prev, deadline }))
                    }
                    onUrgencyChange={(urgency) =>
                      setAssignmentModal((prev) => ({ ...prev, urgency }))
                    }
                    onApproverChange={(raw) => {
                      if (!raw) {
                        setAssignmentModal((prev) => ({ ...prev, approver: null }));
                        return;
                      }
                      const [type, ...idParts] = raw.split(':');
                      const id = idParts.join(':');
                      const fromUser = (projectPlatformUsers || []).find((u) => u.id === id);
                      const fromContact = (contacts || []).find((c) => c.id === id);
                      const person = fromUser || fromContact;
                      if (!person) return;
                      setAssignmentModal((prev) => ({
                        ...prev,
                        approver: {
                          id,
                          name: person.name || person.email || id,
                          email: person.email || '',
                          type: type === 'contact' ? 'contact' : 'user',
                        },
                      }));
                    }}
                    questions={mergeModalQuestions}
                    recipientId={assignmentModal.mergeRecipientId}
                    contacts={contacts || []}
                    platformUsers={projectPlatformUsers}
                    disabled={processingMergeAssignment}
                  />
                ) : assignmentModal.stage === 'select' ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-x-auto overscroll-x-contain lg:flex-row lg:items-stretch lg:gap-10">
                    {/* Left: schedule + filters (sticky on horizontal scroll) */}
                    <div className="flex w-full max-w-full shrink-0 flex-col gap-6 bg-white lg:sticky lg:top-0 lg:left-0 lg:z-20 lg:max-h-[min(76vh,840px)] lg:w-[22rem] lg:min-w-[min(22rem,100%)] lg:self-start lg:overflow-y-auto lg:border-r lg:border-slate-100 lg:pr-8">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0 space-y-2">
                          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <Calendar size={12} className="shrink-0" />{' '}
                            <span className="truncate">{t.projectDetail.beginDate}</span>
                          </label>
                          <input 
                            type="date"
                            value={assignmentModal.beginDate}
                            onChange={(e) => setAssignmentModal(prev => ({ ...prev, beginDate: e.target.value }))}
                            className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-slate-900"
                          />
                        </div>
                        <div className="min-w-0 space-y-2">
                          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <Calendar size={12} className="shrink-0" />{' '}
                            <span className="truncate">{t.projectDetail.deadline}</span>
                          </label>
                          <input 
                            type="date"
                            value={assignmentModal.deadline}
                            onChange={(e) => setAssignmentModal(prev => ({ ...prev, deadline: e.target.value }))}
                            className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-slate-900"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          <Zap size={12} className="shrink-0" />
                          <span className="truncate">{t.projectDetail.urgencyLabel}</span>
                        </label>
                        <select
                          value={assignmentModal.urgency}
                          onChange={(e) =>
                            setAssignmentModal((prev) => ({
                              ...prev,
                              urgency: normalizeAssignmentUrgency(e.target.value),
                            }))
                          }
                          className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="normal">{t.projectDetail.urgencyNormal}</option>
                          <option value="urgent">{t.projectDetail.urgencyUrgent}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          <UserCheck size={12} className="shrink-0" />
                          <span className="truncate">{t.projectDetail.approverLabel}</span>
                        </label>
                        <select
                          value={
                            assignmentModal.approver
                              ? `${assignmentModal.approver.type}:${assignmentModal.approver.id}`
                              : ''
                          }
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (!raw) {
                              setAssignmentModal((prev) => ({ ...prev, approver: null }));
                              return;
                            }
                            const [type, ...idParts] = raw.split(':');
                            const id = idParts.join(':');
                            const fromUser = (projectPlatformUsers || []).find((u) => u.id === id);
                            const fromContact = (contacts || []).find((c) => c.id === id);
                            const person = fromUser || fromContact;
                            if (!person) return;
                            setAssignmentModal((prev) => ({
                              ...prev,
                              approver: {
                                id,
                                name: person.name || person.email || id,
                                email: person.email || '',
                                type: type === 'contact' ? 'contact' : 'user',
                              },
                            }));
                          }}
                          className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="">{t.projectDetail.approverSelectPlaceholder}</option>
                          {(projectPlatformUsers || [])
                            .filter((u) => u.role !== 'platform_admin')
                            .map((u) => (
                              <option key={`user:${u.id}`} value={`user:${u.id}`}>
                                {u.name || u.email} ({u.email})
                              </option>
                            ))}
                          {(contacts || [])
                            .filter(
                              (c) =>
                                !project?.customerId || c.customerId === project.customerId,
                            )
                            .map((c) => (
                              <option key={`contact:${c.id}`} value={`contact:${c.id}`}>
                                {c.name || c.email} — {t.tasks.stakeholder}
                              </option>
                            ))}
                        </select>
                      </div>
                      {assignmentModal.beginDate && assignmentModal.deadline && assignmentModal.beginDate > assignmentModal.deadline && (
                        <p className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-red-500">
                          <AlertCircle size={12} /> {t.projectDetail.beginDateBeforeDeadline}
                        </p>
                      )}

                      <div className="sticky top-0 z-10 space-y-3 rounded-xl border border-slate-200 bg-slate-50/95 p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          <Filter size={12} />
                          {t.projectDetail.assignQuestionsFilterSectionTitle}
                        </div>
                        <input
                          type="search"
                          value={assignQuestionSearch}
                          onChange={(e) => setAssignQuestionSearch(e.target.value)}
                          placeholder={t.projectDetail.assignQuestionsFilterPlaceholder}
                          className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs outline-none focus:ring-1 focus:ring-slate-900"
                        />
                        {assignModalPageOptions.length > 1 && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            {t.projectDetail.assignQuestionsFilterPage}
                          </label>
                          <select
                            value={assignQuestionPageId}
                            onChange={(e) => {
                              setAssignQuestionPageId(e.target.value);
                              setAssignQuestionBaslikKeys([]);
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs outline-none focus:ring-1 focus:ring-slate-900"
                          >
                            <option value="">{t.projectDetail.assignQuestionsAllPages}</option>
                            {assignModalPageOptions.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        )}
                        {assignModalBaslikChipOptions.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                {t.projectDetail.assignQuestionsFilterBaslik}
                              </label>
                              {assignQuestionBaslikKeys.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setAssignQuestionBaslikKeys([])}
                                  className="shrink-0 text-[9px] font-bold text-blue-600 hover:underline"
                                >
                                  {t.templates.fieldLabelAll}
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200/80 pb-2">
                              <button
                                type="button"
                                onClick={() => setAssignBaslikChipSort('label')}
                                className={cn(
                                  'text-[10px] font-bold transition-colors',
                                  assignBaslikChipSort === 'label'
                                    ? 'text-slate-900 underline decoration-slate-900 underline-offset-2'
                                    : 'text-slate-400 hover:text-slate-600',
                                )}
                              >
                                {t.projectDetail.assignBaslikSortByLabel}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAssignBaslikChipSort('code')}
                                className={cn(
                                  'text-[10px] font-bold transition-colors',
                                  assignBaslikChipSort === 'code'
                                    ? 'text-slate-900 underline decoration-slate-900 underline-offset-2'
                                    : 'text-slate-400 hover:text-slate-600',
                                )}
                              >
                                {t.projectDetail.assignBaslikSortByCode}
                              </button>
                            </div>
                            <div className="custom-scrollbar max-h-[min(28vh,280px)] overflow-y-auto pr-0.5">
                            <div
                              className="grid gap-1.5"
                              style={{
                                gridTemplateColumns:
                                  'repeat(auto-fit, minmax(min(100%, 10rem), 1fr))',
                              }}
                            >
                              {assignModalBaslikChipOptionsSorted.map(([key, label]) => {
                                const on = assignQuestionBaslikKeys.includes(key);
                                return (
                                  <button
                                    type="button"
                                    key={key}
                                    onClick={() =>
                                      setAssignQuestionBaslikKeys((prev) =>
                                        prev.includes(key)
                                          ? prev.filter((k) => k !== key)
                                          : [...prev, key],
                                      )
                                    }
                                    className={cn(
                                      'min-w-0 w-full justify-start text-left rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors',
                                      on
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                                    )}
                                  >
                                    <span className="block truncate">{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: question preview (grouped like questionnaire tab) */}
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-4 overflow-hidden">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {t.projectDetail.selectQuestions.replace(
                            '{count}',
                            String(assignmentModal.selectedQuestions?.length || 0),
                          )}
                        </label>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const ids = new Set(
                                filteredAssignableQuestions.map((q) => q.id),
                              );
                              setAssignmentModal((prev) => ({
                                ...prev,
                                selectedQuestions: [
                                  ...new Set([
                                    ...(prev.selectedQuestions || []),
                                    ...ids,
                                  ]),
                                ],
                              }));
                            }}
                            disabled={filteredAssignableQuestions.length === 0}
                            className="text-[10px] font-bold text-blue-600 hover:underline disabled:opacity-40 disabled:no-underline"
                          >
                            {t.projectDetail.assignQuestionsSelectVisible}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const drop = new Set(
                                filteredAssignableQuestions.map((q) => q.id),
                              );
                              setAssignmentModal((prev) => ({
                                ...prev,
                                selectedQuestions: (
                                  prev.selectedQuestions || []
                                ).filter((id) => !drop.has(id)),
                              }));
                            }}
                            disabled={filteredAssignableQuestions.length === 0}
                            className="text-[10px] font-bold text-slate-500 hover:underline disabled:opacity-40 disabled:no-underline"
                          >
                            {t.projectDetail.assignQuestionsClearVisible}
                          </button>
                        </div>
                      </div>

                      <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 lg:min-h-[min(52vh,560px)]">
                        {assignModalQuestionsGrouped.length === 0 ? (
                          <p className="py-12 text-center text-sm text-slate-500">
                            {t.projectDetail.assignQuestionsNoMatch}
                          </p>
                        ) : (
                          assignModalQuestionsGrouped.map((group) => (
                            <div
                              key={group.key}
                              className="divide-y divide-slate-100 overflow-hidden border border-slate-200 bg-white shadow-sm"
                            >
                              <div className="bg-slate-50 px-4 py-2.5">
                                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 sm:text-[13px]">
                                  {group.label}
                                </h4>
                              </div>
                              {group.items.map((q) => {
                                const isSelected = (
                                  assignmentModal.selectedQuestions || []
                                ).includes(q.id);
                                return (
                                  <button
                                    type="button"
                                    key={q.id}
                                    onClick={() =>
                                      setAssignmentModal((prev) => ({
                                        ...prev,
                                        selectedQuestions: isSelected
                                          ? (prev.selectedQuestions || []).filter(
                                              (id) => id !== q.id,
                                            )
                                          : [...(prev.selectedQuestions || []), q.id],
                                      }))
                                    }
                                    className={cn(
                                      'flex w-full gap-4 p-4 text-left transition-colors',
                                      isSelected
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-white hover:bg-slate-50',
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                                        isSelected
                                          ? 'border-white bg-white text-slate-900'
                                          : 'border-slate-300 bg-white',
                                      )}
                                      aria-hidden
                                    >
                                      {isSelected && (
                                        <CheckCircle2 size={12} strokeWidth={3} />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <span
                                          className={cn(
                                            'text-[10px] font-bold uppercase tracking-wider',
                                            isSelected
                                              ? 'text-blue-200'
                                              : 'text-blue-500/50',
                                          )}
                                        >
                                          #{q.kod}
                                        </span>
                                      </div>
                                      <HelpMarkdown
                                        className={cn(
                                          isSelected && 'help-markdown--inverse',
                                        )}
                                        emptyFallback={
                                          <p className="italic opacity-70">—</p>
                                        }
                                      >
                                        {q.soru || ''}
                                      </HelpMarkdown>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : assignmentModal.stage === 'draft' ? (
                  <div className="mx-auto w-full max-w-4xl space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {t.projectDetail.assignModalEmailTo}
                      </label>
                      <input
                        type="email"
                        readOnly
                        value={assignmentModal.recipient?.email || ''}
                        className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-600 outline-none"
                      />
                    </div>

                    <div className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50 p-6 font-serif leading-relaxed text-slate-800 shadow-inner sm:p-8">
                      <div className="space-y-1.5">
                        <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {t.projectDetail.assignModalSubject}
                        </label>
                        <input
                          type="text"
                          value={assignmentModal.emailSubject}
                          onChange={(e) =>
                            setAssignmentModal((prev) => ({
                              ...prev,
                              emailSubject: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-sans text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>

                      <textarea
                        rows={10}
                        value={assignmentModal.emailMainBody}
                        onChange={(e) =>
                          setAssignmentModal((prev) => ({
                            ...prev,
                            emailMainBody: e.target.value,
                          }))
                        }
                        className="min-h-[220px] w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none focus:ring-2 focus:ring-slate-900"
                      />

                      <div className="py-1">
                        <span className="inline-block rounded-lg bg-slate-900 px-6 py-3 font-sans text-xs font-bold text-white">
                          {t.projectDetail.assignModalEmailButton}
                        </span>
                        {assignmentEmailPreviewLink ? (
                          <p className="mt-3 break-all font-mono text-[10px] leading-snug text-slate-500">
                            {assignmentEmailPreviewLink}
                          </p>
                        ) : (
                          <p className="mt-3 font-sans text-[10px] italic text-slate-400">
                            {t.projectDetail.assignModalMagicLinkPlaceholder}
                          </p>
                        )}
                      </div>

                      <div className="h-px bg-slate-200" />

                      <textarea
                        rows={3}
                        value={assignmentModal.emailSignoff}
                        onChange={(e) =>
                          setAssignmentModal((prev) => ({
                            ...prev,
                            emailSignoff: e.target.value,
                          }))
                        }
                        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-slate-800 outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto flex w-full max-w-3xl flex-col items-center space-y-6 py-8 text-center sm:py-12">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                      <Zap size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">{t.projectDetail.assignModalAssignmentFinalized}</h4>
                      <p className="text-sm text-slate-500 max-w-sm mb-2">
                        {assignmentModal.recipient?.type === 'contact' 
                          ? t.projectDetail.assignModalContactLinkGenerated.replace(
                              '{name}',
                              assignmentModal.recipient?.name || '',
                            )
                          : t.projectDetail.assignModalUserRecorded.replace(
                              '{name}',
                              assignmentModal.recipient?.name || '',
                            )
                        }
                      </p>
                      {assignmentModal.emailStatus && (
                        <div className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-2 mb-4 break-all",
                          isAssignmentEmailSuccessStatus(
                            assignmentModal.emailStatus,
                            t.projectDetail.emailSentSuccess,
                          )
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        )}>
                          <Mail size={12} className="shrink-0" /> 
                          <span>{assignmentModal.emailStatus}</span>
                        </div>
                      )}
                    </div>
                    {assignmentModal.generatedLink ? (
                      <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
                        <input
                          readOnly
                          value={assignmentModal.generatedLink}
                          className="flex-1 bg-transparent text-xs font-mono focus:outline-none select-all truncate text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(assignmentModal.generatedLink || '');
                            showAlert(
                              t.projectDetail.assignModalCopied,
                              t.projectDetail.assignModalLinkCopied,
                            );
                          }}
                          className="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-10 sm:py-5">
                {assignmentModal.stage === 'link' ? (
                  <button
                    type="button"
                    onClick={() =>
                      setAssignmentModal((prev) => ({ ...prev, isOpen: false }))
                    }
                    className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-900"
                  >
                    {t.projectDetail.assignModalClose}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (assignmentModal.stage === 'draft') {
                        setAssignmentModal((prev) => ({
                          ...prev,
                          stage: prev.mergeFlow ? 'merge' : 'select',
                        }));
                      } else {
                        setAssignmentModal((prev) => ({ ...prev, isOpen: false }));
                      }
                    }}
                    className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-900"
                  >
                    <ChevronLeft size={14} aria-hidden />
                    {t.projectDetail.assignModalBack}
                  </button>
                )}
                
                {assignmentModal.stage !== 'link' && (
                  <div className="flex items-center gap-2">
                    {assignmentModal.stage === 'select' &&
                    !assignmentModal.mergeFlow &&
                    assignmentModal.editingAssignmentId &&
                    (assignmentModal.beginDate !== assignmentModal.initialBeginDate ||
                      assignmentModal.deadline !== assignmentModal.initialDeadline) ? (
                      <button
                        type="button"
                        onClick={handleSaveAssignmentDates}
                        disabled={
                          savingAssignmentDates ||
                          (!!assignmentModal.beginDate &&
                            !!assignmentModal.deadline &&
                            assignmentModal.beginDate > assignmentModal.deadline)
                        }
                        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-emerald-800 shadow-sm transition-all hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {savingAssignmentDates ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Calendar size={14} />
                        )}
                        {t.projectDetail.saveAssignmentDates}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          assignmentModal.stage === 'select' ||
                          assignmentModal.stage === 'merge'
                        ) {
                          setAssignmentModal((prev) => {
                            const instructionsOrRef = prev.message || '';
                            const draft = buildDefaultAssignmentEmailDraft(
                              t.projectDetail,
                              {
                                recipientName: prev.recipient?.name || '',
                                projectName: project?.name || '',
                                questionCount: prev.selectedQuestions?.length || 0,
                                instructionsOrRef,
                                deadlineInput: prev.deadline,
                                dateLocale: assignmentEmailDateLocale,
                                urgency: prev.urgency,
                                status: 'pending',
                              },
                            );
                            return {
                              ...prev,
                              stage: 'draft',
                              message: prev.message,
                              emailSubject: draft.subject,
                              emailMainBody: composeAssignmentEmailMainBody(draft),
                              emailSignoff: composeAssignmentEmailSignoff(
                                draft.closing,
                                draft.teamSignoff,
                              ),
                            };
                          });
                        } else if (assignmentModal.mergeFlow) {
                          void handleProcessMergeAssignment();
                        } else {
                          void handleProcessAssignment();
                        }
                      }}
                      disabled={
                        processingAssignment ||
                        processingMergeAssignment ||
                        (assignmentModal.stage === 'merge' &&
                          (assignmentModal.mergeSelectedAssignmentIds.length === 0 ||
                            (!!assignmentModal.beginDate &&
                              !!assignmentModal.deadline &&
                              assignmentModal.beginDate > assignmentModal.deadline))) ||
                        (assignmentModal.stage === 'select' &&
                          ((assignmentModal.selectedQuestions?.length || 0) === 0 ||
                            (!!assignmentModal.beginDate &&
                              !!assignmentModal.deadline &&
                              assignmentModal.beginDate > assignmentModal.deadline))) ||
                        (assignmentModal.stage === 'draft' &&
                          ((assignmentModal.selectedQuestions?.length || 0) === 0 ||
                            !assignmentModal.emailSubject.trim() ||
                            !assignmentModal.emailMainBody.trim() ||
                            !assignmentModal.recipient?.email))
                      }
                      className="minimal-button-primary flex items-center gap-2 bg-slate-900 px-8 py-2.5 text-white shadow-lg disabled:opacity-50"
                    >
                      {processingAssignment || processingMergeAssignment ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {processingMergeAssignment
                            ? t.projectDetail.mergeProcessing
                            : t.projectDetail.assignModalProcessAssignment}
                        </>
                      ) : assignmentModal.stage === 'select' ||
                        assignmentModal.stage === 'merge' ? (
                        <>
                          {t.projectDetail.assignModalNextPreviewEmail}{' '}
                          <ArrowRight size={14} />
                        </>
                      ) : assignmentModal.mergeFlow ? (
                        <>
                          {t.projectDetail.mergeProcessAndSend.replace(
                            '{count}',
                            String(assignmentModal.mergeSelectedAssignmentIds.length),
                          )}{' '}
                          <Send size={14} />
                        </>
                      ) : (
                        <>
                          {t.projectDetail.assignModalProcessAssignment}{' '}
                          <Send size={14} />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteAssignmentConfirm.isOpen && deleteAssignmentConfirm.assignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteAssignmentConfirm({ isOpen: false, assignment: null, recipientName: '' })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Delete Assignment</h2>
                  <p className="text-slate-500 text-sm">Action cannot be undone.</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to delete the assignment for <span className="font-bold text-slate-900">"{deleteAssignmentConfirm.recipientName}"</span>?
                </p>
                
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100/50 flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-red-600 leading-tight">
                    This will permanently remove the assignment and any answers associated with it for this specific cycle.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setDeleteAssignmentConfirm({ isOpen: false, assignment: null, recipientName: '' })} 
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all text-xs uppercase tracking-widest border border-slate-100"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteAssignment} 
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 text-white shadow-lg shadow-red-100 hover:bg-red-700 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Delete Assignment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        onConfirm={modal.onConfirm}
        elevated={modal.type === 'confirm'}
      />

      {/* Rebuild Questionnaire Modal */}
      <Modal
        isOpen={showRebuildModal}
        onClose={() => !isRebuilding && setShowRebuildModal(false)}
        title={
          isServiceProject
            ? t.projectDetail.rebuildQuestionnaireModalTitleService
            : t.projectDetail.rebuildQuestionnaireModalTitle
        }
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
            <AlertTriangle className="text-amber-600 shrink-0" size={18} />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900">
                {t.projectDetail.rebuildQuestionnaireWarningTitle}
              </p>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                {isServiceProject
                  ? t.projectDetail.rebuildQuestionnaireWarningDescriptionService
                  : t.projectDetail.rebuildQuestionnaireWarningDescription}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {t.projectDetail.rebuildQuestionnaireSelectTemplate}
            </label>
            <select 
              value={selectedRebuildTemplateId}
              onChange={(e) => setSelectedRebuildTemplateId(e.target.value)}
              className="w-full bg-slate-50 border-slate-100 rounded-xl text-xs py-3 px-4 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
            >
              <option value="">{t.projectDetail.rebuildQuestionnaireSelectPlaceholder}</option>
              {rebuildTemplateOptions.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
            <button 
              onClick={() => setShowRebuildModal(false)}
              disabled={isRebuilding}
              className="px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
            >
              {t.common.cancel}
            </button>
            <button 
              onClick={handleRebuildQuestionnaire}
              disabled={isRebuilding || !selectedRebuildTemplateId}
              className="px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
            >
              {isRebuilding ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
              {t.projectDetail.rebuildQuestionnaireConfirm}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={pageSummaryModalOpen}
        onClose={() => !isDrafting && setPageSummaryModalOpen(false)}
        title={t.projectDetail.pageSummaryTitle}
        size="xl"
        showFooterClose={false}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {selectedPage?.draftLanguage &&
            selectedPage.draftLanguage !== lang && (
              <div
                className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                role="status"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                <p className="leading-relaxed font-medium">
                  {t.projectDetail.pageSummaryLanguageMismatch}
                </p>
              </div>
            )}
          {selectedPage?.draftContent ? (
            <div className="page-summary-markdown help-markdown rounded-xl border border-slate-100 bg-slate-50/60 p-6">
              <MarkdownContent>{selectedPage.draftContent}</MarkdownContent>
            </div>
          ) : (
            <p className="text-sm text-slate-500 leading-relaxed px-1">
              {t.projectDetail.pageSummaryEmpty}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPageSummaryModalOpen(false)}
              disabled={isDrafting}
              className="px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                showConfirm(
                  selectedPage?.draftContent
                    ? t.projectDetail.regenerateDraft
                    : t.projectDetail.generateSummary,
                  selectedPage?.draftContent
                    ? t.projectDetail.regenerateDraftDescription
                    : t.projectDetail.aiDraftDescription,
                  () => {
                    void handleGenerateDraft();
                  },
                );
              }}
              disabled={isDrafting || !selectedPage}
              className="px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center gap-2"
            >
              {isDrafting ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Zap size={14} />
              )}
              {selectedPage?.draftContent
                ? t.projectDetail.regenerateDraft
                : t.projectDetail.generateSummary}
            </button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {showNewPlatformUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md rounded-xl border border-slate-100 bg-white p-8 shadow-2xl"
            >
              <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">
                {t.common.inviteMember}
              </h2>
              <form onSubmit={(e) => void handleCreatePlatformUser(e)} className="space-y-5">
                <div className="mb-6 flex justify-center">
                  <div className="group relative">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                      {tempAvatarPreviewUrl ? (
                        <img
                          src={tempAvatarPreviewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Camera className="text-slate-300" size={24} />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => handleAvatarFileSelect(e.target.files?.[0])}
                    />
                    <div className="absolute -bottom-2 -right-2 rounded-lg border border-slate-100 bg-white p-1.5 text-slate-400 shadow-sm">
                      <Plus size={14} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {t.users.fullName}
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="minimal-input"
                    onBlur={(e) => {
                      e.target.value = formatPersonName(e.target.value);
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {t.users.emailAddress}
                  </label>
                  <input name="email" type="email" required className="minimal-input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      {t.common.department}
                    </label>
                    <input name="department" type="text" className="minimal-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      {t.common.role}
                    </label>
                    <select
                      name="role"
                      className="minimal-input"
                      defaultValue="consultant"
                      onChange={(e) => setNewPlatformUserRole(e.target.value)}
                    >
                      <option value="customer">{t.users.roles.customer}</option>
                      <option value="consultant">{t.users.roles.consultant}</option>
                      <option value="consultant_manager">{t.users.roles.consultant_manager}</option>
                      {isPlatformAdmin && (
                        <option value="platform_admin">{t.users.roles.platform_admin}</option>
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {t.common.language}
                  </label>
                  <select name="language" className="minimal-input" defaultValue="tr">
                    <option value="en">{t.common.english}</option>
                    <option value="tr">{t.common.turkish}</option>
                  </select>
                </div>
                {newPlatformUserRole === 'customer' && (
                  <div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-1.5"
                  >
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      {t.users.assignedCompany}
                    </label>
                    <select
                      name="customerId"
                      required
                      className="minimal-input"
                      defaultValue={project?.customerId || ''}
                    >
                      <option value="">—</option>
                      {platformUserCustomersSorted.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closePlatformUserModal}
                    className="minimal-button-secondary flex-1"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPlatformUser}
                    className="minimal-button-primary flex-1"
                  >
                    {isSubmittingPlatformUser ? t.users.inviting : t.users.invite}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      <EditStakeholderModal
        contact={editingStakeholderContact}
        customerId={project?.customerId}
        onClose={() => setEditingStakeholderContact(null)}
        onSaved={() => {
          if (project?.customerId) {
            void DB.contacts.listByCustomer(project.customerId).then((list) => {
              setContacts(uniqueById(list));
            });
          }
        }}
      />

      <EditPlatformUserModal
        user={editingPlatformUser}
        customers={platformUserCustomersSorted}
        isPlatformAdmin={isPlatformAdmin}
        projectId={projectId}
        projectDefaultCustomerId={project?.customerId}
        onClose={closePlatformUserModal}
        onSaved={(updated) => {
          setPlatformUsers((prev) =>
            prev.map((u) => (u.id === updated.id ? updated : u)),
          );
        }}
        showAlert={showAlert}
      />

      <MarkdownEditorModal
        isOpen={formsQuestionEditModal !== null}
        onClose={() => !isSavingFormsQuestion && setFormsQuestionEditModal(null)}
        markdown={formsQuestionEditModal?.draft ?? ''}
        onMarkdownChange={(value) =>
          setFormsQuestionEditModal((prev) => (prev ? { ...prev, draft: value } : prev))
        }
        onSave={() => void saveFormsQuestionSoru()}
        sourceMeta={
          formsQuestionEditModal?.questionId ? (
            <span className="font-mono font-semibold normal-case tracking-normal text-slate-500">
              {' '}
              ({formsQuestionEditModal.questionId})
            </span>
          ) : undefined
        }
        sourceDisabled={isSavingFormsQuestion}
        isSaving={isSavingFormsQuestion}
        pdfFileName={
          formsQuestionEditModal?.questionId
            ? `project-question-${formsQuestionEditModal.questionId}`
            : 'project-markdown'
        }
      />

      <QuestionGuidanceEditorModal
        isOpen={questionGuidanceEditModal !== null}
        onClose={() =>
          !isSavingQuestionGuidance && setQuestionGuidanceEditModal(null)
        }
        question={
          questionGuidanceEditModal
            ? {
                id: questionGuidanceEditModal.questionId,
                kod: questionGuidanceEditModal.draft.kod,
                baslik: questionGuidanceEditModal.draft.baslik,
              }
            : null
        }
        referenceContext={questionGuidanceReferenceContext}
        canOpenTemplateEditor={
          isPlatformAdmin && questionGuidanceReferenceContext !== null
        }
        pageOptions={(pages || []).map((p) => ({ id: p.id, title: p.title }))}
        domainOptions={(allDomains || []).map((d) => ({ id: d.id, name: d.name }))}
        draft={questionGuidanceEditModal?.draft ?? emptyQuestionGuidanceDraft}
        onDraftChange={(patch) =>
          setQuestionGuidanceEditModal((prev) =>
            prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev,
          )
        }
        onSave={() => void saveFormsQuestionGuidance()}
        onCopyQuestion={copyFormsQuestionGuidance}
        saveDisabled={isSavingQuestionGuidance}
        isSaving={isSavingQuestionGuidance}
        isCopying={isCopyingQuestionGuidance}
        showCopyQuestion={canCopyGuidanceQuestion}
      />

      <QuestionGuidanceMaterialsModal
        isOpen={formsGuidanceModalQuestion !== null}
        onClose={() => setFormsGuidanceModalQuestion(null)}
        questionTitle={
          formsGuidanceModalQuestion?.baslik?.trim() ||
          (formsGuidanceModalQuestion?.kod
            ? `#${formsGuidanceModalQuestion.kod}`
            : null)
        }
        questionText={formsGuidanceModalQuestion?.soru}
        aciklama={formsGuidanceModalQuestion?.aciklama}
        ornekYanit={formsGuidanceModalQuestion?.ornekYanit}
        videoUrl={formsGuidanceModalQuestion?.aciklamaVideoUrl}
        labels={guidanceMaterialsLabels}
      />

      {projectId && onBehalfModalQuestion ? (
        <OnBehalfResponseModal
          isOpen
          onClose={() => {
            setOnBehalfModalQuestion(null);
            setOnBehalfModalPrefill(null);
          }}
          projectId={projectId}
          question={onBehalfModalQuestion}
          mode={activeTab === 'audit' && canEditAuditForm ? 'audit' : 'customer'}
          prefill={onBehalfModalPrefill}
          contacts={contacts}
          projectUsers={projectPlatformUsers}
          onSaved={() => {
            setQuestionFormsWorkflowFilter('customer_responded');
            void loadProjectData();
          }}
        />
      ) : null}

      {projectId && quickAssignModal.question ? (
        <QuickAssignModal
          isOpen={quickAssignModal.isOpen}
          onClose={() =>
            setQuickAssignModal({ isOpen: false, question: null })
          }
          projectId={projectId}
          question={quickAssignModal.question}
          platformUsers={projectPlatformUsers}
          existingAssignment={quickAssignModal.existingAssignment}
          getRoleLabel={(u) => getPlatformRoleLabel(u.role)}
          getRoleSuffix={customerRoleSuffix}
          roleLabelPrefix={t.projectDetail.userRoleLabelPrefix}
          onSaved={() => {
            void loadProjectData();
          }}
        />
      ) : null}

      {projectId && reassignSentModal.assignment ? (
        <ReassignSentAssignmentModal
          isOpen={reassignSentModal.isOpen}
          onClose={() =>
            setReassignSentModal({
              isOpen: false,
              question: null,
              assignment: null,
              currentRecipientLabel: '',
            })
          }
          projectId={projectId}
          assignment={reassignSentModal.assignment}
          platformUsers={projectPlatformUsers}
          currentRecipientLabel={reassignSentModal.currentRecipientLabel}
          getRoleLabel={(u) => getPlatformRoleLabel(u.role)}
          getRoleSuffix={customerRoleSuffix}
          roleLabelPrefix={t.projectDetail.userRoleLabelPrefix}
          questionId={reassignSentModal.question?.id}
          questionLabel={
            reassignSentModal.question
              ? [reassignSentModal.question.kod, reassignSentModal.question.soru]
                  .filter(Boolean)
                  .join(' — ')
                  .slice(0, 160)
              : undefined
          }
          onSaved={() => {
            void loadProjectData();
          }}
        />
      ) : null}

    </div>
  );
}
