/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Qdrant-backed VectorStore — thin adapter over the legacy `qdrantStore` so the
 * existing behavior is preserved when VECTOR_BACKEND=qdrant. Keyword search is
 * not provided here (callers fall back to the Mongo/text path).
 */

import {
  deleteKbChunksByDocument,
  pingQdrant,
  searchKbChunks,
  upsertKbChunkPoints,
} from '../../lib/rag/qdrantStore.ts';
import type { VectorPoint, VectorSearchOptions, VectorStore } from './vectorStore.ts';

export class QdrantVectorStore implements VectorStore {
  readonly backend = 'qdrant' as const;

  isEnabled(): boolean {
    return true;
  }

  async ensureReady(): Promise<void> {
    // Collection is created lazily inside qdrantStore on first use.
  }

  async upsertChunks(points: VectorPoint[]): Promise<void> {
    await upsertKbChunkPoints(points);
  }

  async deleteByDocument(documentId: string): Promise<void> {
    await deleteKbChunksByDocument(documentId);
  }

  async searchByVector(options: VectorSearchOptions) {
    const hits = await searchKbChunks(options);
    return hits.map((hit) => ({
      score: hit.score,
      kbId: hit.payload.kbId,
      documentId: hit.payload.documentId,
      documentName: hit.payload.documentName,
      chunkIndex: hit.payload.chunkIndex,
      text: hit.payload.text,
      customerId: hit.payload.customerId ?? options.customerId ?? '',
      projectId: hit.payload.projectId,
    }));
  }

  async ping() {
    try {
      const info = await pingQdrant();
      return { backend: this.backend, ok: true, detail: `${info.url} / ${info.collection}` };
    } catch (err) {
      return { backend: this.backend, ok: false, detail: err instanceof Error ? err.message : String(err) };
    }
  }
}
