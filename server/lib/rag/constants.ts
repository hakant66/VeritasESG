/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const KB_QDRANT_COLLECTION = 'kb_chunks';

export function getChunkTargetChars() {
  const raw = process.env.KB_CHUNK_TARGET_CHARS?.trim();
  const n = raw ? Number(raw) : 1500;
  return Number.isFinite(n) && n > 200 ? n : 1500;
}

export function getChunkOverlapChars() {
  const raw = process.env.KB_CHUNK_OVERLAP_CHARS?.trim();
  const n = raw ? Number(raw) : 200;
  return Number.isFinite(n) && n >= 0 ? n : 200;
}

export function getEmbeddingModel() {
  return process.env.KB_EMBEDDING_MODEL?.trim() || 'gemini-embedding-001';
}

export function getEmbeddingDimensions() {
  const raw = process.env.KB_EMBEDDING_DIMENSIONS?.trim();
  const n = raw ? Number(raw) : 768;
  return Number.isFinite(n) && n > 0 ? n : 768;
}

export function getQdrantUrl() {
  return process.env.QDRANT_URL?.trim() || 'http://127.0.0.1:6333';
}

export function getRedisUrl() {
  return process.env.REDIS_URL?.trim() || '';
}
