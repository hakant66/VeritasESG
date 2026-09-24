/**
 * Helpers for SQL integration tests (Testcontainers Postgres).
 */
import { inject } from 'vitest';
import { hashPassword } from '../../../server/auth/password.ts';
import { disconnectPrisma, getPrisma } from '../../../server/data/prismaClient.ts';
import { signTestToken } from './testJwt.ts';

export const SQL_TEST_USER_ID = 'sql-test-platform-admin';
export const SQL_TEST_USER_EMAIL = 'sql-tester@example.com';
export const SQL_TEST_API_KEY = 'test-platform-api-key';

export function sqlTestsSkipped(): boolean {
  return inject('sqlTestsSkipped') === '1';
}

export function sqlTestsSkipReason(): string | undefined {
  return inject('sqlTestsSkipReason');
}

let clearTablesLock: Promise<void> = Promise.resolve();

export async function clearSqlTables(): Promise<void> {
  clearTablesLock = clearTablesLock.then(async () => {
    const prisma = getPrisma();
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations'
    `;

    if (tables.length === 0) return;

    const names = tables.map((row) => `"${row.tablename}"`).join(', ');
    // Session advisory locks break under Prisma connection pooling (lock on
    // conn A, unlock on conn B → "you don't own a lock" and later waiters hang).
    // Use a transaction-scoped lock so acquire + TRUNCATE share one connection.
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(839201)`;
        await tx.$executeRawUnsafe(
          `TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`,
        );
      },
      { timeout: 60_000 },
    );
  });
  await clearTablesLock;
}

export async function seedSqlPlatformUser(
  overrides?: Partial<{
    id: string;
    email: string;
    name: string;
    role: string;
    password: string;
  }>,
): Promise<{ id: string; email: string; token: string }> {
  const id = overrides?.id ?? SQL_TEST_USER_ID;
  const email = (overrides?.email ?? SQL_TEST_USER_EMAIL).toLowerCase();
  const role = overrides?.role ?? 'platform_admin';
  const password = overrides?.password ?? 'test-password';

  await getPrisma().platformUser.upsert({
    where: { email },
    create: {
      id,
      email,
      name: overrides?.name ?? 'SQL Tester',
      role,
      department: 'Management',
      passwordHash: hashPassword(password),
      isConfirmed: true,
    },
    update: {
      role,
      passwordHash: hashPassword(password),
      isConfirmed: true,
    },
  });

  const token = signTestToken({ uid: id, sub: id, email, role });
  return { id, email, token };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function countCustomers(): Promise<number> {
  return getPrisma().customer.count();
}

export async function countAnswers(filter: {
  projectId: string;
  questionId: string;
  contactId: string;
}): Promise<number> {
  return getPrisma().answer.count({ where: filter });
}

export async function findCustomerByLegacyId(legacyFirebaseId: string) {
  return getPrisma().customer.findFirst({ where: { legacyFirebaseId } });
}

export async function findCustomerById(id: string) {
  return getPrisma().customer.findUnique({ where: { id } });
}

export async function createSqlCustomer(data: {
  name: string;
  sectorIds?: string[];
  legacyFirebaseId?: string;
}) {
  return getPrisma().customer.create({
    data: {
      name: data.name,
      sectorIds: data.sectorIds ?? ['s1'],
      legacyFirebaseId: data.legacyFirebaseId,
    },
  });
}

export async function createSqlPlatformUser(data: {
  name: string;
  email: string;
  role: string;
  customerId?: string;
  passwordHash?: string;
}) {
  return getPrisma().platformUser.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      role: data.role,
      department: 'Management',
      customerId: data.customerId,
      passwordHash: data.passwordHash,
    },
  });
}

export async function createSqlContact(data: {
  name: string;
  email: string;
  customerId: string;
  role?: string;
  department?: string;
}) {
  return getPrisma().contact.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      customerId: data.customerId,
      role: data.role ?? 'Stakeholder',
      department: data.department ?? 'Finance',
    },
  });
}

export async function createSqlProject(data: {
  name: string;
  customerId: string;
  category?: string;
  status?: string;
}) {
  return getPrisma().project.create({
    data: {
      name: data.name,
      customerId: data.customerId,
      category: data.category ?? 'Project',
      status: data.status ?? 'active',
    },
  });
}

export async function createSqlProjectQuestion(data: {
  projectId: string;
  id?: string;
  kod?: string;
  sourceQuestionId?: string;
  sourceTemplateId?: string;
  sectorId?: string;
}) {
  return getPrisma().projectQuestion.create({
    data: {
      id: data.id,
      projectId: data.projectId,
      sourceQuestionId: data.sourceQuestionId ?? 'src-q-1',
      sourceTemplateId: data.sourceTemplateId ?? 'tpl-1',
      sectorId: data.sectorId ?? 'sector-1',
      kod: data.kod ?? 'Q1',
      baslik: 'Test title',
      soru: 'Test question text',
    },
  });
}

export async function createSqlAssignment(data: {
  projectId: string;
  recipientId: string;
  recipientType: string;
  questionIds: string[];
  sentAt?: Date | null;
  deadline?: Date | null;
}) {
  return getPrisma().assignment.create({
    data: {
      projectId: data.projectId,
      recipientId: data.recipientId,
      recipientType: data.recipientType,
      questionIds: data.questionIds,
      status: 'pending',
      message: 'test assignment',
      beginDate: new Date(),
      sentAt: data.sentAt ?? null,
      deadline: data.deadline ?? null,
    },
  });
}

export async function countAssignments(projectId: string): Promise<number> {
  return getPrisma().assignment.count({ where: { projectId } });
}

export async function createSqlAnswer(data: {
  projectId: string;
  questionId: string;
  contactId: string;
  assignmentId: string;
  latestAnswer?: string;
  legacyFirebaseId?: string;
}) {
  return getPrisma().answer.create({
    data: {
      projectId: data.projectId,
      questionId: data.questionId,
      contactId: data.contactId,
      assignmentId: data.assignmentId,
      latestAnswer: data.latestAnswer ?? 'seed answer',
      legacyFirebaseId: data.legacyFirebaseId,
      submittedAt: new Date(),
    },
  });
}

export async function createSqlProjectUserAssignment(data: {
  projectId: string;
  userId: string;
  role: string;
}) {
  return getPrisma().projectUserAssignment.create({
    data: {
      projectId: data.projectId,
      userId: data.userId,
      role: data.role,
      assignedAt: new Date(),
    },
  });
}

export async function findProjectUserAssignment(filter: {
  projectId: string;
  userId?: string;
}) {
  return getPrisma().projectUserAssignment.findFirst({ where: filter });
}

export async function countProjectUserAssignments(projectId: string): Promise<number> {
  return getPrisma().projectUserAssignment.count({ where: { projectId } });
}

export async function findProjectById(id: string) {
  return getPrisma().project.findUnique({ where: { id } });
}

/** Sign a session token for an existing platform user row. */
export function tokenForSqlUser(user: { id: string; email?: string | null; role?: string | null }) {
  return signTestToken({
    uid: user.id,
    sub: user.id,
    email: user.email ?? undefined,
    role: user.role ?? undefined,
  });
}

export async function createSqlAuditLogs(rows: Array<{
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  collection: string;
  recordId: string;
  details: string;
  timestamp: Date;
}>) {
  await getPrisma().auditLog.createMany({ data: rows });
}

/** Reset Prisma singleton between suites if needed. */
export async function resetSqlClient(): Promise<void> {
  await disconnectPrisma();
}
