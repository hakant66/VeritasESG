import type { Question } from '../types';

/** Default display order: sheet name (thematicGroup), then spreadsheet NUMARA, then legacy order. */
export function compareQuestionsBySheetAndNumara(
  a: Pick<Question, 'thematicGroup' | 'numara' | 'order' | 'id'>,
  b: Pick<Question, 'thematicGroup' | 'numara' | 'order' | 'id'>,
): number {
  const sheetCmp = (a.thematicGroup || '').localeCompare(
    b.thematicGroup || '',
    undefined,
    { sensitivity: 'base' },
  );
  if (sheetCmp !== 0) return sheetCmp;

  const aNum = a.numara;
  const bNum = b.numara;
  const aHasNumara = typeof aNum === 'number' && Number.isFinite(aNum);
  const bHasNumara = typeof bNum === 'number' && Number.isFinite(bNum);
  if (aHasNumara && bHasNumara && aNum !== bNum) return aNum - bNum;
  if (aHasNumara !== bHasNumara) return aHasNumara ? -1 : 1;

  const orderDiff = (a.order ?? 0) - (b.order ?? 0);
  if (orderDiff !== 0) return orderDiff;

  return String(a.id || '').localeCompare(String(b.id || ''));
}

export function sortQuestionsBySheetAndNumara<T extends Question>(questions: T[]): T[] {
  return [...questions].sort(compareQuestionsBySheetAndNumara);
}
