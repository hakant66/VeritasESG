import { describe, expect, it, vi } from 'vitest';
import type { Question } from '../../src/types';
import {
  applyTemplateQuestionImport,
  buildTemplateQuestionGroupKey,
  buildTemplateQuestionImportKey,
  indexTemplateQuestionsByKod,
  indexTemplateQuestionsForImport,
  normalizeQuestionKod,
  templateQuestionImportPatch,
} from '../../src/lib/importTemplateQuestionsByKod';

function makeQuestion(
  id: string,
  kod: string,
  overrides: Partial<Question> = {},
): Question {
  return {
    id,
    templateId: 'tmpl-1',
    sectorId: 'sector-1',
    kod,
    baslik: 'Baslik',
    soru: 'Soru',
    ilgiliBirum: '',
    aciklama: '',
    ornekYanit: '',
    raporYeri: '',
    thematicGroup: 'Sheet',
    isMandatory: false,
    order: 0,
    ...overrides,
  };
}

describe('importTemplateQuestionsByKod', () => {
  it('indexes questions by trimmed kod', () => {
    const index = indexTemplateQuestionsByKod([
      makeQuestion('1', 'T1-KK-01'),
      makeQuestion('2', ' T1-KK-02 '),
    ]);
    expect(index.get('T1-KK-01')).toHaveLength(1);
    expect(index.get('T1-KK-02')).toHaveLength(1);
    expect(normalizeQuestionKod(' T1 ')).toBe('T1');
  });

  it('builds stable import keys scoped to sheet and question text', () => {
    expect(
      buildTemplateQuestionImportKey({
        thematicGroup: 'Ekonomik',
        kod: 'GRI 3-3',
        soru: 'Soru A',
      }),
    ).not.toBe(
      buildTemplateQuestionImportKey({
        thematicGroup: 'Cevre',
        kod: 'GRI 3-3',
        soru: 'Soru A',
      }),
    );
    expect(
      buildTemplateQuestionGroupKey({
        thematicGroup: 'Ekonomik',
        kod: 'GRI 3-3',
      }),
    ).toBe('Ekonomik\u0001GRI 3-3');
  });

  it('updates one matching row per import item and creates new ones', async () => {
    const existing = [
      makeQuestion('q1', 'T1-KK-01', { dayanak: '' }),
      makeQuestion('q-dup', 'T1-KK-01', { dayanak: '' }),
      makeQuestion('q2', 'T1-KK-02', { dayanak: '' }),
    ];
    const bulkCreate = vi.fn(async () => {});
    const update = vi.fn(async () => {});
    const remove = vi.fn(async () => {});

    const result = await applyTemplateQuestionImport({
      existing,
      upsertByKod: true,
      bulkCreate,
      update,
      remove,
      items: [
        {
          ...makeQuestion('', 'T1-KK-01', { dayanak: 'Dayanak 1' }),
          id: undefined as never,
        },
        {
          ...makeQuestion('', 'T1-KK-99', { dayanak: 'Dayanak 99' }),
          id: undefined as never,
        },
      ],
    });

    expect(result).toEqual({ created: 1, updated: 1, removed: 2 });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[1]).toMatchObject({ dayanak: 'Dayanak 1' });
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith('q2');
    expect(bulkCreate).toHaveBeenCalledTimes(1);
    expect(bulkCreate.mock.calls[0][0]).toHaveLength(1);
    expect(bulkCreate.mock.calls[0][0][0].kod).toBe('T1-KK-99');
  });

  it('does not cross-match the same KOD across different sheets', async () => {
    const existing = [
      makeQuestion('c1', 'GRI 3-3', {
        thematicGroup: 'Cevre',
        soru: 'Cevre sorusu',
        order: 0,
      }),
    ];
    const bulkCreate = vi.fn(async () => {});
    const update = vi.fn(async () => {});
    const remove = vi.fn(async () => {});

    const result = await applyTemplateQuestionImport({
      existing,
      upsertByKod: true,
      bulkCreate,
      update,
      remove,
      items: [
        {
          ...makeQuestion('', 'GRI 3-3', {
            thematicGroup: 'Ekonomik',
            soru: 'Ekonomik sorusu',
          }),
          id: undefined as never,
        },
      ],
    });

    expect(result).toEqual({ created: 1, updated: 0, removed: 0 });
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('matches repeated KOD rows by position within the same sheet', async () => {
    const existing = [
      makeQuestion('e1', 'GRI 3-3', {
        thematicGroup: 'Ekonomik',
        soru: 'Eski soru 1',
        order: 0,
      }),
      makeQuestion('e2', 'GRI 3-3', {
        thematicGroup: 'Ekonomik',
        soru: 'Eski soru 2',
        order: 1,
      }),
      makeQuestion('e3', 'GRI 3-3', {
        thematicGroup: 'Ekonomik',
        soru: 'Eski soru 3',
        order: 2,
      }),
    ];
    const bulkCreate = vi.fn(async () => {});
    const update = vi.fn(async () => {});
    const remove = vi.fn(async () => {});

    const result = await applyTemplateQuestionImport({
      existing,
      upsertByKod: true,
      bulkCreate,
      update,
      remove,
      items: [
        {
          ...makeQuestion('', 'GRI 3-3', {
            thematicGroup: 'Ekonomik',
            soru: 'Yeni soru 1',
            order: 0,
          }),
          id: undefined as never,
        },
        {
          ...makeQuestion('', 'GRI 3-3', {
            thematicGroup: 'Ekonomik',
            soru: 'Yeni soru 2',
            order: 1,
          }),
          id: undefined as never,
        },
      ],
    });

    expect(result).toEqual({ created: 0, updated: 2, removed: 1 });
    expect(update).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ soru: 'Yeni soru 1' }),
    );
    expect(update).toHaveBeenCalledWith(
      'e2',
      expect.objectContaining({ soru: 'Yeni soru 2' }),
    );
    expect(remove).toHaveBeenCalledWith('e3');
  });

  it('removes surplus rows only from imported sheets', async () => {
    const existing = [
      makeQuestion('eco-1', 'GRI 3-3', { thematicGroup: 'Ekonomik', order: 0 }),
      makeQuestion('eco-2', 'GRI 3-3', { thematicGroup: 'Ekonomik', order: 1 }),
      makeQuestion('env-1', 'GRI 3-3', { thematicGroup: 'Cevre', order: 0 }),
    ];
    const remove = vi.fn(async () => {});

    const result = await applyTemplateQuestionImport({
      existing,
      upsertByKod: true,
      bulkCreate: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
      remove,
      items: [
        {
          ...makeQuestion('', 'GRI 3-3', {
            thematicGroup: 'Ekonomik',
            soru: 'Tek satir',
            order: 0,
          }),
          id: undefined as never,
        },
      ],
    });

    expect(result.removed).toBe(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('eco-2');
    expect(remove).not.toHaveBeenCalledWith('env-1');
  });

  it('insert-only mode always bulk creates', async () => {
    const bulkCreate = vi.fn(async () => {});
    const update = vi.fn(async () => {});

    const result = await applyTemplateQuestionImport({
      existing: [makeQuestion('q1', 'T1-KK-01')],
      upsertByKod: false,
      bulkCreate,
      update,
      items: [
        {
          ...makeQuestion('', 'T1-KK-01'),
          id: undefined as never,
        },
      ],
    });

    expect(result).toEqual({ created: 1, updated: 0, removed: 0 });
    expect(update).not.toHaveBeenCalled();
    expect(bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('templateQuestionImportPatch keeps spreadsheet fields', () => {
    const patch = templateQuestionImportPatch({
      templateId: 'tmpl-1',
      sectorId: 'sector-1',
      kod: 'T1',
      baslik: 'B',
      soru: 'S',
      ilgiliBirum: '',
      ilgiliBirim: 'Finans',
      aciklama: 'A',
      ornekYanit: 'O',
      bolum: '1',
      dayanak: 'D',
      raporYeri: 'R',
      thematicGroup: 'G',
      isMandatory: true,
      order: 3,
      pageId: 'page-1',
      tsrs1: 'TSRS1',
      tsrs2: 'TSRS2',
      sasbRtCh: 'SASB',
      gri: 'GRI',
      msci: 'MSCI',
      esrs: 'ESRS',
    });

    expect(patch).toMatchObject({
      bolum: '1',
      dayanak: 'D',
      ilgiliBirim: 'Finans',
      pageId: 'page-1',
      tsrs1: 'TSRS1',
      tsrs2: 'TSRS2',
      sasbRtCh: 'SASB',
      gri: 'GRI',
      msci: 'MSCI',
      esrs: 'ESRS',
    });
    expect(patch).not.toHaveProperty('templateId');
  });

  it('indexes import rows by exact and group keys', () => {
    const index = indexTemplateQuestionsForImport([
      makeQuestion('1', 'GRI 3-3', { thematicGroup: 'Ekonomik', soru: 'A' }),
      makeQuestion('2', 'GRI 3-3', { thematicGroup: 'Ekonomik', soru: 'B' }),
    ]);

    expect(index.byExactKey.get('Ekonomik\u0001GRI 3-3\u0001A')).toHaveLength(1);
    expect(index.byGroupKey.get('Ekonomik\u0001GRI 3-3')).toHaveLength(2);
  });
});
