/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ProjectQuestion, Question } from '../types';
import { DEFAULT_SORU_COGALTMA } from './questionSoruCogaltma';

export const PROJECT_QUESTION_COPY_PLACEHOLDER = '....';

export function buildProjectQuestionCopyKod(kod: string): string {
  const base = String(kod || '').trim();
  if (!base) return '(copy)';
  if (/\(copy\)$/i.test(base)) return base;
  return `${base} (copy)`;
}

export function buildProjectQuestionCopyPayload(
  source: Question,
  draft: {
    kod: string;
    baslik: string;
    pageId: string;
    domainIds: string[];
    answerFormat: Question['answerFormat'];
  },
  projectId: string,
): Omit<ProjectQuestion, 'id' | 'updatedAt' | 'updatedBy' | 'updatedByName'> {
  const sourceOrder = typeof source.order === 'number' ? source.order : 0;
  return {
    projectId,
    sourceQuestionId: source.sourceQuestionId?.trim() || source.id,
    sourceTemplateId: source.templateId,
    sectorId: source.sectorId,
    pageId: draft.pageId.trim() || source.pageId || undefined,
    domainIds: [...draft.domainIds],
    kod: buildProjectQuestionCopyKod(draft.kod || source.kod),
    baslik: draft.baslik.trim() || source.baslik || '',
    soru: PROJECT_QUESTION_COPY_PLACEHOLDER,
    ilgiliBirum: source.ilgiliBirum || '',
    aciklama: '',
    aciklamaVideoUrl: '',
    ornekYanit: PROJECT_QUESTION_COPY_PLACEHOLDER,
    raporYeri: source.raporYeri || '',
    thematicGroup: source.thematicGroup || '',
    numara: source.numara,
    isMandatory: Boolean(source.isMandatory),
    order: sourceOrder + 1,
    answerFormat: draft.answerFormat ?? source.answerFormat ?? 'textarea',
    soruCogaltma: DEFAULT_SORU_COGALTMA,
  };
}

export function questionsToBumpForProjectCopy(
  questions: Question[],
  source: Question,
  newOrder: number,
): Question[] {
  const projectId = source.projectId;
  const pageKey = source.pageId || '';
  return questions.filter(
    (q) =>
      q.id !== source.id &&
      (projectId ? q.projectId === projectId : true) &&
      (q.pageId || '') === pageKey &&
      (typeof q.order === 'number' ? q.order : 0) >= newOrder,
  );
}
