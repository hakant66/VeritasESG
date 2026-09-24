/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * KB/RAG metadata access (vectors use the Phase 5 vector seam).
 */

import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';
import { withExternalId, withExternalIds } from './entityLookup.ts';

type Row = Record<string, unknown>;

export async function findKbDocumentById(docId: string): Promise<Row | null> {
  return withExternalId(await findByIdOrLegacy(getPrisma().kBDocument, docId));
}

export async function findKnowledgeBasesByIds(kbIds: string[]): Promise<Row[]> {
  const rows = await getPrisma().knowledgeBase.findMany({
    where: { OR: kbIds.flatMap((id) => [{ id }, { legacyFirebaseId: id }]) },
  });
  return withExternalIds(rows as Row[]);
}

export async function findCustomerById(customerId: string): Promise<Row | null> {
  return withExternalId(await findByIdOrLegacy(getPrisma().customer, customerId));
}

export async function findLatestIngestJob(documentId: string): Promise<Row | null> {
  const row = await getPrisma().kbIngestJob.findFirst({
    where: { documentId },
    orderBy: { createdAt: 'desc' },
  });
  return withExternalId(row as Row | null);
}

export async function createIngestJob(documentId: string, kbId: string): Promise<Row> {
  const row = await getPrisma().kbIngestJob.create({
    data: { documentId, kbId, status: 'queued' },
  });
  return withExternalId(row as Row)!;
}

export async function resolveIngestJob(
  documentId: string,
  jobId?: string,
): Promise<Row | null> {
  if (jobId) {
    const job = await findByIdOrLegacy(getPrisma().kbIngestJob, jobId);
    if (job && String(job.documentId) === documentId) return withExternalId(job);
  }
  return findLatestIngestJob(documentId);
}

export async function saveIngestJob(job: Row): Promise<void> {
  await getPrisma().kbIngestJob.update({
    where: { id: String(job.id) },
    data: {
      status: String(job.status),
      startedAt: job.startedAt as Date | undefined,
      completedAt: job.completedAt as Date | undefined,
      chunkCount: job.chunkCount as number | undefined,
      error: job.error as string | undefined,
      updatedAt: new Date(),
    },
  });
}

export async function setKbDocumentProcessed(
  documentId: string,
  processed: boolean,
): Promise<void> {
  const existing = await findByIdOrLegacy(getPrisma().kBDocument, documentId);
  if (!existing) return;
  await getPrisma().kBDocument.update({
    where: { id: String(existing.id) },
    data: { processed, updatedAt: new Date() },
  });
}

export async function findKbDocumentWithKb(documentId: string): Promise<{
  doc: Row;
  kb: Row;
} | null> {
  const doc = await findKbDocumentById(documentId);
  if (!doc) return null;
  const kb = await findByIdOrLegacy(getPrisma().knowledgeBase, String(doc.kbId));
  if (!kb) return null;
  return { doc, kb: withExternalId(kb)! };
}

export async function deleteKbChunksByDocument(documentId: string): Promise<void> {
  await getPrisma().kbChunk.deleteMany({ where: { documentId } });
}

export async function insertKbChunks(
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  await getPrisma().kbChunk.createMany({
    data: rows.map((row) => ({
      kbId: String(row.kbId),
      documentId: String(row.documentId),
      customerId: row.customerId as string | undefined,
      projectId: row.projectId as string | undefined,
      chunkIndex: Number(row.chunkIndex),
      text: String(row.text),
      qdrantPointId: String(row.qdrantPointId),
      embeddingModel: String(row.embeddingModel),
    })),
  });
}

export async function deleteIngestJobsByDocument(documentId: string): Promise<void> {
  await getPrisma().kbIngestJob.deleteMany({ where: { documentId } });
}

export async function ingestJobToMutable(job: Row): Promise<{
  save: () => Promise<void>;
} & Row> {
  return {
    ...job,
    save: async () => saveIngestJob(job),
  };
}

export async function kbDocumentToMutable(doc: Row): Promise<{
  save: () => Promise<void>;
  processed: boolean;
  text?: string;
  kbId?: string;
  name?: string;
} & Row> {
  return {
    ...doc,
    get processed() {
      return Boolean(doc.processed);
    },
    set processed(value: boolean) {
      doc.processed = value;
    },
    save: async () => setKbDocumentProcessed(String(doc.id || doc._id), Boolean(doc.processed)),
  };
}

export async function countKbChunksByCustomer(customerId: string): Promise<number> {
  return getPrisma().kbChunk.count({ where: { customerId } });
}

export async function countKbChunksByKbIds(kbIds: string[]): Promise<number> {
  if (kbIds.length === 0) return 0;
  return getPrisma().kbChunk.count({ where: { kbId: { in: kbIds } } });
}

export async function searchKbChunksByKeywordRegex(
  customerId: string,
  keywords: string[],
  limit = 10,
): Promise<Row[]> {
  if (keywords.length === 0) return [];
  const rows = await getPrisma().kbChunk.findMany({
    where: {
      customerId,
      OR: keywords.map((keyword) => ({ text: { contains: keyword, mode: 'insensitive' } })),
    },
    take: limit,
  });
  return withExternalIds(rows as Row[]);
}

export async function findKbDocumentsByIds(docIds: string[]): Promise<Row[]> {
  if (docIds.length === 0) return [];
  const rows = await getPrisma().kBDocument.findMany({
    where: { OR: docIds.flatMap((id) => [{ id }, { legacyFirebaseId: id }]) },
  });
  return withExternalIds(rows as Row[]);
}
