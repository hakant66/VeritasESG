/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq';
import { getRedisUrl } from './constants.ts';
import { runKbDocumentIngest } from './ingestKbDocument.ts';

const QUEUE_NAME = 'kb-ingest';

let producerConnection: ConnectionOptions | null = null;
let workerConnection: ConnectionOptions | null = null;
let queue: Queue | null = null;
let worker: Worker | null = null;

/**
 * Producer connection used by the Queue when adding jobs. It is configured to
 * fail fast when Redis is unreachable (`enableOfflineQueue: false`) so that
 * `queue.add()` rejects promptly instead of buffering the command forever,
 * letting the caller fall back to inline ingest.
 */
function getProducerConnection() {
  const url = getRedisUrl();
  if (!url) return null;
  if (!producerConnection) {
    producerConnection = {
      url,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 200, 1000)),
    } as ConnectionOptions;
  }
  return producerConnection;
}

/**
 * Worker connection. BullMQ requires `maxRetriesPerRequest: null` for the
 * blocking consumer, and we want it to keep retrying so the worker recovers
 * automatically once Redis becomes reachable again.
 */
function getWorkerConnection() {
  const url = getRedisUrl();
  if (!url) return null;
  if (!workerConnection) {
    workerConnection = { url, maxRetriesPerRequest: null };
  }
  return workerConnection;
}

export function isKbIngestQueueEnabled() {
  return Boolean(getRedisUrl());
}

export function getKbIngestQueue() {
  const conn = getProducerConnection();
  if (!conn) return null;
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: conn });
  }
  return queue;
}

function runInlineIngest(documentId: string, mongoJobId: string) {
  setImmediate(() => {
    void runKbDocumentIngest(documentId, mongoJobId).catch((err) => {
      console.error('[KB-RAG] inline ingest failed', documentId, err);
    });
  });
  return { mode: 'inline' as const };
}

export async function enqueueKbDocumentIngest(documentId: string, mongoJobId: string) {
  const q = getKbIngestQueue();
  if (q) {
    const bullJobId = `kb-ingest-${documentId}-${mongoJobId}`;
    try {
      await q.add(
        'ingest',
        { documentId, mongoJobId },
        {
          jobId: bullJobId,
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
        },
      );
      return { mode: 'queue' as const };
    } catch (err) {
      // Redis is configured but unreachable — degrade gracefully to inline
      // ingest so the document is still processed instead of stuck pending.
      console.warn(
        '[KB-RAG] enqueue failed, falling back to inline ingest',
        documentId,
        err instanceof Error ? err.message : err,
      );
      return runInlineIngest(documentId, mongoJobId);
    }
  }

  return runInlineIngest(documentId, mongoJobId);
}

async function handleIngestJob(job: Job<{ documentId: string; mongoJobId?: string }>) {
  console.log(
    '[KB-RAG] worker ingest start',
    job.id,
    job.data.documentId,
    job.data.mongoJobId || '',
  );
  await runKbDocumentIngest(job.data.documentId, job.data.mongoJobId);
  console.log('[KB-RAG] worker ingest done', job.id, job.data.documentId);
}

export function startKbIngestWorker() {
  const conn = getWorkerConnection();
  if (!conn) {
    console.warn('[KB-RAG] ingest worker not started: REDIS_URL is not configured');
    return null;
  }
  if (worker) return worker;

  worker = new Worker(QUEUE_NAME, handleIngestJob, { connection: conn });
  worker.on('failed', (job, err) => {
    console.error('[KB-RAG] worker job failed', job?.id, err?.message);
  });
  worker.on('error', (err) => {
    console.error('[KB-RAG] worker error', err.message);
  });
  console.log('[KB-RAG] ingest worker started');

  return worker;
}

export async function closeKbIngestQueue() {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
  producerConnection = null;
  workerConnection = null;
}
