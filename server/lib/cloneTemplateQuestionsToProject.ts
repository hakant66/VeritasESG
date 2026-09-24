/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  expandProjectQuestionsByBranch,
  type BranchRef,
} from './expandProjectQuestionsByBranch.ts';
import { documentPublicId } from './questionIds.ts';
import {
  deleteProjectQuestionsByProject,
  insertProjectQuestions,
  listProjectPages,
  listTemplateQuestions,
  loadCustomerBranches,
  resolveProjectCustomerId,
} from '../data/projectLibDataAccess.ts';

function compareTemplateQuestionsBySheetAndNumara(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): number {
  const sheetCmp = String(a.thematicGroup || '').localeCompare(
    String(b.thematicGroup || ''),
    undefined,
    { sensitivity: 'base' },
  );
  if (sheetCmp !== 0) return sheetCmp;
  const aNum = a.numara;
  const bNum = b.numara;
  const aHas = typeof aNum === 'number' && Number.isFinite(aNum);
  const bHas = typeof bNum === 'number' && Number.isFinite(bNum);
  if (aHas && bHas && aNum !== bNum) return (aNum as number) - (bNum as number);
  if (aHas !== bHas) return aHas ? -1 : 1;
  return (typeof a.order === 'number' ? a.order : 0) - (typeof b.order === 'number' ? b.order : 0);
}

function optionalStringField(q: Record<string, unknown>, key: string): string {
  const value = q[key];
  return typeof value === 'string' ? value : '';
}

function pickQuestionFields(q: Record<string, unknown>) {
  return {
    sectorId: String(q.sectorId || ''),
    domainIds: Array.isArray(q.domainIds) ? q.domainIds.map(String) : [],
    bolum: optionalStringField(q, 'bolum'),
    kod: String(q.kod || ''),
    baslik: String(q.baslik || ''),
    soru: String(q.soru || ''),
    firmaYaniti: optionalStringField(q, 'firmaYaniti'),
    firmaYanitiYil1: optionalStringField(q, 'firmaYanitiYil1'),
    firmaYanitiYil2: optionalStringField(q, 'firmaYanitiYil2'),
    firmaYanitiYil3: optionalStringField(q, 'firmaYanitiYil3'),
    firmaNot: optionalStringField(q, 'firmaNot'),
    ilgiliBirim: String(q.ilgiliBirim || ''),
    veriDogrulugu: optionalStringField(q, 'veriDogrulugu'),
    aciklama: String(q.aciklama || ''),
    aciklamaVideoUrl: q.aciklamaVideoUrl ? String(q.aciklamaVideoUrl) : '',
    ornekYanit: String(q.ornekYanit || ''),
    dayanak: optionalStringField(q, 'dayanak'),
    onay: optionalStringField(q, 'onay'),
    raporYeri: String(q.raporYeri || ''),
    reportingItr: optionalStringField(q, 'reportingItr'),
    tsrs1: optionalStringField(q, 'tsrs1'),
    tsrs2: optionalStringField(q, 'tsrs2'),
    sasbRtCh: optionalStringField(q, 'sasbRtCh'),
    gri: optionalStringField(q, 'gri'),
    msci: optionalStringField(q, 'msci'),
    esrs: optionalStringField(q, 'esrs'),
    kayit: optionalStringField(q, 'kayit'),
    thematicGroup: String(q.thematicGroup || ''),
    ...(typeof q.numara === 'number' && Number.isFinite(q.numara)
      ? { numara: q.numara as number }
      : {}),
    isMandatory: Boolean(q.isMandatory),
    order: typeof q.order === 'number' ? q.order : 0,
    answerFormat: q.answerFormat as 'textarea' | 'integer' | 'decimal' | undefined,
    soruCogaltma:
      q.soruCogaltma === 'sube_bazinda' ? ('sube_bazinda' as const) : ('yok' as const),
  };
}

/**
 * Copies all template questions into projectQuestions for a project.
 * Maps template page ids to project page ids via sourceTemplatePageId.
 * Questions with soruCogaltma `sube_bazinda` are cloned once per customer branch.
 */
export async function cloneTemplateQuestionsToProject(
  projectId: string,
  templateId: string,
  options?: { deleteExisting?: boolean; customerId?: string },
): Promise<{ count: number }> {
  if (options?.deleteExisting) {
    await deleteProjectQuestionsByProject(projectId);
  }

  const customerId = await resolveProjectCustomerId(projectId, options?.customerId);

  const [templateQuestions, projectPages, branches] = await Promise.all([
    listTemplateQuestions(templateId),
    listProjectPages(projectId),
    customerId ? loadCustomerBranches(customerId) : Promise.resolve([] as BranchRef[]),
  ]);

  const pageMap = new Map<string, string>();
  for (const page of projectPages) {
    const projectPageId = documentPublicId(page as { legacyFirebaseId?: string; _id?: unknown; id?: string });
    const sourceTemplatePageId = (page as { sourceTemplatePageId?: string }).sourceTemplatePageId;
    if (sourceTemplatePageId && projectPageId) {
      pageMap.set(sourceTemplatePageId, projectPageId);
    }
  }

  const sortedTemplateQuestions = [...templateQuestions].sort(
    compareTemplateQuestionsBySheetAndNumara,
  );

  const baseDocs = sortedTemplateQuestions.map((q) => {
    const raw = q as Record<string, unknown>;
    const templatePageId = raw.pageId ? String(raw.pageId) : undefined;
    const projectPageId = templatePageId ? pageMap.get(templatePageId) : undefined;
    return {
      projectId,
      sourceQuestionId: documentPublicId(q as { legacyFirebaseId?: string; _id?: unknown; id?: string }),
      sourceTemplateId: templateId,
      pageId: projectPageId,
      ...pickQuestionFields(raw),
    };
  });

  const docs = expandProjectQuestionsByBranch(baseDocs, branches);
  await insertProjectQuestions(docs);

  return { count: docs.length };
}
