/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { findKbDocumentsByIds, searchKbChunksByKeywordRegex } from '../../data/kbRagDataAccess.ts';
import type { CustomerKbSearchHit } from './searchCustomerKb.ts';

function sanitizeKeywordQuery(query: string): string {
  return query
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .slice(0, 24)
    .join(' ');
}

async function hydrateChunkHits(
  chunks: Array<{
    kbId?: string;
    documentId?: unknown;
    customerId?: string;
    projectId?: string;
    chunkIndex?: number;
    text?: string;
    score?: number;
  }>,
  customerId: string,
): Promise<CustomerKbSearchHit[]> {
  if (chunks.length === 0) return [];

  const docIds = [...new Set(chunks.map((chunk) => String(chunk.documentId)))];
  const docs = await findKbDocumentsByIds(docIds);
  const docNameById = new Map(
    docs.map((doc) => [String((doc as { id?: string; _id?: unknown }).id || (doc as { _id?: unknown })._id), String((doc as { name?: string }).name || 'Document')]),
  );

  return chunks.map((chunk) => ({
    score: Number(chunk.score ?? 0),
    kbId: String(chunk.kbId ?? ''),
    documentId: String(chunk.documentId),
    documentName: docNameById.get(String(chunk.documentId)) || 'Document',
    chunkIndex: Number(chunk.chunkIndex ?? 0),
    text: String(chunk.text ?? ''),
    customerId: String(chunk.customerId ?? customerId),
    projectId: chunk.projectId ? String(chunk.projectId) : undefined,
  }));
}

export async function searchCustomerKbChunksByText(
  customerId: string,
  query: string,
  limit = 10,
): Promise<CustomerKbSearchHit[]> {
  const searchText = sanitizeKeywordQuery(query.trim());
  if (!searchText) return [];

  const tokens = searchText.split(/\s+/).filter(Boolean);
  const chunks = await searchKbChunksByKeywordRegex(customerId, tokens, limit);
  return hydrateChunkHits(
    chunks.map((chunk, index) => ({ ...chunk, score: 1 - index * 0.01 })),
    customerId,
  );
}
