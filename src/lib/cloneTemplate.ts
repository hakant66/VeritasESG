/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as DB from '../services/db';
import type { Question, Template, TemplatePage } from '../types';

const QUESTION_CLONE_BATCH_SIZE = 450;

export function buildClonedTemplateName(sourceName: string): string {
  const base = sourceName.trim();
  if (!base) return 'Kopya';
  const match = base.match(/^(.+?) \((Kopya|Copy)(?: (\d+))?\)$/i);
  if (match) {
    const stem = match[1].trim();
    const next = match[3] ? Number.parseInt(match[3], 10) + 1 : 2;
    return `${stem} (Kopya ${next})`;
  }
  return `${base} (Kopya)`;
}

function omitQuestionCloneMeta(question: Question): Omit<Question, 'id'> {
  const {
    id: _id,
    legacyFirebaseId: _legacyFirebaseId,
    updatedAt: _updatedAt,
    updatedBy: _updatedBy,
    updatedByName: _updatedByName,
    projectId: _projectId,
    sourceQuestionId: _sourceQuestionId,
    templateId: _templateId,
    sectorId: _sectorId,
    pageId: _pageId,
    ...rest
  } = question;
  return rest as Omit<Question, 'id'>;
}

export async function cloneTemplate(options: {
  sourceTemplateId: string;
  name: string;
  sectorId: string;
}): Promise<Template> {
  const { sourceTemplateId, name, sectorId } = options;
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Template name is required');
  }

  const sourceTemplate = await DB.templates.get(sourceTemplateId);
  if (!sourceTemplate) {
    throw new Error('Source template not found');
  }

  const created = await DB.templates.create({ name: trimmedName, sectorId });
  if (!created?.id) {
    throw new Error('Failed to create cloned template');
  }

  const pagesSnap = await DB.getDocs(
    DB.query(
      DB.getCol('templatePages'),
      DB.where('templateId', '==', sourceTemplateId),
    ),
  );
  const sourcePages = (pagesSnap.docs || [])
    .map((doc) => ({ id: doc.id, ...(doc.data() as TemplatePage) }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const pageIdMap = new Map<string, string>();
  for (const page of sourcePages) {
    const createdPage = await DB.addDoc(DB.collection(DB.db, 'templatePages'), {
      templateId: created.id,
      title: page.title,
      order: page.order ?? 0,
      briefText: page.briefText ?? '',
      ...(page.briefFileUrl ? { briefFileUrl: page.briefFileUrl } : {}),
      ...(page.pageKind ? { pageKind: page.pageKind } : {}),
    });
    pageIdMap.set(page.id, createdPage.id);
  }

  const sourceQuestions = await DB.questions.listByTemplate(sourceTemplateId);
  const questionPayloads: Omit<Question, 'id'>[] = sourceQuestions.map((question) => {
    const base = omitQuestionCloneMeta(question);
    const mappedPageId =
      question.pageId && pageIdMap.has(question.pageId)
        ? pageIdMap.get(question.pageId)
        : question.pageId;
    return {
      ...base,
      templateId: created.id,
      sectorId,
      pageId: mappedPageId,
      ilgiliBirum: question.ilgiliBirum ?? question.ilgiliBirim ?? '',
      ilgiliBirim: question.ilgiliBirim ?? question.ilgiliBirum ?? '',
    };
  });

  for (let i = 0; i < questionPayloads.length; i += QUESTION_CLONE_BATCH_SIZE) {
    await DB.questions.bulkCreate(
      questionPayloads.slice(i, i + QUESTION_CLONE_BATCH_SIZE),
    );
  }

  return created;
}
