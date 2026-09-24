import { describe, expect, it } from 'vitest';
import {
  collectSheetPageSyncUpdates,
  questionMatchesTemplatePageFilter,
  resolveImportQuestionPageId,
  resolveQuestionTemplatePageId,
} from '../../src/lib/templatePageSheetMapping';

const pages = [
  { id: 'page-genel', title: 'Genel Beyanlar' },
  { id: 'page-ekonomik', title: 'Ekonomik' },
  { id: 'page-cevre', title: 'Cevre' },
];

describe('templatePageSheetMapping', () => {
  it('maps Ekonomik sheet to Ekonomik page even when pageId points elsewhere', () => {
    expect(
      resolveQuestionTemplatePageId(
        { pageId: 'page-genel', thematicGroup: 'Ekonomik' },
        pages,
      ),
    ).toBe('page-ekonomik');
  });

  it('filters questions by sheet name when page filter is selected', () => {
    const question = { pageId: 'page-genel', thematicGroup: 'Ekonomik' };
    expect(questionMatchesTemplatePageFilter(question, 'page-ekonomik', pages)).toBe(
      true,
    );
    expect(questionMatchesTemplatePageFilter(question, 'page-genel', pages)).toBe(
      false,
    );
  });

  it('prefers thematic group over default import page title', () => {
    const pageMap = new Map([
      ['genel beyanlar', 'page-genel'],
      ['ekonomik', 'page-ekonomik'],
    ]);

    expect(
      resolveImportQuestionPageId({
        item: { thematicGroup: 'Ekonomik' },
        pageMap,
        defaultAtananSayfaTitle: 'Genel Beyanlar',
      }),
    ).toBe('page-ekonomik');
  });

  it('collects sync updates when stored pageId differs from sheet mapping', () => {
    const updates = collectSheetPageSyncUpdates(
      [
        {
          id: 'q1',
          pageId: 'page-genel',
          thematicGroup: 'Ekonomik',
        },
      ],
      pages,
    );

    expect(updates).toEqual([{ id: 'q1', pageId: 'page-ekonomik' }]);
  });
});
