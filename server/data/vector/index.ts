/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VectorStore factory. Selects the backend from VECTOR_BACKEND
 * (pgvector | qdrant | disabled) and memoizes a singleton.
 */

import { PgVectorStore } from './pgVectorStore.ts';
import { QdrantVectorStore } from './qdrantVectorStore.ts';
import { getVectorBackend, type VectorPoint, type VectorSearchOptions, type VectorStore } from './vectorStore.ts';

class DisabledVectorStore implements VectorStore {
  readonly backend = 'disabled' as const;
  isEnabled() {
    return false;
  }
  async ensureReady() {}
  async upsertChunks(_points: VectorPoint[]) {}
  async deleteByDocument(_documentId: string) {}
  async searchByVector(_options: VectorSearchOptions) {
    return [];
  }
  async searchByText(_customerId: string, _query: string, _limit?: number) {
    return [];
  }
  async ping() {
    return { backend: this.backend, ok: true, detail: 'vector search disabled' };
  }
}

let store: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (store) return store;
  switch (getVectorBackend()) {
    case 'qdrant':
      store = new QdrantVectorStore();
      break;
    case 'disabled':
      store = new DisabledVectorStore();
      break;
    default:
      store = new PgVectorStore();
  }
  return store;
}

export { getVectorBackend } from './vectorStore.ts';
export type { VectorStore, VectorPoint, VectorHit, VectorSearchOptions } from './vectorStore.ts';
