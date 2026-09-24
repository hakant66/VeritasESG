/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const AI_ANSWER_DISCLAIMER_TR =
  'AI ile cevaplanmistir, lutfen kontrol ediniz ve onaylayiniz';

export const AI_ANSWER_DISCLAIMER_EN =
  'Answered with AI — please review and confirm.';

export function aiAnswerDisclaimer(lang: 'tr' | 'en'): string {
  return lang === 'tr' ? AI_ANSWER_DISCLAIMER_TR : AI_ANSWER_DISCLAIMER_EN;
}

export function applyAiAnswerDisclaimer(text: string, lang: 'tr' | 'en'): string {
  const disclaimer = aiAnswerDisclaimer(lang);
  const trimmed = text.trim();
  if (!trimmed) return disclaimer;
  if (trimmed.startsWith(disclaimer)) return trimmed;
  return `${disclaimer}\n\n${trimmed}`;
}

export function hasAiAnswerDisclaimer(text: string, lang: 'tr' | 'en'): boolean {
  return text.trimStart().startsWith(aiAnswerDisclaimer(lang));
}
