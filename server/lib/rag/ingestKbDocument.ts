/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import {
  createIngestJob as createIngestJobRow,
  deleteIngestJobsByDocument,
  deleteKbChunksByDocument,
  findKbDocumentWithKb,
  findLatestIngestJob as findLatestIngestJobRow,
  ingestJobToMutable,
  insertKbChunks,
  resolveIngestJob as resolveIngestJobRow,
  setKbDocumentProcessed,
} from '../../data/kbRagDataAccess.ts';
import { chunkText } from './chunkText.ts';
import { resolveKbIngestErrorCode } from '../../../lib/kbIngestErrors.ts';
import { resolveLlmRuntimeConfig } from '../llm/llmConfig.ts';
import { embedTexts } from '../llm/llmService.ts';
import { getVectorStore } from '../../data/vector/index.ts';

export async function findLatestIngestJob(documentId: string) {
  return findLatestIngestJobRow(documentId);
}

export async function createIngestJob(documentId: string, kbId: string) {
  return createIngestJobRow(documentId, kbId);
}

export async function resolveIngestJob(documentId: string, mongoJobId?: string) {
  const job = await resolveIngestJobRow(documentId, mongoJobId);
  if (!job) return null;
  return ingestJobToMutable(job);
}

export async function runKbDocumentIngest(documentId: string, mongoJobId?: string) {
  const jobRow = await resolveIngestJobRow(documentId, mongoJobId);
  if (!jobRow) {
    throw new Error(`No ingest job for document ${documentId}`);
  }

  const job = await ingestJobToMutable(jobRow);
  if (job.status === 'processing') {
    return job;
  }

  job.status = 'processing';
  job.startedAt = new Date();
  job.error = undefined;
  await job.save();

  await setKbDocumentProcessed(documentId, false);

  try {
    const loaded = await findKbDocumentWithKb(documentId);
    if (!loaded) {
      throw new Error('Document not found');
    }
    const { doc, kb } = loaded;

    const sourceText = typeof doc.text === 'string' ? doc.text.trim() : '';
    if (!sourceText) {
      throw new Error('Document has no extracted text to index');
    }

    const vectorStore = getVectorStore();
    await vectorStore.deleteByDocument(documentId);
    await deleteKbChunksByDocument(documentId);

    const chunks = chunkText(sourceText);
    if (chunks.length === 0) {
      throw new Error('Chunking produced no segments');
    }

    const vectors = await embedTexts(chunks);
    const runtime = await resolveLlmRuntimeConfig();
    const embeddingModel =
      runtime.embedding.embeddingModel.trim() ||
      process.env.KB_EMBEDDING_MODEL?.trim() ||
      'nomic-embed-text';
    const kbId = String(doc.kbId);
    const documentName = String(doc.name);
    const customerId =
      typeof kb.customerId === 'string' && kb.customerId.trim()
        ? kb.customerId.trim()
        : undefined;
    const projectId =
      typeof kb.projectId === 'string' && kb.projectId.trim()
        ? kb.projectId.trim()
        : undefined;

    const pointRows = chunks.map((text, chunkIndex) => ({
      id: randomUUID(),
      vector: vectors[chunkIndex],
      payload: {
        kbId,
        documentId,
        documentName,
        chunkIndex,
        text,
        customerId,
        projectId,
      },
    }));

    await vectorStore.upsertChunks(pointRows);

    await insertKbChunks(
      pointRows.map((row) => ({
        kbId,
        documentId,
        customerId,
        projectId,
        chunkIndex: row.payload.chunkIndex,
        text: row.payload.text,
        qdrantPointId: row.id,
        embeddingModel,
      })),
    );

    await setKbDocumentProcessed(documentId, true);

    job.status = 'completed';
    job.chunkCount = chunks.length;
    job.completedAt = new Date();
    await job.save();

    return job;
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : 'Ingest failed';
    const errorCode = resolveKbIngestErrorCode(rawMessage);
    job.status = 'failed';
    job.error = errorCode || rawMessage;
    job.completedAt = new Date();
    await job.save();

    await setKbDocumentProcessed(documentId, false);
    throw err;
  }
}

export async function purgeKbDocumentIndex(documentId: string) {
  await getVectorStore().deleteByDocument(documentId);
  await deleteKbChunksByDocument(documentId);
  await deleteIngestJobsByDocument(documentId);
  await setKbDocumentProcessed(documentId, false);
}
