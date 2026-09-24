/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TaskAutofillKbSource = {
  documentName: string;
  chunkIndex: number;
  score?: number;
};

export type TaskAutofillProfileSource = {
  label: string;
};

export type TaskAutofillLlmSource = {
  providerLabel: string;
  model?: string;
};

export type TaskAutofillLocalAiSource = {
  retrievalLabel: string;
};

export function formatTaskAutofillSourcesSection(
  lang: 'tr' | 'en',
  sources: {
    profileFields?: TaskAutofillProfileSource[];
    kbHits?: TaskAutofillKbSource[];
    llm?: TaskAutofillLlmSource;
    localAi?: TaskAutofillLocalAiSource;
  },
): string {
  const lines: string[] = [];

  if (sources.profileFields?.length) {
    const label = lang === 'tr' ? 'Firma profili' : 'Customer profile';
    lines.push(
      `- ${label}: ${sources.profileFields.map((f) => f.label).join(', ')}`,
    );
  }

  if (sources.kbHits?.length) {
    const prefix = lang === 'tr' ? 'Bilgi bankası' : 'Knowledge base';
    for (const hit of sources.kbHits) {
      lines.push(`- ${prefix}: ${hit.documentName} (#${hit.chunkIndex})`);
    }
  }

  if (sources.llm) {
    const label = lang === 'tr' ? 'Genel yapay zeka' : 'General AI';
    const modelPart = sources.llm.model
      ? `${sources.llm.providerLabel} · ${sources.llm.model}`
      : sources.llm.providerLabel;
    lines.push(`- ${label}: ${modelPart}`);
  }

  if (sources.localAi) {
    const label = lang === 'tr' ? 'Lokal AI' : 'Local AI';
    lines.push(`- ${label}: ${sources.localAi.retrievalLabel}`);
  }

  if (lines.length === 0) return '';

  const header = lang === 'tr' ? 'KAYNAKLAR:' : 'SOURCES:';
  return `\n\n${header}\n${lines.join('\n')}`;
}
