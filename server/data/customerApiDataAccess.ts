/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reads for `/api/v1/customer/*` public API routes.
 */

import { serialize } from '../lib/apiSerialize.ts';
import { getPrisma } from './prismaClient.ts';

export type CustomerApiSummary = {
  id: string;
  name: string;
  sectorIds: string[];
  websiteUrl: string | null;
  logoUrl: string | null;
};

export type ProjectApiSummary = {
  id: string;
  customerId: string;
  templateId: string | null;
  domainIds: string[];
  name: string;
  category: string;
  status: string;
  startDate: unknown;
  endDate: unknown;
  progress: number | null;
};

export async function listCustomersForPublicApi(): Promise<CustomerApiSummary[]> {
  const rows = await getPrisma().customer.findMany({ orderBy: { name: 'asc' } });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sectorIds: Array.isArray(row.sectorIds) ? (row.sectorIds as string[]) : [],
    websiteUrl: row.websiteUrl ?? null,
    logoUrl: row.logoUrl ?? null,
  }));
}

export async function getCustomerProjectsForPublicApi(customerId: string): Promise<{
  customer: { id: string; name: string; sectorIds: string[] };
  projects: ProjectApiSummary[];
} | null> {
  const customer = await getPrisma().customer.findUnique({ where: { id: customerId } });
  if (!customer) return null;

  const projects = await getPrisma().project.findMany({
    where: { customerId },
    orderBy: { name: 'asc' },
  });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      sectorIds: Array.isArray(customer.sectorIds) ? (customer.sectorIds as string[]) : [],
    },
    projects: projects.map((p) => ({
      id: p.id,
      customerId: p.customerId,
      templateId: p.templateId ?? null,
      domainIds: Array.isArray(p.domainIds) ? (p.domainIds as string[]) : [],
      name: p.name,
      category: p.category,
      status: p.status,
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
      progress: typeof p.progress === 'number' ? p.progress : null,
    })),
  };
}

export async function getProjectSubmissionsByName(projectName: string): Promise<{
  project: Record<string, unknown>;
  submissions: Record<string, unknown>[];
} | null> {
  const project = await getPrisma().project.findFirst({
    where: { name: projectName },
  });
  if (!project) return null;

  const [answers, questions] = await Promise.all([
    getPrisma().answer.findMany({ where: { projectId: project.id } }),
    getPrisma().question.findMany(),
  ]);

  const questionsMap = new Map(
    questions.map((q) => [q.id, serialize(q) as Record<string, unknown>]),
  );

  const submissions = answers.map((answer) => {
    const row = serialize(answer) as Record<string, unknown>;
    const question = questionsMap.get(String(row.questionId));
    return {
      answerId: row.id,
      assignmentId: row.assignmentId,
      contactId: row.contactId,
      projectId: row.projectId,
      questionId: row.questionId,
      templateId: question?.templateId ?? null,
      sectorId: question?.sectorId ?? null,
      pageId: question?.pageId ?? null,
      questionCode: question?.kod || 'N/A',
      questionTitle: question?.baslik || 'N/A',
      questionText: question?.soru || 'N/A',
      latestAnswer: row.latestAnswer || '',
      latestFileUrl: row.latestFileUrl || null,
      submittedAt: row.submittedAt,
      updatedAt: row.updatedAt,
    };
  });

  const projectRow = serialize(project) as Record<string, unknown>;
  return {
    project: {
      id: projectRow.id,
      customerId: projectRow.customerId,
      templateId: projectRow.templateId || null,
      domainIds: Array.isArray(projectRow.domainIds) ? projectRow.domainIds : [],
      name: projectRow.name,
      status: projectRow.status,
      category: projectRow.category,
      createdAt: projectRow.createdAt,
    },
    submissions,
  };
}
