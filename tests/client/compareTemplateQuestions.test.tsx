import { describe, expect, it } from 'vitest';
import {
  compareQuestionsBySheetAndNumara,
  sortQuestionsBySheetAndNumara,
} from '../../src/lib/compareTemplateQuestions';
import type { Question } from '../../src/types';

function q(
  id: string,
  thematicGroup: string,
  numara?: number,
  order = 0,
): Question {
  return {
    id,
    templateId: 't1',
    sectorId: 's1',
    kod: 'K',
    baslik: 'B',
    soru: 'S',
    ilgiliBirum: '',
    aciklama: '',
    ornekYanit: '',
    raporYeri: '',
    thematicGroup,
    numara,
    isMandatory: false,
    order,
  };
}

describe('compareTemplateQuestions', () => {
  it('sorts by sheet name then numara', () => {
    const sorted = sortQuestionsBySheetAndNumara([
      q('3', 'Ekonomik', 2),
      q('1', 'Cevre', 1),
      q('2', 'Ekonomik', 1),
    ]);
    expect(sorted.map((row) => row.id)).toEqual(['1', '2', '3']);
  });

  it('falls back to order when numara is missing', () => {
    expect(
      compareQuestionsBySheetAndNumara(
        q('a', 'Genel Beyanlar', undefined, 5),
        q('b', 'Genel Beyanlar', undefined, 2),
      ),
    ).toBeGreaterThan(0);
  });
});
