import { describe, expect, it } from 'vitest';
import {
  findKimyaPageRenameRule,
  KIMYA_SAYISAL_PAGE_RENAMES,
  KIMYA_SOZEL_PAGE_RENAMES,
} from '../../../server/migrations/kimyaClassifierPageRenames.ts';

describe('kimyaClassifierPageRenames', () => {
  it('maps sayısal page titles including Çevre alias', () => {
    expect(findKimyaPageRenameRule('Ekonomik Sayisal', KIMYA_SAYISAL_PAGE_RENAMES)?.newTitle).toBe(
      'Ekonomik_Sayisal',
    );
    expect(findKimyaPageRenameRule('Çevre', KIMYA_SAYISAL_PAGE_RENAMES)?.newTitle).toBe(
      'Cevre_Sayisal',
    );
    expect(findKimyaPageRenameRule('Sosyal', KIMYA_SAYISAL_PAGE_RENAMES)?.newTitle).toBe(
      'Sosyal_Sayisal',
    );
  });

  it('maps sözel page titles', () => {
    expect(findKimyaPageRenameRule('Ekonomik Sozel', KIMYA_SOZEL_PAGE_RENAMES)?.newTitle).toBe(
      'Ekonomik_Sozel',
    );
    expect(findKimyaPageRenameRule('Cevre', KIMYA_SOZEL_PAGE_RENAMES)?.newTitle).toBe(
      'Cevre_Sozel',
    );
    expect(findKimyaPageRenameRule('Sosyal', KIMYA_SOZEL_PAGE_RENAMES)?.newTitle).toBe(
      'Sosyal_Sozel',
    );
  });
});
