/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistence for workflow routes (assignments, answers, on-behalf).
 */

import { Prisma } from '@prisma/client';
import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';
import { withExternalId, withExternalIds } from './entityLookup.ts';
import { documentPublicId } from '../lib/questionIds.ts';

type Row = Record<string, unknown>;

export async function resolveProjectIdKeys(projectId: string): Promise<string[]> {
  const trimmed = projectId?.trim();
  if (!trimmed) return [];

  const keys = new Set<string>([trimmed]);
  const project = await findProjectByParam(trimmed);
  if (project) {
    keys.add(String(project.id || project._id));
    const legacy = project.legacyFirebaseId as string | undefined;
    if (legacy) keys.add(legacy);
    const pub = documentPublicId(project as { legacyFirebaseId?: string; _id?: unknown });
    if (pub) keys.add(pub);
  }
  return [...keys];
}

export async function findProjectByParam(projectId: string): Promise<Row | null> {
  return withExternalId(await findByIdOrLegacy(getPrisma().project, projectId));
}

export async function findCustomerByParam(customerId: string): Promise<Row | null> {
  return withExternalId(await findByIdOrLegacy(getPrisma().customer, customerId));
}

export async function findContactByExternalId(contactId: string): Promise<Row | null> {
  return withExternalId(await findByIdOrLegacy(getPrisma().contact, contactId));
}

export async function findContactByCustomerAndEmail(
  customerIds: string[],
  email: string,
): Promise<Row | null> {
  const row = await getPrisma().contact.findFirst({
    where: { customerId: { in: customerIds }, email: email.toLowerCase() },
  });
  return withExternalId(row as Row | null);
}

export async function createContact(data: {
  customerId: string;
  name: string;
  email: string;
  role: string;
  department: string;
}): Promise<Row> {
  const row = await getPrisma().contact.create({ data });
  return withExternalId(row as Row)!;
}

export async function updateContactName(contactId: string, name: string): Promise<void> {
  const existing = await findByIdOrLegacy(getPrisma().contact, contactId);
  if (!existing) return;
  await getPrisma().contact.update({
    where: { id: String(existing.id) },
    data: { name, updatedAt: new Date() },
  });
}

export async function findPlatformUserByEmail(email: string): Promise<Row | null> {
  const row = await getPrisma().platformUser.findFirst({
    where: { email: email.toLowerCase() },
  });
  return withExternalId(row as Row | null);
}

export async function findPlatformUserByExternalId(userId: string): Promise<Row | null> {
  const row = await findByIdOrLegacy(getPrisma().platformUser, userId);
  if (row) return withExternalId(row);
  const byContact = await getPrisma().platformUser.findFirst({ where: { contactId: userId } });
  return withExternalId(byContact as Row | null);
}

export async function createPlatformUser(data: Record<string, unknown>): Promise<Row> {
  const row = await getPrisma().platformUser.create({
    data: {
      name: String(data.name),
      email: String(data.email).toLowerCase(),
      role: String(data.role || 'customer'),
      department: String(data.department || ''),
      isConfirmed: Boolean(data.isConfirmed),
      contactId: data.contactId as string | undefined,
      language: String(data.language || 'tr'),
    },
  });
  return withExternalId(row as Row)!;
}

export async function patchPlatformUser(
  userId: string,
  updates: Record<string, string>,
): Promise<void> {
  const existing = await findByIdOrLegacy(getPrisma().platformUser, userId);
  if (!existing) return;
  await getPrisma().platformUser.update({
    where: { id: String(existing.id) },
    data: { ...updates, updatedAt: new Date() },
  });
}

export async function findProjectUserAssignment(
  projectId: string,
  userIds: string[],
): Promise<Row | null> {
  const row = await getPrisma().projectUserAssignment.findFirst({
    where: { projectId, userId: { in: userIds } },
  });
  return withExternalId(row as Row | null);
}

export async function createProjectUserAssignment(data: {
  projectId: string;
  userId: string;
  role: string;
  assignedAt: Date;
}): Promise<Row> {
  const row = await getPrisma().projectUserAssignment.create({ data });
  return withExternalId(row as Row)!;
}

export async function findAssignmentForProject(
  projectId: string,
  assignmentId: string,
): Promise<Row | null> {
  const row = await getPrisma().assignment.findFirst({
    where: {
      projectId,
      OR: [{ id: assignmentId }, { legacyFirebaseId: assignmentId }],
    },
  });
  return withExternalId(row as Row | null);
}

export async function findAssignmentByRecipientAndQuestion(
  projectId: string,
  recipientId: string,
  questionId: string,
): Promise<Row | null> {
  const rows = await getPrisma().assignment.findMany({
    where: { projectId, recipientId },
  });
  const match = rows.find((row) => {
    const ids = Array.isArray(row.questionIds) ? row.questionIds : [];
    return (ids as string[]).includes(questionId);
  });
  return withExternalId((match as Row) || null);
}

export async function createAssignment(data: Record<string, unknown>): Promise<Row> {
  const row = await getPrisma().assignment.create({
    data: {
      projectId: String(data.projectId),
      recipientId: String(data.recipientId),
      recipientType: String(data.recipientType),
      questionIds: (data.questionIds ?? []) as Prisma.InputJsonValue,
      status: String(data.status ?? 'pending'),
      sentAt: data.sentAt as Date | undefined,
      completedAt: data.completedAt as Date | undefined,
      assignedBy: data.assignedBy as string | undefined,
      assignedByName: data.assignedByName as string | undefined,
      message: String(data.message ?? ''),
      token: data.token as string | undefined,
      tokenExpiry: data.tokenExpiry as Date | undefined,
      beginDate: data.beginDate as Date | undefined,
      deadline: data.deadline as Date | undefined,
      urgency: String(data.urgency ?? 'normal') === 'urgent' ? 'urgent' : 'normal',
      approverId: data.approverId ? String(data.approverId) : undefined,
      approverType: data.approverType
        ? String(data.approverType) === 'contact'
          ? 'contact'
          : 'user'
        : undefined,
      approvedAt: data.approvedAt as Date | undefined,
      approvedBy: data.approvedBy as string | undefined,
      submittedForApprovalAt: data.submittedForApprovalAt as Date | undefined,
    },
  });
  return withExternalId(row as Row)!;
}

export async function updateAssignment(
  assignmentId: string,
  set: Record<string, unknown>,
  unset?: Record<string, 1>,
): Promise<void> {
  const existing = await findByIdOrLegacy(getPrisma().assignment, assignmentId);
  if (!existing) return;
  const data: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(set)) {
    data[key] = value;
  }
  if (unset?.token) data.token = null;
  if (unset?.tokenExpiry) data.tokenExpiry = null;
  await getPrisma().assignment.update({
    where: { id: String(existing.id) },
    data: data as Prisma.AssignmentUpdateInput,
  });
}

export async function deleteAssignment(assignmentId: string): Promise<number> {
  const existing = await findByIdOrLegacy(getPrisma().assignment, assignmentId);
  if (!existing) return 0;
  await getPrisma().assignment.delete({ where: { id: String(existing.id) } });
  return 1;
}

export async function findAssignmentsByIds(assignmentIds: string[]): Promise<Row[]> {
  if (assignmentIds.length === 0) return [];
  const rows = await getPrisma().assignment.findMany({
    where: {
      OR: assignmentIds.flatMap((id) => [{ id }, { legacyFirebaseId: id }]),
    },
  });
  return withExternalIds(rows as Row[]);
}

export async function deleteAssignmentsByIds(assignmentIds: string[]): Promise<number> {
  if (assignmentIds.length === 0) return 0;
  const rows = await findAssignmentsByIds(assignmentIds);
  if (rows.length === 0) return 0;
  const result = await getPrisma().assignment.deleteMany({
    where: { id: { in: rows.map((row) => String(row.id)) } },
  });
  return result.count;
}

export async function deleteAnswersForAssignment(
  projectKeys: string[],
  assignmentIdClauses: string[],
): Promise<number> {
  const result = await getPrisma().answer.deleteMany({
    where: {
      projectId: { in: projectKeys.length > 0 ? projectKeys : undefined },
      assignmentId: { in: assignmentIdClauses },
    },
  });
  return result.count;
}

export async function findAnswerByLookup(
  answerKey: string,
  projectId?: string,
): Promise<Row | null> {
  const where: Prisma.AnswerWhereInput = projectId ? { projectId } : {};
  const row = await getPrisma().answer.findFirst({
    where: {
      ...where,
      OR: [{ id: answerKey }, { legacyFirebaseId: answerKey }],
    },
  });
  return withExternalId(row as Row | null);
}

export async function findAnswerDocumentByLookup(
  answerKey: string,
  projectId?: string,
): Promise<{ save: () => Promise<void> } & Row | null> {
  const row = await findAnswerByLookup(answerKey, projectId);
  if (!row) return null;
  return {
    ...row,
    save: async () => {
      await getPrisma().answer.update({
        where: { id: String(row.id) },
        data: {
          workflowStatus: row.workflowStatus as string | undefined,
          workflowStatusLog: row.workflowStatusLog as Prisma.InputJsonValue,
          reviewComments: row.reviewComments as Prisma.InputJsonValue,
          updatedAt: row.updatedAt as Date,
        },
      });
    },
  };
}

export async function upsertAnswerByLegacyId(
  legacyId: string,
  data: Record<string, unknown>,
  appendWorkflowLog?: boolean,
  priorLog?: unknown[],
): Promise<Row> {
  const prisma = getPrisma();
  const existing = await prisma.answer.findFirst({ where: { legacyFirebaseId: legacyId } });
  const workflowStatusLog = appendWorkflowLog && priorLog
    ? [...priorLog, ...(Array.isArray(data.workflowStatusLog) ? data.workflowStatusLog : [])]
    : (data.workflowStatusLog as Prisma.InputJsonValue);

  const payload = {
    legacyFirebaseId: legacyId,
    projectId: String(data.projectId),
    assignmentId: String(data.assignmentId),
    questionId: String(data.questionId),
    contactId: String(data.contactId),
    latestAnswer: String(data.latestAnswer ?? ''),
    latestFileUrl: data.latestFileUrl as string | undefined,
    evidenceName: data.evidenceName as string | undefined,
    submittedAt: data.submittedAt as Date,
    updatedAt: data.updatedAt as Date,
    submittedByUserId: data.submittedByUserId as string | undefined,
    onBehalfOfUserId: data.onBehalfOfUserId as string | undefined,
    workflowStatus: data.workflowStatus as string | undefined,
    workflowStatusLog,
  };

  const row = existing
    ? await prisma.answer.update({ where: { id: existing.id }, data: payload })
    : await prisma.answer.create({ data: payload });
  return withExternalId(row as Row)!;
}

export async function createAuditLog(data: Record<string, unknown>): Promise<void> {
  await getPrisma().auditLog.create({
    data: {
      userId: String(data.userId ?? ''),
      userName: String(data.userName ?? ''),
      userEmail: String(data.userEmail ?? ''),
      action: String(data.action ?? 'update'),
      collection: String(data.collection ?? ''),
      recordId: String(data.recordId ?? ''),
      projectId: data.projectId as string | undefined,
      details: String(data.details ?? ''),
      timestamp: data.timestamp instanceof Date
        ? data.timestamp
        : new Date(Number(data.timestamp) || Date.now()),
    },
  });
}

export async function findQuestionForProject(
  projectId: string,
  questionId: string,
): Promise<{ doc: Row; kind: 'project' | 'template' } | null> {
  if (!questionId) return null;

  const prisma = getPrisma();
  const projectQuestion = await prisma.projectQuestion.findFirst({
    where: {
      projectId,
      OR: [
        { id: questionId },
        { legacyFirebaseId: questionId },
        { sourceQuestionId: questionId },
      ],
    },
  });
  if (projectQuestion) {
    return { doc: withExternalId(projectQuestion as Row)!, kind: 'project' };
  }
  const templateQuestion = await prisma.question.findFirst({
    where: {
      OR: [{ id: questionId }, { legacyFirebaseId: questionId }],
    },
  });
  if (templateQuestion) {
    return { doc: withExternalId(templateQuestion as Row)!, kind: 'template' };
  }
  return null;
}

export async function findQuestionByProjectKeys(
  projectKeys: string[],
  questionId: string,
): Promise<Row | null> {
  const row = await getPrisma().projectQuestion.findFirst({
    where: {
      projectId: { in: projectKeys },
      OR: [{ id: questionId }, { legacyFirebaseId: questionId }],
    },
  });
  return withExternalId(row as Row | null);
}

export async function findRecipientExists(
  recipientId: string,
  recipientType: 'contact' | 'user',
): Promise<boolean> {
  if (recipientType === 'user') {
    return Boolean(await findPlatformUserByExternalId(recipientId));
  }
  return Boolean(await findContactByExternalId(recipientId));
}

export async function resolveRecipientLabel(
  recipientId: string,
  recipientType: 'contact' | 'user',
): Promise<string> {
  const recipient =
    recipientType === 'user'
      ? await findPlatformUserByExternalId(recipientId)
      : await findContactByExternalId(recipientId);
  if (!recipient) return recipientId;
  const email = String(recipient.email || '').trim();
  const name = String(recipient.name || '').trim();
  if (name && email) return `${name} (${email})`;
  return name || email || recipientId;
}

export async function findAuditLogByCollectionRecord(
  collection: string,
  projectId: string,
  recordId: string,
): Promise<Row | null> {
  const row = await getPrisma().auditLog.findFirst({
    where: { collection, projectId, recordId },
  });
  return withExternalId(row as Row | null);
}

export async function listAnswersWithProjectId(): Promise<Row[]> {
  const rows = await getPrisma().answer.findMany({
    where: { projectId: { not: '' } },
  });
  return withExternalIds(rows as Row[]);
}

export async function updateAnswerSubmissionActors(
  answerId: string,
  submittedByUserId: string,
  onBehalfOfUserId: string,
): Promise<void> {
  const existing = await findByIdOrLegacy(getPrisma().answer, answerId);
  if (!existing) return;
  await getPrisma().answer.update({
    where: { id: String(existing.id) },
    data: { submittedByUserId, onBehalfOfUserId, updatedAt: new Date() },
  });
}

export async function findAnswersByProjectAndAssignment(
  projectKeys: string[],
  assignmentId: string,
): Promise<Row[]> {
  const keys = projectKeys.length > 0 ? projectKeys : [];
  const rows = await getPrisma().answer.findMany({
    where: {
      ...(keys.length > 0 ? { projectId: { in: keys } } : {}),
      assignmentId,
    },
  });
  return withExternalIds(rows as Row[]);
}

export async function findAnswersByProjectAndContact(
  projectKeys: string[],
  contactId: string,
): Promise<Row[]> {
  const keys = projectKeys.length > 0 ? projectKeys : [];
  const rows = await getPrisma().answer.findMany({
    where: {
      ...(keys.length > 0 ? { projectId: { in: keys } } : {}),
      contactId,
    },
  });
  return withExternalIds(rows as Row[]);
}

export async function listProjectAdminManagers(projectKeys: string[]): Promise<Row[]> {
  const keys = projectKeys.length > 0 ? projectKeys : [];
  const links = await getPrisma().projectUserAssignment.findMany({
    where: { projectId: { in: keys }, role: 'admin' },
  });
  const userIds = [...new Set(links.map((l) => String(l.userId)).filter(Boolean))];
  if (userIds.length === 0) return [];
  const users = await getPrisma().platformUser.findMany({
    where: {
      OR: userIds.flatMap((id) => [{ id }, { legacyFirebaseId: id }]),
    },
  });
  return withExternalIds(users as Row[]);
}

export async function findPlatformUserByEmailOrRecipient(
  email: string,
  recipientId?: string,
): Promise<Row | null> {
  if (recipientId) {
    const byId = await findPlatformUserByExternalId(recipientId);
    if (byId) return byId;
  }
  return findPlatformUserByEmail(email);
}

export async function listAssignmentsByProjectKeys(projectKeys: string[]): Promise<Row[]> {
  const keys = projectKeys.length > 0 ? projectKeys : [];
  const rows = await getPrisma().assignment.findMany({
    where: { projectId: { in: keys } },
  });
  return withExternalIds(rows as Row[]);
}

/** Open assignments with a deadline that may need automated reminders. */
export async function listAssignmentsForDeadlineReminders(): Promise<Row[]> {
  const rows = await getPrisma().assignment.findMany({
    where: {
      deadline: { not: null },
      status: { in: ['pending', 'overdue'] },
    },
  });
  return withExternalIds(rows as Row[]);
}

export async function updateAssignmentQuestionIds(
  assignmentId: string,
  questionIds: string[],
): Promise<void> {
  await updateAssignment(assignmentId, { questionIds });
}

export async function deleteAnswersByProjectKeysAndQuestions(
  projectKeys: string[],
  questionIds: string[],
): Promise<number> {
  const keys = projectKeys.length > 0 ? projectKeys : [];
  const result = await getPrisma().answer.deleteMany({
    where: { projectId: { in: keys }, questionId: { in: questionIds } },
  });
  return result.count;
}

export async function listProjectUserAssignmentsForKeys(projectKeys: string[]): Promise<Row[]> {
  const keys = projectKeys.length > 0 ? projectKeys : [];
  const rows = await getPrisma().projectUserAssignment.findMany({
    where: { projectId: { in: keys } },
  });
  return withExternalIds(rows as Row[]);
}

export async function listPlatformUsersMatchingIds(userIds: string[]): Promise<Row[]> {
  if (userIds.length === 0) return [];
  const rows = await getPrisma().platformUser.findMany({
    where: { OR: userIds.flatMap((id) => [{ id }, { legacyFirebaseId: id }]) },
  });
  return withExternalIds(rows as Row[]);
}

export async function listConsultantManagerUsers(): Promise<Row[]> {
  const rows = await getPrisma().platformUser.findMany({
    where: { role: 'consultant_manager' },
  });
  return withExternalIds(rows as Row[]);
}

export async function findAssignmentsForRecipientQuestions(params: {
  projectId: string;
  recipientId: string;
  questionIds: string[];
  excludeAssignmentId?: string;
}): Promise<Row[]> {
  const rows = await getPrisma().assignment.findMany({
    where: {
      projectId: params.projectId,
      recipientId: params.recipientId,
      ...(params.excludeAssignmentId
        ? { NOT: { OR: [{ id: params.excludeAssignmentId }, { legacyFirebaseId: params.excludeAssignmentId }] } }
        : {}),
    },
  });
  return withExternalIds(
    rows.filter((row) => {
      const ids = Array.isArray(row.questionIds) ? (row.questionIds as string[]) : [];
      return params.questionIds.some((qid) => ids.includes(qid));
    }) as Row[],
  );
}
