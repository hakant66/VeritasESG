import {
  buildTemplatePageTitleMap,
  normalizePageTitle,
  resolveImportPageTitleToEnsure,
  resolveImportQuestionPageId,
  type TemplatePageRef,
} from "./templatePageSheetMapping";

export type ImportTemplatePage = TemplatePageRef;

export type ParsedImportQuestion = {
  atananSayfaTitle?: string;
  thematicGroup?: string;
  pageId?: string;
};

export { normalizePageTitle, buildTemplatePageTitleMap } from "./templatePageSheetMapping";

export type CreateImportTemplatePageInput = {
  templateId: string;
  title: string;
  order: number;
};

function resolveEnsurePageTitle<T extends ParsedImportQuestion>(
  item: T,
  defaultAtananSayfaTitle?: string,
): string | undefined {
  return resolveImportPageTitleToEnsure(item, defaultAtananSayfaTitle);
}

function resolveItemPageId<T extends ParsedImportQuestion>(options: {
  item: T;
  pageMap: Map<string, string>;
  defaultAtananSayfaTitle?: string;
  selectedPageId?: string;
}): string | undefined {
  return resolveImportQuestionPageId(options);
}

/**
 * Resolve ATANAN SAYFA column values to template page IDs.
 * Creates missing pages when a spreadsheet title is not found.
 */
export async function resolveImportAtananSayfaPages<T extends ParsedImportQuestion>(options: {
  items: T[];
  templateId: string;
  pages: ImportTemplatePage[];
  /** Used when the row has no ATANAN SAYFA cell value. Creates the page if needed. */
  defaultAtananSayfaTitle?: string;
  selectedPageId?: string;
  createPage: (input: CreateImportTemplatePageInput) => Promise<{ id: string }>;
}): Promise<Array<T & { pageId?: string }>> {
  const { items, templateId, selectedPageId, defaultAtananSayfaTitle, createPage } =
    options;
  const workingPages = [...options.pages];
  const pageMap = buildTemplatePageTitleMap(workingPages);

  const titlesToCreate = new Set<string>();
  for (const item of items) {
    const title = resolveEnsurePageTitle(item, defaultAtananSayfaTitle);
    if (!title) continue;
    const key = normalizePageTitle(title);
    if (!pageMap.has(key)) titlesToCreate.add(title);
  }

  for (const title of titlesToCreate) {
    const key = normalizePageTitle(title);
    if (pageMap.has(key)) continue;

    const created = await createPage({
      templateId,
      title,
      order: workingPages.length,
    });
    pageMap.set(key, created.id);
    workingPages.push({
      id: created.id,
      title,
      order: workingPages.length,
      templateId,
    });
  }

  return items.map((item) => {
    const { atananSayfaTitle: _drop, ...rest } = item as T & {
      atananSayfaTitle?: string;
    };
    const pageId = resolveItemPageId({
      item,
      pageMap,
      defaultAtananSayfaTitle,
      selectedPageId,
    });
    return {
      ...rest,
      pageId,
    };
  });
}
