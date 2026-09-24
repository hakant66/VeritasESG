/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Language } from './i18n';
import type { ChatSampleQuestionsContext } from '../services/gemini';

/** Client-side fallback when Gemini is unavailable or fails. */
export function buildContextualFallbackSampleQuestions(
  lang: Language,
  context: ChatSampleQuestionsContext,
  staticDefaults: string[],
): string[] {
  const kb = context.knowledgeBaseNames[0];
  const doc = context.documentNames[0];
  const proj = context.projectName;
  const year = String(new Date().getFullYear());

  if (lang === 'tr') {
    const allScope = context.scope === 'all';
    return [
      doc
        ? `“${doc}” belgesinde hangi ana konular ve gereklilikler var?`
        : kb
          ? `“${kb}” bilgi bankası hangi konuları kapsıyor?`
          : staticDefaults[0]?.replace('{year}', year) ?? `${year} için temel uyum gereklilikleri nelerdir?`,
      allScope
        ? 'Erişebildiğim bilgi bankalarının kapsamını ve birbirleriyle ilişkisini özetler misin?'
        : kb
          ? `“${kb}” için raporlama ve uyum açısından kritik maddeler nelerdir?`
          : staticDefaults[1] ?? 'Raporlama standartlarına göre nelere dikkat etmeliyiz?',
      proj
        ? `“${proj}” projesi için bilgi bankasından çıkarılabilecek sürdürülebilirlik hedefleri nelerdir?`
        : staticDefaults[2] ?? 'Sektörümüz için insan hakları ve sürdürülebilirlik politikası özeti nedir?',
      context.documentNames[1]
        ? `“${context.documentNames[1]}” ile diğer kaynaklar arasında nasıl bir bağlantı var?`
        : staticDefaults[3] ?? 'Bilgi bankasındaki en önemli uyum riskleri nelerdir?',
    ];
  }

  const allScope = context.scope === 'all';
  return [
    doc
      ? `What are the main topics and requirements in "${doc}"?`
      : kb
        ? `What subjects does the "${kb}" knowledge base cover?`
        : staticDefaults[0]?.replace('{year}', year) ?? `What are the key compliance requirements for ${year}?`,
    allScope
      ? 'Can you summarize the scope of my accessible knowledge bases and how they relate?'
      : kb
        ? `What are the critical compliance and reporting points for "${kb}"?`
        : staticDefaults[1] ?? 'How should we approach reporting standards in our context?',
    proj
      ? `What sustainability targets or obligations for "${proj}" appear in the knowledge base?`
      : staticDefaults[2] ?? 'Can you summarize human rights and sustainability policy for our sector?',
    context.documentNames[1]
      ? `How does "${context.documentNames[1]}" relate to the other sources in this context?`
      : staticDefaults[3] ?? 'What are the top compliance risks highlighted in the knowledge base?',
  ];
}
