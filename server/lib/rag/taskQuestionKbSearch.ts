/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getRerankTopN,
  isKbHybridSearchEnabled,
  isRerankEnabled,
} from '../../../lib/ragSearchConfig.ts';
import {
  countKbChunksByCustomer,
  findKbDocumentsByIds,
  searchKbChunksByKeywordRegex,
} from '../../data/kbRagDataAccess.ts';
import { retrieveCustomerKbChunks, type CustomerKbSearchHit } from './searchCustomerKb.ts';
import { rerankKbHits } from './rerankKbHits.ts';

type QuestionDoc = {
  kod?: string;
  baslik?: string;
  soru?: string;
  aciklama?: string;
  ilgiliBirim?: string;
  ilgiliBirun?: string;
};

const KEYWORD_HIT_BASE_SCORE = 0.97;

function dedupeHits(hits: CustomerKbSearchHit[]) {
  const seen = new Set<string>();
  const unique: CustomerKbSearchHit[] = [];
  for (const hit of hits) {
    const id = `${hit.documentId}:${hit.chunkIndex}`;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(hit);
  }
  return unique;
}

export function buildTaskQuestionSearchQuery(question: QuestionDoc): string {
  return [
    question.kod,
    question.baslik,
    question.soru,
    question.aciklama,
    question.ilgiliBirim || question.ilgiliBirun,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

function questionTextBlob(question: QuestionDoc): string {
  return [question.baslik, question.soru, question.aciklama]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function isHeadquartersQuestion(question: QuestionDoc): boolean {
  const text = questionTextBlob(question);
  return /genel merkez|headquarters|registered office|merkez adres|merkez ofis|kayıtlı adres/.test(
    text,
  );
}

export function buildTaskQuestionSearchQueries(
  question: QuestionDoc,
  customerName: string,
): string[] {
  const queries = new Set<string>();
  const base = buildTaskQuestionSearchQuery(question);
  const soru = String(question.soru ?? '').trim();

  if (base) queries.add(base);
  if (soru) queries.add(soru);
  if (customerName && soru) queries.add(`${customerName} ${soru}`);

  if (isHeadquartersQuestion(question)) {
    queries.add(`${customerName} genel merkez adres kayıtlı merkez`);
    queries.add(
      'şirket unvanı ticari ünvan adres genel merkez vergi numarası web sitesi şirket tanımı',
    );
    queries.add('genel merkez adres headquarters registered office merkez ofis');
  }

  return [...queries].filter(Boolean);
}

function scoreKeywordChunk(text: string, customerName: string): number {
  let score = KEYWORD_HIT_BASE_SCORE;
  const lower = text.toLowerCase();
  const nameToken = customerName.trim().split(/\s+/)[0]?.toLowerCase();
  if (nameToken && nameToken.length > 2 && lower.includes(nameToken)) {
    score += 0.02;
  }
  return Math.min(score, 0.99);
}

async function supplementKbHitsByKeywords(
  customerId: string,
  question: QuestionDoc,
  customerName: string,
): Promise<CustomerKbSearchHit[]> {
  const keywords: string[] = [];
  if (isHeadquartersQuestion(question)) {
    keywords.push(
      'genel merkez',
      'merkez adres',
      'kayıtlı adres',
      'headquarters',
      'registered office',
    );
  }

  if (keywords.length === 0) return [];

  const chunks = await searchKbChunksByKeywordRegex(customerId, keywords, 10);

  if (chunks.length === 0) return [];

  const docIds = [...new Set(chunks.map((chunk) => String(chunk.documentId)))];
  const docs = await findKbDocumentsByIds(docIds);
  const docNameById = new Map(
    docs.map((doc) => [String(doc.id || doc._id), String(doc.name || 'Document')]),
  );

  return chunks.map((chunk) => ({
    score: scoreKeywordChunk(String(chunk.text ?? ''), customerName),
    kbId: String(chunk.kbId),
    documentId: String(chunk.documentId),
    documentName: docNameById.get(String(chunk.documentId)) || 'Document',
    chunkIndex: Number(chunk.chunkIndex),
    text: String(chunk.text ?? ''),
    customerId,
  }));
}

export async function searchKbHitsForTaskQuestion(
  customerId: string,
  question: QuestionDoc,
  customerName: string,
  options?: { vectorLimitPerQuery?: number; maxHits?: number },
): Promise<{ hits: CustomerKbSearchHit[]; chunkCount: number }> {
  const chunkCount = await countKbChunksByCustomer(customerId);
  if (chunkCount === 0) {
    return { hits: [], chunkCount: 0 };
  }

  const perQuery = options?.vectorLimitPerQuery ?? 6;
  const maxHits = options?.maxHits ?? 12;
  const queries = buildTaskQuestionSearchQueries(question, customerName);

  const allHits: CustomerKbSearchHit[] = [];
  for (const query of queries) {
    const batch = await retrieveCustomerKbChunks(customerId, query, perQuery);
    allHits.push(...batch);
  }

  if (!isKbHybridSearchEnabled()) {
    const keywordHits = await supplementKbHitsByKeywords(customerId, question, customerName);
    allHits.push(...keywordHits);
  }

  let hits = dedupeHits(allHits).sort((a, b) => b.score - a.score);

  if (isRerankEnabled() && hits.length > 0) {
    const rerankQuery = buildTaskQuestionSearchQuery(question) || queries[0] || '';
    const rerankTopN = getRerankTopN(maxHits);
    hits = await rerankKbHits(rerankQuery, hits, rerankTopN);
  }

  hits = hits.slice(0, maxHits);

  return { hits, chunkCount };
}
