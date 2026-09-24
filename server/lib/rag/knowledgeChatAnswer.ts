/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { countKbChunksByKbIds } from '../../data/kbRagDataAccess.ts';
import { generateTextFromPrompt } from '../llm/llmService.ts';
import { searchKnowledgeKbChunks, type KnowledgeKbSearchHit } from './searchKnowledgeKb.ts';

export type KnowledgeChatSource = {
  documentName: string;
  chunkIndex: number;
  score: number;
  textPreview: string;
};

export type KnowledgeChatUserContext = {
  projectName?: string;
  customerName?: string;
  domains?: string[];
};

export type KnowledgeChatAnswer = {
  answer: string;
  query: string;
  kbIds: string[];
  chunkCount: number;
  sources: KnowledgeChatSource[];
};

function dedupeHits(hits: KnowledgeKbSearchHit[]) {
  const seen = new Set<string>();
  const unique: KnowledgeKbSearchHit[] = [];
  for (const hit of hits) {
    const id = `${hit.documentId}:${hit.chunkIndex}`;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(hit);
  }
  return unique;
}

function buildContextBlock(hits: KnowledgeKbSearchHit[]) {
  return hits
    .map(
      (hit, idx) =>
        `[Chunk ${idx + 1} | SOURCE: ${hit.documentName} #${hit.chunkIndex} | score ${hit.score.toFixed(3)}]\n${hit.text}`,
    )
    .join('\n\n---\n\n');
}

export async function answerKnowledgeChatQuery(options: {
  query: string;
  kbIds: string[];
  lang?: 'tr' | 'en';
  userContext?: KnowledgeChatUserContext;
  customerId?: string;
  projectId?: string;
  limit?: number;
}): Promise<KnowledgeChatAnswer> {
  const query = options.query.trim();
  const kbIds = options.kbIds.map((id) => String(id).trim()).filter(Boolean);
  const lang = options.lang === 'tr' ? 'tr' : 'en';
  const userContext = options.userContext ?? {};

  if (!query) {
    throw new Error('Query is required');
  }
  if (kbIds.length === 0) {
    throw new Error('At least one knowledge base id is required');
  }

  const indexedChunkCount = await countKbChunksByKbIds(kbIds);
  if (indexedChunkCount === 0) {
    const noIndexMessage =
      lang === 'tr'
        ? 'Seçili bilgi bankalarında henüz indekslenmiş belge bulunmuyor. Belgeleri yükleyip **İndeksle** ile vektör indeksini oluşturun, ardından tekrar deneyin.'
        : 'No indexed documents exist in the selected knowledge bases yet. Upload files and run **Index** to build the vector index, then try again.';
    return {
      answer: noIndexMessage,
      query,
      kbIds,
      chunkCount: 0,
      sources: [],
    };
  }

  const hits = dedupeHits(
    await searchKnowledgeKbChunks({
      query,
      kbIds,
      customerId: options.customerId,
      projectId: options.projectId,
      limit: options.limit ?? 8,
    }),
  ).sort((a, b) => b.score - a.score);

  if (hits.length === 0) {
    const noHitsMessage =
      lang === 'tr'
        ? 'Sorunuzla eşleşen indekslenmiş pasaj bulunamadı. Daha spesifik bir soru deneyin veya ilgili belgelerin indekslendiğinden emin olun.'
        : 'No indexed passages matched your question. Try a more specific query or confirm the relevant documents are indexed.';
    return {
      answer: noHitsMessage,
      query,
      kbIds,
      chunkCount: indexedChunkCount,
      sources: [],
    };
  }

  const languageInstruction =
    lang === 'tr'
      ? 'You MUST write your entire answer in Turkish (Türkçe). Use English only for proper nouns, standard abbreviations (e.g. IFRS, ISSB), or verbatim quotes from the sources.'
      : 'You MUST write your entire answer in English. Use Turkish only when quoting text from the knowledge base context.';

  const noContextFallback =
    lang === 'tr'
      ? 'Bilgi tabanında bu konuya dair özel bir bilgi bulamadım; ancak genel standartlara dayanarak'
      : "I don't have specific information on that in the knowledge base, but based on general standards";

  const prompt = `You are an expert AI assistant specializing in corporate governance, sustainability, and domain-specific knowledge.
Your goal is to answer the user's question accurately using ONLY the retrieved knowledge-base chunks below.

RESPONSE LANGUAGE (mandatory): ${languageInstruction}

USER CONTEXT:
Project: ${userContext.projectName || 'N/A'}
Customer: ${userContext.customerName || 'N/A'}
Related Domains: ${userContext.domains?.join(', ') || 'Global'}

RETRIEVED KNOWLEDGE CHUNKS:
${buildContextBlock(hits)}

USER QUESTION:
${query}

INSTRUCTIONS:
1. Follow the RESPONSE LANGUAGE rule above for every sentence.
2. Answer using ONLY facts supported by the retrieved chunks. Do not invent data.
3. If the chunks do not contain enough information, begin with "${noContextFallback}..." and explain what is missing (still in the required response language).
4. Keep the tone professional, concise, and helpful.
5. Use Markdown for formatting.
6. Cite source document names inline when referencing specific facts (e.g. "according to *Report.pdf*").`;

  const answer = await generateTextFromPrompt(prompt);

  return {
    answer,
    query,
    kbIds,
    chunkCount: indexedChunkCount,
    sources: hits.map((hit) => ({
      documentName: hit.documentName,
      chunkIndex: hit.chunkIndex,
      score: hit.score,
      textPreview: hit.text.slice(0, 320),
    })),
  };
}
