/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  expandProjectQuestionsByBranch,
  type BranchRef,
} from './expandProjectQuestionsByBranch.ts';
import {
  questionIdsForDeletedProjectQuestion,
  syncAssignmentsAfterQuestionDeletion,
} from './assignmentQuestionSync.ts';
import {
  deleteProjectQuestionById,
  findStaleBranchProjectQuestions,
  insertProjectQuestions,
  loadCustomerBranches,
  resolveProjectCustomerId,
} from '../data/projectLibDataAccess.ts';

function rowToExpandInput(row: Record<string, unknown>) {
  return {
    kod: String(row.kod || ''),
    baslik: String(row.baslik || ''),
    soru: String(row.soru || ''),
    aciklama: String(row.aciklama || ''),
    soruCogaltma: 'sube_bazinda' as const,
    order: typeof row.order === 'number' ? row.order : 0,
  };
}

/**
 * Replaces project questions still marked `sube_bazinda` (never branch-expanded)
 * with one row per customer branch.
 */
export async function expandStaleBranchQuestionsInProject(
  projectId: string,
  options?: { customerId?: string },
): Promise<{ expandedFrom: number; inserted: number }> {
  const stale = await findStaleBranchProjectQuestions(projectId);

  if (stale.length === 0) {
    return { expandedFrom: 0, inserted: 0 };
  }

  const customerId = await resolveProjectCustomerId(projectId, options?.customerId);
  if (!customerId) {
    return { expandedFrom: 0, inserted: 0 };
  }

  const branches: BranchRef[] = await loadCustomerBranches(customerId);
  if (branches.length === 0) {
    return { expandedFrom: 0, inserted: 0 };
  }

  let inserted = 0;

  for (const row of stale) {
    const raw = row as Record<string, unknown>;
    const expanded = expandProjectQuestionsByBranch([rowToExpandInput(raw)], branches);
    if (expanded.length === 0) continue;

    await deleteProjectQuestionById(String(row.id || row._id));
    await syncAssignmentsAfterQuestionDeletion(projectId, {
      deletedQuestionIds: questionIdsForDeletedProjectQuestion(
        raw as { _id?: unknown; id?: string; legacyFirebaseId?: string; sourceQuestionId?: string },
      ),
    });

    const docs = expanded.map((fields) => ({
      projectId,
      sourceQuestionId: String(raw.sourceQuestionId || ''),
      sourceTemplateId: String(raw.sourceTemplateId || ''),
      pageId: raw.pageId ? String(raw.pageId) : undefined,
      sectorId: String(raw.sectorId || ''),
      domainIds: Array.isArray(raw.domainIds) ? raw.domainIds.map(String) : [],
      kod: fields.kod,
      baslik: String(raw.baslik || ''),
      soru: String(raw.soru || ''),
      ilgiliBirim: String(raw.ilgiliBirim || ''),
      aciklama: fields.aciklama,
      aciklamaVideoUrl: raw.aciklamaVideoUrl ? String(raw.aciklamaVideoUrl) : '',
      ornekYanit: String(raw.ornekYanit || ''),
      raporYeri: String(raw.raporYeri || ''),
      thematicGroup: String(raw.thematicGroup || ''),
      isMandatory: Boolean(raw.isMandatory),
      order: fields.order,
      answerFormat: raw.answerFormat as 'textarea' | 'integer' | 'decimal' | undefined,
      soruCogaltma: fields.soruCogaltma,
    }));

    await insertProjectQuestions(docs);
    inserted += docs.length;
  }

  return { expandedFrom: stale.length, inserted };
}
