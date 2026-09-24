export type TemplatePageRef = {
  id: string;
  title?: string;
  order?: number;
  templateId?: string;
  briefText?: string;
};

export type SheetMappedQuestion = {
  pageId?: string;
  thematicGroup?: string;
  atananSayfaTitle?: string;
};

export function normalizePageTitle(title: string | undefined | null): string {
  return String(title ?? "").trim().toLowerCase();
}

export function buildTemplatePageTitleMap(
  pages: TemplatePageRef[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const page of pages) {
    const key = normalizePageTitle(page.title);
    if (key && page.id) map.set(key, page.id);
  }
  return map;
}

/**
 * Resolve which template page a question belongs to.
 * Sheet name (`thematicGroup`) wins over a stale `pageId` when it matches a page title.
 */
export function resolveQuestionTemplatePageId(
  question: Pick<SheetMappedQuestion, "pageId" | "thematicGroup">,
  pages: TemplatePageRef[],
  pageMap: Map<string, string> = buildTemplatePageTitleMap(pages),
): string | undefined {
  const fromSheet = question.thematicGroup?.trim();
  if (fromSheet) {
    const fromSheetPageId = pageMap.get(normalizePageTitle(fromSheet));
    if (fromSheetPageId) return fromSheetPageId;
  }

  const pageId = question.pageId?.trim();
  if (pageId && pages.some((page) => page.id === pageId)) return pageId;

  return pageId || undefined;
}

export function questionMatchesTemplatePageFilter(
  question: Pick<SheetMappedQuestion, "pageId" | "thematicGroup">,
  pageIdFilter: string,
  pages: TemplatePageRef[],
): boolean {
  if (!pageIdFilter) return true;
  return resolveQuestionTemplatePageId(question, pages) === pageIdFilter;
}

/**
 * Import-time page resolution:
 * 1. ATANAN SAYFA column
 * 2. Excel sheet / thematicGroup when it matches a template page title
 * 3. Default page title from import mapping
 * 4. Selected page in import UI
 */
export function resolveImportQuestionPageId(options: {
  item: SheetMappedQuestion;
  pageMap: Map<string, string>;
  defaultAtananSayfaTitle?: string;
  selectedPageId?: string;
}): string | undefined {
  const { item, pageMap, defaultAtananSayfaTitle, selectedPageId } = options;

  if (item.atananSayfaTitle?.trim()) {
    return pageMap.get(normalizePageTitle(item.atananSayfaTitle));
  }

  if (item.thematicGroup?.trim()) {
    const fromSheet = pageMap.get(normalizePageTitle(item.thematicGroup));
    if (fromSheet) return fromSheet;
  }

  if (defaultAtananSayfaTitle?.trim()) {
    return pageMap.get(normalizePageTitle(defaultAtananSayfaTitle));
  }

  if (selectedPageId) return selectedPageId;

  if (item.thematicGroup?.trim()) {
    return pageMap.get(normalizePageTitle(item.thematicGroup));
  }

  return undefined;
}

export function resolveImportPageTitleToEnsure(
  item: SheetMappedQuestion,
  defaultAtananSayfaTitle?: string,
): string | undefined {
  if (item.atananSayfaTitle?.trim()) return item.atananSayfaTitle.trim();
  if (item.thematicGroup?.trim()) return item.thematicGroup.trim();
  if (defaultAtananSayfaTitle?.trim()) return defaultAtananSayfaTitle.trim();
  return undefined;
}

export function collectSheetPageSyncUpdates(
  questions: Array<Pick<SheetMappedQuestion, "id" | "pageId" | "thematicGroup"> & { id: string }>,
  pages: TemplatePageRef[],
): Array<{ id: string; pageId: string }> {
  const pageMap = buildTemplatePageTitleMap(pages);
  const updates: Array<{ id: string; pageId: string }> = [];

  for (const question of questions) {
    const resolved = resolveQuestionTemplatePageId(question, pages, pageMap);
    if (!resolved || question.pageId === resolved) continue;
    updates.push({ id: question.id, pageId: resolved });
  }

  return updates;
}
