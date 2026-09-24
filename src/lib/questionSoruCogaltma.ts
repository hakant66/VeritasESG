/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SORU_COGALTMA_VALUES = ['yok', 'sube_bazinda'] as const;

/** How a template question is duplicated for respondents. */
export type QuestionSoruCogaltma = (typeof SORU_COGALTMA_VALUES)[number];

export const DEFAULT_SORU_COGALTMA: QuestionSoruCogaltma = 'yok';

export function normalizeQuestionSoruCogaltma(
  raw: string | undefined | null,
): QuestionSoruCogaltma {
  const s = raw?.trim().toLowerCase();
  if (
    s === 'sube_bazinda' ||
    s === 'sube bazında' ||
    s === 'sube bazinda' ||
    s === 'by_branch'
  ) {
    return 'sube_bazinda';
  }
  return 'yok';
}
