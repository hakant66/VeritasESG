/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistence for project questionnaire lib helpers (Batch E).
 */

import { Prisma } from '@prisma/client';
import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';
import { withExternalId, withExternalIds } from './entityLookup.ts';
import { isObjectIdLike } from '../lib/questionIds.ts';
import { findProjectByParam } from './workflowDataAccess.ts';

type Row = Record<string, unknown>;

function projectKeysOrClause(projectKeys: string[]) {
  return {
    OR: projectKeys.flatMap((k) =>
      isObjectIdLike(k) ? [{ id: k }, { legacyFirebaseId: k }] : [{ legacyFirebaseId: k }],
    ),
  };
}

export async function resolveProjectCustomerId(
  projectId: string,
  customerId?: string,
): Promise<string | null> {
  if (customerId?.trim()) return customerId.trim();
  const project = await findProjectByParam(projectId);
  const cid = project?.customerId as string | undefined;
  return cid?.trim() || null;
}

export async function loadCustomerBranches(
  customerId: string,
): Promise<Array<{ id: string; name: string }>> {
  const rows = await getPrisma().branch.findMany({
    where: {
      OR: [{ customerId }, { legacyFirebaseId: customerId }, { id: customerId }],
    },
    orderBy: { name: 'asc' },
  });
  return withExternalIds(rows as Row[])
    .map((b) => {
      const name = String(b.name || '').trim();
      if (!b.id || !name) return null;
      return { id: b.id, name };
    })
    .filter((b): b is { id: string; name: string } => b !== null);
}

export async function collectValidQuestionIds(projectKeys: string[]): Promise<Set<string>> {
  const valid = new Set<string>();

  const rows = await getPrisma().projectQuestion.findMany({
    where: { projectId: { in: projectKeys } },
    select: { id: true, legacyFirebaseId: true, sourceQuestionId: true },
  });
  for (const row of rows) {
    valid.add(String(row.id));
    if (row.legacyFirebaseId) valid.add(row.legacyFirebaseId);
    if (row.sourceQuestionId) valid.add(row.sourceQuestionId);
  }
  if (rows.length === 0) {
    const project = await getPrisma().project.findFirst({
      where: projectKeysOrClause(projectKeys),
      select: { templateId: true },
    });
    const templateId = project?.templateId?.trim();
    if (templateId) {
      const templateRows = await getPrisma().question.findMany({
        where: {
          OR: [{ templateId }, { legacyFirebaseId: templateId }, { id: templateId }],
        },
        select: { id: true, legacyFirebaseId: true },
      });
      for (const row of templateRows) {
        valid.add(String(row.id));
        if (row.legacyFirebaseId) valid.add(row.legacyFirebaseId);
      }
    }
  }
  return valid;
}

export async function deleteProjectQuestionnaireData(projectId: string): Promise<void> {
  const { resolveProjectIdKeys } = await import('./workflowDataAccess.ts');
  const projectKeys = await resolveProjectIdKeys(projectId);
  if (projectKeys.length === 0) return;

  const prisma = getPrisma();
  const where = { projectId: { in: projectKeys } };
  await prisma.$transaction([
    prisma.projectPage.deleteMany({ where }),
    prisma.projectQuestion.deleteMany({ where }),
    prisma.answer.deleteMany({ where }),
    prisma.assignment.deleteMany({ where }),
    prisma.auditLog.deleteMany({ where }),
  ]);
}

export async function deleteProjectQuestionsByProject(projectId: string): Promise<void> {
  await getPrisma().projectQuestion.deleteMany({ where: { projectId } });
}

export async function listTemplateQuestions(templateId: string): Promise<Row[]> {
  const rows = await getPrisma().question.findMany({
    where: {
      OR: [{ templateId }, { legacyFirebaseId: templateId }, { id: templateId }],
    },
  });
  return withExternalIds(rows as Row[]);
}

export async function listProjectPages(projectId: string): Promise<Row[]> {
  const rows = await getPrisma().projectPage.findMany({ where: { projectId } });
  return withExternalIds(rows as Row[]);
}

function projectQuestionPayload(doc: Record<string, unknown>): Prisma.ProjectQuestionCreateManyInput {
  return {
    projectId: String(doc.projectId),
    sourceQuestionId: String(doc.sourceQuestionId || ''),
    sourceTemplateId: String(doc.sourceTemplateId || ''),
    sectorId: String(doc.sectorId || ''),
    pageId: doc.pageId ? String(doc.pageId) : undefined,
    domainIds: (doc.domainIds ?? []) as Prisma.InputJsonValue,
    bolum: String(doc.bolum ?? ''),
    kod: String(doc.kod || ''),
    baslik: String(doc.baslik || ''),
    soru: String(doc.soru || ''),
    firmaYaniti: String(doc.firmaYaniti ?? ''),
    firmaYanitiYil1: String(doc.firmaYanitiYil1 ?? ''),
    firmaYanitiYil2: String(doc.firmaYanitiYil2 ?? ''),
    firmaYanitiYil3: String(doc.firmaYanitiYil3 ?? ''),
    firmaNot: String(doc.firmaNot ?? ''),
    ilgiliBirim: String(doc.ilgiliBirim || ''),
    veriDogrulugu: String(doc.veriDogrulugu ?? ''),
    aciklama: String(doc.aciklama || ''),
    aciklamaVideoUrl: String(doc.aciklamaVideoUrl ?? ''),
    ornekYanit: String(doc.ornekYanit || ''),
    dayanak: String(doc.dayanak ?? ''),
    onay: String(doc.onay ?? ''),
    raporYeri: String(doc.raporYeri || ''),
    reportingItr: String(doc.reportingItr ?? ''),
    tsrs1: String(doc.tsrs1 ?? ''),
    tsrs2: String(doc.tsrs2 ?? ''),
    sasbRtCh: String(doc.sasbRtCh ?? ''),
    gri: String(doc.gri ?? ''),
    msci: String(doc.msci ?? ''),
    esrs: String(doc.esrs ?? ''),
    kayit: String(doc.kayit ?? ''),
    numara: typeof doc.numara === 'number' ? doc.numara : undefined,
    thematicGroup: String(doc.thematicGroup || ''),
    isMandatory: Boolean(doc.isMandatory),
    order: typeof doc.order === 'number' ? doc.order : 0,
    answerFormat: String(doc.answerFormat || 'textarea'),
    soruCogaltma: String(doc.soruCogaltma || 'yok'),
  };
}

export async function insertProjectQuestions(docs: Record<string, unknown>[]): Promise<void> {
  if (docs.length === 0) return;
  await getPrisma().projectQuestion.createMany({
    data: docs.map((doc) => projectQuestionPayload(doc)),
  });
}

export async function findStaleBranchProjectQuestions(projectId: string): Promise<Row[]> {
  const rows = await getPrisma().projectQuestion.findMany({
    where: { projectId, soruCogaltma: 'sube_bazinda' },
  });
  return withExternalIds(rows as Row[]);
}

export async function deleteProjectQuestionById(questionId: string): Promise<void> {
  const existing = await findByIdOrLegacy(getPrisma().projectQuestion, questionId);
  if (!existing) return;
  await getPrisma().projectQuestion.delete({ where: { id: String(existing.id) } });
}

export async function findBranchKodProjectQuestions(projectId: string): Promise<Row[]> {
  const rows = await getPrisma().projectQuestion.findMany({
    where: { projectId, kod: { contains: ' - ' } },
  });
  return withExternalIds(rows as Row[]);
}

export async function updateProjectQuestionText(
  questionId: string,
  soru: string,
  aciklama: string,
): Promise<void> {
  const existing = await findByIdOrLegacy(getPrisma().projectQuestion, questionId);
  if (!existing) return;
  await getPrisma().projectQuestion.update({
    where: { id: String(existing.id) },
    data: { soru, aciklama, updatedAt: new Date() },
  });
}

export async function findProjectAndCustomer(
  projectId: string,
): Promise<{ project: Row; customer: Row | null } | null> {
  const project = await findProjectByParam(projectId);
  if (!project) return null;
  const customerId = String(project.customerId || '').trim();
  if (!customerId) return { project, customer: null };
  const customer = await findByIdOrLegacy(getPrisma().customer, customerId);
  return { project, customer: withExternalId(customer as Row | null) };
}
