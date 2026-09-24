/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Engine-neutral vector/keyword search seam for the KB RAG subsystem.
 *
 * Replaces the direct Qdrant dependency with a pluggable `VectorStore`:
 *   - `pgvector`  (default) — embeddings + tsvector keyword search in Postgres
 *                 (the core DB on a Postgres deployment, or a sidecar on MySQL).
 *   - `qdrant`    — legacy backend, kept for transition/compat.
 *   - `disabled`  — no vector store (semantic RAG off); callers degrade to
 *                   keyword-only or skip autofill.
 *
 * Selected by `VECTOR_BACKEND`. The point/hit shapes mirror the original
 * qdrantStore so existing call sites migrate with minimal churn.
 */

import type { KbChunkPayload } from '../../lib/rag/qdrantStore.ts';

export type VectorBackend = 'pgvector' | 'qdrant' | 'disabled';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: KbChunkPayload;
}

/** Flattened search hit consumed by the RAG layer (mirrors CustomerKbSearchHit). */
export interface VectorHit {
  score: number;
  kbId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  customerId: string;
  projectId?: string;
}

export interface VectorSearchOptions {
  vector: number[];
  customerId?: string;
  projectId?: string;
  kbIds?: string[];
  limit?: number;
}

export interface VectorStore {
  readonly backend: VectorBackend;
  /** True when the store can actually serve requests (config present). */
  isEnabled(): boolean;
  /** Create extensions/columns/indexes as needed (idempotent). */
  ensureReady(): Promise<void>;
  upsertChunks(points: VectorPoint[]): Promise<void>;
  deleteByDocument(documentId: string): Promise<void>;
  searchByVector(options: VectorSearchOptions): Promise<VectorHit[]>;
  /** Optional keyword search (tsvector / FULLTEXT). Undefined => not supported. */
  searchByText?(customerId: string, query: string, limit?: number): Promise<VectorHit[]>;
  ping(): Promise<{ backend: VectorBackend; ok: boolean; detail?: string }>;
}

export function getVectorBackend(): VectorBackend {
  const raw = process.env.VECTOR_BACKEND?.trim().toLowerCase();
  if (raw === 'qdrant') return 'qdrant';
  if (raw === 'disabled' || raw === 'none' || raw === 'off') return 'disabled';
  return 'pgvector';
}
