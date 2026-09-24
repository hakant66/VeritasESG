/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rename overlapping Kimya classifier template pages before merging into
 * Kimya_Sektoru_Siniflandirmali.
 */

export type KimyaPageRenameRule = {
  /** Exact template page titles / sheet names to replace */
  oldTitles: string[];
  newTitle: string;
};

export const KIMYA_SAYISAL_TEMPLATE_NAME = 'Kimya_Sektorü_Sayısal_Sınıflandırmalı';
export const KIMYA_SOZEL_TEMPLATE_NAME = 'Kimya_Sektoru_Sozel_Siniflandirmali';

export const KIMYA_SAYISAL_PAGE_RENAMES: KimyaPageRenameRule[] = [
  { oldTitles: ['Ekonomik', 'Ekonomik Sayisal'], newTitle: 'Ekonomik_Sayisal' },
  { oldTitles: ['Cevre', 'Çevre'], newTitle: 'Cevre_Sayisal' },
  { oldTitles: ['Sosyal'], newTitle: 'Sosyal_Sayisal' },
];

export const KIMYA_SOZEL_PAGE_RENAMES: KimyaPageRenameRule[] = [
  { oldTitles: ['Ekonomik', 'Ekonomik Sozel'], newTitle: 'Ekonomik_Sozel' },
  { oldTitles: ['Cevre', 'Çevre'], newTitle: 'Cevre_Sozel' },
  { oldTitles: ['Sosyal'], newTitle: 'Sosyal_Sozel' },
];

export function findKimyaPageRenameRule(
  title: string,
  rules: KimyaPageRenameRule[],
): KimyaPageRenameRule | undefined {
  const trimmed = title.trim();
  if (!trimmed) return undefined;
  return rules.find((rule) => rule.oldTitles.some((old) => old === trimmed));
}

export function collectKimyaOldThematicGroups(rules: KimyaPageRenameRule[]): string[] {
  const set = new Set<string>();
  for (const rule of rules) {
    for (const old of rule.oldTitles) set.add(old);
  }
  return [...set];
}
