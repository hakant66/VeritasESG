/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Segment {
  id: string;
  name: string;
  type: string;
  icon?: string;
  createdAt: number;
}

export interface Template {
  id: string;
  name: string;
  sectorId: string; // Keeping field name for stability, but it refers to a Segment
  createdAt: number;
}

export type SectorCategoryType = 'sayisal' | 'sozel' | 'sasb' | 'gri' | 'other';

export interface SectorCategory {
  id: string;
  questionSetType: SectorCategoryType;
  numara?: number;
  kod: string;
  baslik: string;
  soru: string;

  // Core optional fields
  bolum?: string;
  firmaYaniti?: string;
  ilgiliBirim?: string;
  veriDogrulugu?: string;
  soruAciklama?: string;
  ornekYanit?: string;
  dayanak?: string;
  onay?: string;
  tesisBazinda?: string;
  ekZorunlu?: string;
  raporYeri?: string;
  reportingItr?: string;
  atananSayfa?: string;
  kayit?: string;

  // Type-specific metadata
  metadata?: Record<string, any>;

  order: number;
  createdAt?: number;
  updatedAt?: number;
}

export type TemplatePageKind = 'customer_question_set' | 'audit_question_set';

export interface TemplatePage {
  id: string;
  templateId: string;
  title: string;
  order: number;
  briefText: string;
  briefFileUrl?: string;
  /** Defaults to customer_question_set when omitted (legacy). */
  pageKind?: TemplatePageKind;
}

/** How the respondent should answer (stored on each question). */
export type QuestionAnswerFormat = 'textarea' | 'integer' | 'decimal';

/** Whether / how a question is duplicated per branch (`yok` = none). */
export type QuestionSoruCogaltma = 'yok' | 'sube_bazinda';

export interface Question {
  id: string;
  /** Legacy Firestore / import id when different from Mongo `id`. */
  legacyFirebaseId?: string;
  templateId: string;
  sectorId: string;
  pageId?: string;
  domainIds?: string[];
  bolum?: string;
  kod: string;
  baslik: string;
  soru: string;
  firmaYaniti?: string;
  /** Sayısal setler: cari yıl yanıtı (FİRMA_YANITI_YIL1). */
  firmaYanitiYil1?: string;
  /** Sayısal setler: geçen yıl yanıtı (FİRMA_YANITI_YIL2). */
  firmaYanitiYil2?: string;
  /** Sayısal setler: önceki yıl yanıtı (FİRMA_YANITI_YIL3). */
  firmaYanitiYil3?: string;
  /** Sayısal setler: firma notu (FİRMA_NOT). */
  firmaNot?: string;
  /** UI / legacy typo — use `readQuestionIlgiliBirim()` when loading from API. */
  ilgiliBirum: string;
  /** MongoDB canonical field name. */
  ilgiliBirim?: string;
  veriDogrulugu?: string;
  aciklama: string;
  /** Optional help video URL shown with question guidance. */
  aciklamaVideoUrl?: string;
  ornekYanit: string;
  dayanak?: string;
  onay?: string;
  raporYeri: string;
  reportingItr?: string;
  /** Framework cross-reference columns (spreadsheet TSRS 1, GRI, etc.). */
  tsrs1?: string;
  tsrs2?: string;
  sasbRtCh?: string;
  gri?: string;
  msci?: string;
  esrs?: string;
  /** Spreadsheet "KAYIT" column (free-text record note). */
  kayit?: string;
  /** Spreadsheet "NUMARA" column (row sequence within sheet; hidden in UI). */
  numara?: number;
  thematicGroup: string;
  isMandatory: boolean;
  order: number;
  /** Defaults to `textarea` when missing (legacy data). */
  answerFormat?: QuestionAnswerFormat;
  /** Defaults to `yok` when missing (legacy data). */
  soruCogaltma?: QuestionSoruCogaltma;
  updatedAt?: number;
  updatedBy?: string;
  updatedByName?: string;
  /** Present when loaded from projectQuestions (isolated copy). */
  projectId?: string;
  sourceQuestionId?: string;
}

/** Per-project copy of a template question (isolated from template edits). */
export interface ProjectQuestion {
  id: string;
  projectId: string;
  sourceQuestionId: string;
  sourceTemplateId: string;
  sectorId: string;
  pageId?: string;
  domainIds?: string[];
  bolum?: string;
  kod: string;
  baslik: string;
  soru: string;
  firmaYaniti?: string;
  firmaYanitiYil1?: string;
  firmaYanitiYil2?: string;
  firmaYanitiYil3?: string;
  firmaNot?: string;
  ilgiliBirum: string;
  veriDogrulugu?: string;
  aciklama: string;
  aciklamaVideoUrl?: string;
  ornekYanit: string;
  dayanak?: string;
  onay?: string;
  raporYeri: string;
  reportingItr?: string;
  /** Framework cross-reference columns (spreadsheet TSRS 1, GRI, etc.). */
  tsrs1?: string;
  tsrs2?: string;
  sasbRtCh?: string;
  gri?: string;
  msci?: string;
  esrs?: string;
  /** Spreadsheet "KAYIT" column (free-text record note). */
  kayit?: string;
  /** Spreadsheet "NUMARA" column (row sequence within sheet; hidden in UI). */
  numara?: number;
  thematicGroup: string;
  isMandatory: boolean;
  order: number;
  answerFormat?: QuestionAnswerFormat;
  soruCogaltma?: QuestionSoruCogaltma;
  updatedAt?: number;
  updatedBy?: string;
  updatedByName?: string;
}

export type EsgPolicyStatus = 'yes' | 'no' | 'unknown' | '';

export interface MaterialityTopicScore {
  financialImpact: number;
  impactSeverity: number;
  probability: number;
  stakeholderConcern: number;
}

export interface MaterialityAssessment {
  scores: Record<string, MaterialityTopicScore>;
  updatedAt?: number;
}

export interface EsgSummary {
  reportingBoundaryNote?: string;
  financialYearStart?: string;
  financialYearEnd?: string;
  ebitdaMeur?: number;
  netProfitMeur?: number;
  equityMeur?: number;
  sustainabilityCapexForecastMeur?: number;
  rdExpenditureMeur?: number;
  sustainabilityExecutive?: string;
  businessResilienceAssessment?: string;
  ethicsPolicyStatus?: EsgPolicyStatus;
  gdprKvkkPolicyStatus?: EsgPolicyStatus;
  climateRiskInRegister?: EsgPolicyStatus;
  electricityMwh?: number;
  naturalGasMwh?: number;
  fuelMwh?: number;
  renewableEnergyPercent?: number;
  scope1EmissionsTco2e?: number;
  scope2EmissionsTco2e?: number;
  scope3EmissionsTco2e?: number;
  waterWithdrawalM3?: number;
  wasteRecyclingPercent?: number;
  ltiFrequencyRate?: number;
  avgTrainingHoursPerEmployee?: number;
  femaleManagerPercent?: number;
  turnoverPercent?: number;
  supplierSocialAuditStatus?: EsgPolicyStatus;
}

export interface Customer {
  id: string;
  name: string;
  sectorIds: string[];
  address: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  createdAt: number;

  legalName?: string;
  brandPortfolio?: string;
  sectoralDefinition?: string;
  naceCode?: string;
  naceDescription?: string;
  sasbMacroSector?: string;
  sasbSubSectorSics?: string;
  headquartersCountry?: string;
  operationGeographies?: string;
  employeeCountTotal?: number;
  employeeCountBlueCollar?: number;
  employeeCountWhiteCollar?: number;
  employeeCountMale?: number;
  employeeCountFemale?: number;
  employeeCountPermanent?: number;
  employeeCountTemporary?: number;
  employeeContractBreakdown?: string;
  taxNumber?: string;
  reportingCurrency?: string;
  annualTurnoverMeur?: number;
  totalAssetsMeur?: number;
  reportingFrameworkKeys?: string[];
  csrdScopeEmployeeCount?: number;
  csrdScopeTurnoverMeur?: number;
  csrdScopeAssetsMeur?: number;
  isPublicInterestEntity?: boolean;
  esgSummary?: EsgSummary;
  materialityFramework?: 'gri' | 'esrs' | 'issb';
  materialityAssessment?: MaterialityAssessment;
}

export interface Branch {
  id: string;
  customerId: string;
  name: string;
  type?: string;
  address?: string;
  createdAt: number;
}

export interface Contact {
  id: string;
  customerId: string;
  branchId?: string; // Optional relationship to a branch
  name: string;
  email: string;
  role: string;
  department: string;
  linkedinUrl?: string;
  createdAt: number;
}

export interface Project {
  id: string;
  customerId: string;
  templateId?: string;
  name: string;
  domainIds?: string[];
  category: 'Project' | 'Service';
  status: 'active' | 'closed' | 'archived';
  startDate?: string;
  endDate?: string;
  createdAt: number;
  progress?: number;
  helpVideoUrl?: string; // Tutorial or help video for this project
  allowMultipleAssignments?: boolean;
}

export type DomainCategory = 'esg' | 'sasb_issb' | 'gri' | 'other';

export interface Domain {
  id: string;
  name: string;
  description?: string;
  category?: DomainCategory;
  createdAt: number;
}

export interface ProjectPage {
  id: string;
  projectId: string;
  sourceTemplatePageId: string;
  title: string;
  order: number;
  briefText: string;
  briefFileUrl?: string;
  pageKind?: TemplatePageKind;
  draftContent: string;
  /** Language used when draftContent was generated (en | tr). */
  draftLanguage?: 'en' | 'tr';
  draftStatus: 'pending' | 'drafted' | 'approved';
  answerUpdatedFlag: boolean;
}

export interface ProjectUserAssignment {
  id: string;
  projectId: string;
  userId: string;
  role: 'admin' | 'editor' | 'contributor' | 'auditor';
  assignedAt: number;
}

export interface AssigneeNoticeItem {
  questionId: string;
  questionKod?: string;
  questionText?: string;
  noteText?: string;
  hasEvidence?: boolean;
}

export interface Assignment {
  id: string;
  projectId: string;
  recipientId: string;
  recipientType: 'contact' | 'user';
  questionIds: string[];
  token?: string;
  tokenExpiry?: number;
  beginDate?: number;
  deadline?: number;
  /** User-selected at create/edit: urgent (Acil) or normal (default). */
  urgency?: 'urgent' | 'normal';
  message?: string;
  sentAt?: number;
  completedAt?: number;
  assignedBy?: string;
  assignedByName?: string;
  /** Approver assigned when the task is created (mirrors recipient). */
  approverId?: string;
  approverType?: 'contact' | 'user';
  approvedAt?: number;
  approvedBy?: string;
  submittedForApprovalAt?: number;
  status: 'pending' | 'completed' | 'overdue' | 'awaiting_approval';
  /** Görevlerim: assignee notified project manager (note/evidence). */
  assigneeNoticeSentAt?: number;
  assigneeNoticeSentByUserId?: string;
  assigneeNoticeSentByName?: string;
  assigneeNoticeSummary?: string;
  assigneeNoticeHasNotes?: boolean;
  assigneeNoticeHasEvidence?: boolean;
  assigneeNoticeItems?: AssigneeNoticeItem[];
  /** Automated deadline reminder keys already sent (before_3d, on_due, overdue_1..3). */
  remindersSent?: string[];
  lastReminderAt?: number;
  reminderCount?: number;
}

/** Per-question workflow in project questionnaire (filters + answer row). */
export type QuestionWorkflowStatus =
  | 'not_sent'
  | 'sent_pending'
  | 'customer_responded'
  | 'sent_back'
  | 'approved';

export interface AnswerReviewComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
}

/** Assignee notes on Görevlerim (stacked under each note). */
export interface AnswerAssigneeNote {
  id: string;
  text: string;
  createdAt: number;
}

export interface WorkflowStatusLogEntry {
  id: string;
  fromStatus?: QuestionWorkflowStatus;
  toStatus: QuestionWorkflowStatus;
  /** Localized message at time of change (updater UI language). */
  text: string;
  authorId: string;
  authorName: string;
  createdAt: number;
}

export interface Answer {
  id: string;
  legacyFirebaseId?: string;
  assignmentId: string;
  questionId: string;
  projectId: string;
  /** Legacy recipient id (contact or platform user). */
  contactId: string;
  latestAnswer: string;
  latestFileUrl?: string;
  submittedAt: number;
  updatedAt: number;
  comment?: string;
  /** Görevlerim: multiple consultant notes (replaces single comment for new saves). */
  answerNotes?: AnswerAssigneeNote[];
  evidenceName?: string;
  /** Platform user who performed the submission (consultant when entering on behalf). */
  submittedByUserId?: string;
  /** Customer platform user the answer is attributed to. */
  onBehalfOfUserId?: string;
  /** Consultant / PM / platform admin workflow (questionnaire tab). */
  workflowStatus?: QuestionWorkflowStatus;
  /** Status change history shown under the answer (localized at write time). */
  workflowStatusLog?: WorkflowStatusLogEntry[];
  /** PM / consultant manager notes on customer responses (forms tab). */
  reviewComments?: AnswerReviewComment[];
  /** @deprecated use workflowStatus; still read for older documents */
  adminReviewStatus?: 'pending' | 'received' | 'sent_back';
}

export interface AnswerVersion {
  id: string;
  answerId: string;
  questionId: string;
  answerText: string;
  fileUrl?: string;
  changedAt: number;
  changeNote?: string;
}

export interface CommentMessage {
  id: string;
  authorType: 'admin' | 'contact';
  authorId: string;
  text: string;
  createdAt: number;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role:
    | 'platform_admin'
    | 'consultant_manager'
    | 'consultant'
    | 'contributor'
    | 'customer'
    | 'auditor';
  department: string;
  createdAt: number;
  /** Unix ms; set on password and OTP login. */
  lastLoginAt?: number;
  isConfirmed?: boolean;
  contactId?: string;
  customerId?: string;
  language?: 'en' | 'tr';
  autoShowHelpOnOpen?: boolean;
}

export interface AIDraft {
  id: string;
  projectPageId: string;
  promptUsed: string;
  draftContent: string;
  generatedAt: number;
  approvedAt?: number;
  approvedBy?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'create' | 'update' | 'delete';
  collection: string;
  recordId: string;
  projectId?: string;
  details: string;
  timestamp: number;
  emailMessageId?: string;
  emailRecipientEmail?: string;
  emailDeliveryStatus?: 'sent' | 'delivered' | 'deferred' | 'bounced' | 'blocked' | 'spam' | 'failed';
  emailDeliveryDetail?: string;
  emailDeliveryAt?: number;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  /** Domain scope: empty or omitted = all domains. Prefer this over legacy {@link domainId}. */
  domainIds?: string[];
  /**
   * @deprecated Single-domain field from older records. When present without `domainIds`,
   * clients should treat it as one-element scope; see {@link knowledgeBaseDomainIds}.
   */
  domainId?: string;
  projectId?: string;
  customerId?: string;
  createdAt: number;
  updatedAt: number;
}

export type KnowledgeBaseSpecification = 'domain' | 'customer' | 'project';

/** Classifies a knowledge base for context picker grouping (project > customer > domain). */
export function inferKnowledgeBaseSpecification(
  kb: Pick<KnowledgeBase, 'projectId' | 'customerId'>,
): KnowledgeBaseSpecification {
  if (kb.projectId) return 'project';
  if (kb.customerId) return 'customer';
  return 'domain';
}

/** Effective domain restriction ids (merges legacy `domainId` into `domainIds`). */
export function knowledgeBaseDomainIds(
  kb: Pick<KnowledgeBase, 'domainIds' | 'domainId'>,
): string[] {
  const fromArray = (kb.domainIds ?? []).filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (typeof kb.domainId === 'string' && kb.domainId.trim() && !fromArray.includes(kb.domainId)) {
    return [...fromArray, kb.domainId];
  }
  return fromArray;
}

/** Create/update body: null on customerId or projectId clears that scope link. */
export type KnowledgeBaseWritePayload = {
  name: string;
  description: string;
  /** Domain restriction; empty array = global (all domains). */
  domainIds: string[];
  /**
   * Send `null` on create/update to clear legacy `domainId` in Mongo during transition.
   */
  domainId?: string | null;
  customerId: string | null;
  projectId: string | null;
};

export interface KBDocument {
  id: string;
  kbId: string;
  name: string;
  fileUrl: string;
  fileType: string;
  size: number;
  text?: string;
  processed?: boolean;
  createdAt: number;
}

export interface Translation {
  id: string;
  key: string;
  en: string;
  tr: string;
  group?: string;
  updatedAt: number;
}

export interface EmailSettings {
  fromName: string;
  fromEmail: string;
  provider: 'smtp' | 'sendgrid' | 'postmark' | 'custom';
  apiKey?: string;
  smtpHost?: string;
  smtpPort?: number; // Changed to number for consistency
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  // Template fields
  passwordResetSubject: string;
  passwordResetBody: string;
}
