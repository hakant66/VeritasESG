import { describe, expect, it, vi } from 'vitest';
import { resolveImportAtananSayfaPages } from '../../src/lib/resolveImportAtananSayfa';

describe('resolveImportAtananSayfaPages', () => {
  it('prefers ATANAN SAYFA column over thematic group', async () => {
    const createPage = vi.fn();
    const result = await resolveImportAtananSayfaPages({
      templateId: 'tmpl-1',
      pages: [
        { id: 'page-a', title: 'Sayfa A' },
        { id: 'page-b', title: 'Sayfa B' },
      ],
      createPage,
      items: [
        {
          kod: 'T1',
          thematicGroup: 'TSRS 1 Soru Seti',
          atananSayfaTitle: 'Sayfa B',
        },
      ],
    });

    expect(result[0].pageId).toBe('page-b');
    expect(createPage).not.toHaveBeenCalled();
  });

  it('creates a page when ATANAN SAYFA title is unknown', async () => {
    const createPage = vi.fn(async () => ({ id: 'page-new' }));
    const result = await resolveImportAtananSayfaPages({
      templateId: 'tmpl-1',
      pages: [],
      createPage,
      items: [{ kod: 'T1', atananSayfaTitle: 'Yeni Sayfa' }],
    });

    expect(createPage).toHaveBeenCalledWith({
      templateId: 'tmpl-1',
      title: 'Yeni Sayfa',
      order: 0,
    });
    expect(result[0].pageId).toBe('page-new');
  });

  it('uses default page title when ATANAN SAYFA cell is empty and sheet has no page match', async () => {
    const createPage = vi.fn(async () => ({ id: 'page-default' }));
    const result = await resolveImportAtananSayfaPages({
      templateId: 'tmpl-1',
      pages: [],
      defaultAtananSayfaTitle: 'Genel Beyanlar',
      createPage,
      items: [{ kod: 'T1', thematicGroup: 'Genel Beyanlar' }],
    });

    expect(createPage).toHaveBeenCalledWith({
      templateId: 'tmpl-1',
      title: 'Genel Beyanlar',
      order: 0,
    });
    expect(result[0].pageId).toBe('page-default');
  });

  it('prefers thematic group sheet over default import page title when page exists', async () => {
    const createPage = vi.fn();
    const result = await resolveImportAtananSayfaPages({
      templateId: 'tmpl-1',
      pages: [
        { id: 'page-genel', title: 'Genel Beyanlar' },
        { id: 'page-ekonomik', title: 'Ekonomik' },
      ],
      defaultAtananSayfaTitle: 'Genel Beyanlar',
      createPage,
      items: [{ kod: 'T1', thematicGroup: 'Ekonomik' }],
    });

    expect(result[0].pageId).toBe('page-ekonomik');
    expect(createPage).not.toHaveBeenCalled();
  });

  it('creates only one page when many rows share the same default title', async () => {
    let created = 0;
    const createPage = vi.fn(async ({ title, order }) => {
      created += 1;
      return { id: `page-${created}` };
    });
    const items = Array.from({ length: 71 }, (_, index) => ({
      kod: `T${index + 1}`,
      thematicGroup: 'TSRS 2 Soru Seti',
    }));

    const result = await resolveImportAtananSayfaPages({
      templateId: 'tmpl-1',
      pages: [],
      defaultAtananSayfaTitle: 'TSRS 2 Soru Seti',
      createPage,
      items,
    });

    expect(createPage).toHaveBeenCalledTimes(1);
    expect(createPage).toHaveBeenCalledWith({
      templateId: 'tmpl-1',
      title: 'TSRS 2 Soru Seti',
      order: 0,
    });
    expect(result).toHaveLength(71);
    expect(new Set(result.map((row) => row.pageId))).toEqual(new Set(['page-1']));
  });
});
