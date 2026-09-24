/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { getEmbeddingDimensions, getQdrantUrl, KB_QDRANT_COLLECTION } from './constants.ts';

let client: QdrantClient | null = null;
let collectionReady = false;

function getClient() {
  if (!client) {
    client = new QdrantClient({
      url: getQdrantUrl(),
      checkCompatibility: false,
    });
  }
  return client;
}

export async function ensureKbCollection() {
  if (collectionReady) return;

  const qdrant = getClient();
  const collections = await qdrant.getCollections();
  const exists = collections.collections?.some((c) => c.name === KB_QDRANT_COLLECTION);

  if (!exists) {
    await qdrant.createCollection(KB_QDRANT_COLLECTION, {
      vectors: {
        size: getEmbeddingDimensions(),
        distance: 'Cosine',
      },
    });
  }

  collectionReady = true;
}

export type KbChunkPayload = {
  kbId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  customerId?: string;
  projectId?: string;
};

export async function upsertKbChunkPoints(
  points: Array<{ id: string; vector: number[]; payload: KbChunkPayload }>,
) {
  if (points.length === 0) return;
  await ensureKbCollection();
  const qdrant = getClient();
  await qdrant.upsert(KB_QDRANT_COLLECTION, {
    wait: true,
    points: points.map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: p.payload,
    })),
  });
}

export async function deleteKbChunksByDocument(documentId: string) {
  await ensureKbCollection();
  const qdrant = getClient();
  await qdrant.delete(KB_QDRANT_COLLECTION, {
    wait: true,
    filter: {
      must: [{ key: 'documentId', match: { value: documentId } }],
    },
  });
}

export type KbChunkSearchHit = {
  id: string;
  score: number;
  payload: KbChunkPayload;
};

export async function searchKbChunks(options: {
  vector: number[];
  customerId?: string;
  projectId?: string;
  kbIds?: string[];
  limit?: number;
}): Promise<KbChunkSearchHit[]> {
  await ensureKbCollection();
  const qdrant = getClient();
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);

  const must: Array<Record<string, unknown>> = [];
  if (options.customerId) {
    must.push({ key: 'customerId', match: { value: options.customerId } });
  }
  if (options.projectId) {
    must.push({ key: 'projectId', match: { value: options.projectId } });
  }
  const kbIds = (options.kbIds ?? []).map((id) => String(id).trim()).filter(Boolean);
  if (kbIds.length === 1) {
    must.push({ key: 'kbId', match: { value: kbIds[0] } });
  } else if (kbIds.length > 1) {
    must.push({
      should: kbIds.map((kbId) => ({ key: 'kbId', match: { value: kbId } })),
    });
  }

  const results = await qdrant.search(KB_QDRANT_COLLECTION, {
    vector: options.vector,
    limit,
    with_payload: true,
    filter: must.length > 0 ? { must } : undefined,
  });

  return (results || []).map((row) => ({
    id: String(row.id),
    score: row.score ?? 0,
    payload: row.payload as KbChunkPayload,
  }));
}

export async function pingQdrant() {
  const qdrant = getClient();
  await qdrant.getCollections();
  return { url: getQdrantUrl(), collection: KB_QDRANT_COLLECTION };
}
