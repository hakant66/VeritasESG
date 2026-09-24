import type { Question } from '../types';

export type TemplateQuestionImportInput = Omit<Question, 'id'>;

export type TemplateQuestionImportResult = {
  created: number;
  updated: number;
  removed: number;
};

export function normalizeQuestionKod(kod: string | undefined | null): string {
  return String(kod ?? '').trim();
}

export function normalizeImportText(value: string | undefined | null): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function buildTemplateQuestionImportKey(
  item: Pick<Question, 'thematicGroup' | 'kod' | 'soru'>,
): string {
  return [
    normalizeImportText(item.thematicGroup),
    normalizeQuestionKod(item.kod),
    normalizeImportText(item.soru),
  ].join('\u0001');
}

export function buildTemplateQuestionGroupKey(
  item: Pick<Question, 'thematicGroup' | 'kod'>,
): string {
  return [
    normalizeImportText(item.thematicGroup),
    normalizeQuestionKod(item.kod),
  ].join('\u0001');
}

function sortByImportOrder(a: Question, b: Question): number {
  const aNum = a.numara;
  const bNum = b.numara;
  const aHasNumara = typeof aNum === 'number' && Number.isFinite(aNum);
  const bHasNumara = typeof bNum === 'number' && Number.isFinite(bNum);
  if (aHasNumara && bHasNumara && aNum !== bNum) return aNum - bNum;
  if (aHasNumara !== bHasNumara) return aHasNumara ? -1 : 1;
  const orderDiff = (a.order ?? 0) - (b.order ?? 0);
  if (orderDiff !== 0) return orderDiff;
  return String(a.id).localeCompare(String(b.id));
}

export type TemplateQuestionImportIndex = {
  byExactKey: Map<string, Question[]>;
  byGroupKey: Map<string, Question[]>;
};

export function indexTemplateQuestionsForImport(
  questions: Question[],
): TemplateQuestionImportIndex {
  const byExactKey = new Map<string, Question[]>();
  const byGroupKey = new Map<string, Question[]>();

  for (const question of questions) {
    const kod = normalizeQuestionKod(question.kod);
    if (!kod) continue;

    const exactKey = buildTemplateQuestionImportKey(question);
    const exactBucket = byExactKey.get(exactKey) ?? [];
    exactBucket.push(question);
    byExactKey.set(exactKey, exactBucket);

    const groupKey = buildTemplateQuestionGroupKey(question);
    const groupBucket = byGroupKey.get(groupKey) ?? [];
    groupBucket.push(question);
    byGroupKey.set(groupKey, groupBucket);
  }

  for (const bucket of byExactKey.values()) {
    bucket.sort(sortByImportOrder);
  }
  for (const bucket of byGroupKey.values()) {
    bucket.sort(sortByImportOrder);
  }

  return { byExactKey, byGroupKey };
}

/** @deprecated Use indexTemplateQuestionsForImport for import matching. */
export function indexTemplateQuestionsByKod(
  questions: Pick<Question, 'id' | 'kod'>[],
): Map<string, Question[]> {
  const byKod = new Map<string, Question[]>();
  for (const question of questions) {
    const key = normalizeQuestionKod(question.kod);
    if (!key) continue;
    const bucket = byKod.get(key) ?? [];
    bucket.push(question as Question);
    byKod.set(key, bucket);
  }
  return byKod;
}

/** Fields refreshed from spreadsheet on match (template/sector ids stay on the row). */
export function templateQuestionImportPatch(
  item: TemplateQuestionImportInput,
): Partial<Question> {
  return {
    pageId: item.pageId,
    bolum: item.bolum,
    kod: item.kod,
    baslik: item.baslik,
    soru: item.soru,
    firmaYaniti: item.firmaYaniti,
    firmaYanitiYil1: item.firmaYanitiYil1,
    firmaYanitiYil2: item.firmaYanitiYil2,
    firmaYanitiYil3: item.firmaYanitiYil3,
    firmaNot: item.firmaNot,
    ilgiliBirim: item.ilgiliBirim,
    ilgiliBirum: item.ilgiliBirim ?? item.ilgiliBirum,
    veriDogrulugu: item.veriDogrulugu,
    aciklama: item.aciklama,
    aciklamaVideoUrl: item.aciklamaVideoUrl,
    ornekYanit: item.ornekYanit,
    dayanak: item.dayanak,
    onay: item.onay,
    raporYeri: item.raporYeri,
    reportingItr: item.reportingItr,
    tsrs1: item.tsrs1,
    tsrs2: item.tsrs2,
    sasbRtCh: item.sasbRtCh,
    gri: item.gri,
    msci: item.msci,
    esrs: item.esrs,
    numara: item.numara,
    thematicGroup: item.thematicGroup,
    isMandatory: item.isMandatory,
    order: item.order,
    answerFormat: item.answerFormat,
    soruCogaltma: item.soruCogaltma,
    updatedAt: item.updatedAt,
    updatedBy: item.updatedBy,
    updatedByName: item.updatedByName,
  };
}

function takeNextUnmatched(
  bucket: Question[] | undefined,
  cursor: number,
  matchedIds: Set<string>,
): { match?: Question; nextCursor: number } {
  if (!bucket?.length) return { nextCursor: cursor };

  let index = cursor;
  while (index < bucket.length) {
    const candidate = bucket[index];
    index += 1;
    if (!matchedIds.has(candidate.id)) {
      return { match: candidate, nextCursor: index };
    }
  }
  return { nextCursor: index };
}

export async function applyTemplateQuestionImport(options: {
  items: TemplateQuestionImportInput[];
  existing: Question[];
  upsertByKod: boolean;
  bulkCreate: (items: TemplateQuestionImportInput[]) => Promise<void>;
  update: (id: string, data: Partial<Question>) => Promise<void>;
  remove?: (id: string) => Promise<void>;
}): Promise<TemplateQuestionImportResult> {
  const { items, existing, upsertByKod, bulkCreate, update, remove } = options;

  if (!upsertByKod) {
    await bulkCreate(items);
    return { created: items.length, updated: 0, removed: 0 };
  }

  const { byExactKey, byGroupKey } = indexTemplateQuestionsForImport(existing);
  const matchedExistingIds = new Set<string>();
  const groupCursors = new Map<string, number>();
  const importedThematicGroups = new Set<string>();
  const toCreate: TemplateQuestionImportInput[] = [];
  let updated = 0;

  for (const item of items) {
    const thematicGroup = normalizeImportText(item.thematicGroup);
    if (thematicGroup) importedThematicGroups.add(thematicGroup);

    const kod = normalizeQuestionKod(item.kod);
    if (!kod) {
      toCreate.push(item);
      continue;
    }

    const exactKey = buildTemplateQuestionImportKey(item);
    const exactBucket = byExactKey.get(exactKey);
    const exactCursor = groupCursors.get(`exact:${exactKey}`) ?? 0;
    const exactTake = takeNextUnmatched(exactBucket, exactCursor, matchedExistingIds);
    groupCursors.set(`exact:${exactKey}`, exactTake.nextCursor);

    let match = exactTake.match;
    if (!match) {
      const groupKey = buildTemplateQuestionGroupKey(item);
      const groupBucket = byGroupKey.get(groupKey);
      const groupCursor = groupCursors.get(`group:${groupKey}`) ?? 0;
      const groupTake = takeNextUnmatched(groupBucket, groupCursor, matchedExistingIds);
      groupCursors.set(`group:${groupKey}`, groupTake.nextCursor);
      match = groupTake.match;
    }

    if (!match) {
      toCreate.push(item);
      continue;
    }

    matchedExistingIds.add(match.id);
    const patch = templateQuestionImportPatch(item);
    await update(match.id, patch);
    updated += 1;
  }

  if (toCreate.length > 0) {
    await bulkCreate(toCreate);
  }

  let removed = 0;
  if (remove) {
    for (const question of existing) {
      if (!importedThematicGroups.has(normalizeImportText(question.thematicGroup))) {
        continue;
      }
      if (matchedExistingIds.has(question.id)) continue;
      await remove(question.id);
      removed += 1;
    }
  }

  return { created: toCreate.length, updated, removed };
}
