/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Express, NextFunction, Request, Response } from 'express';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';
import {
  findCustomerById,
  findKbDocumentById,
  findKnowledgeBasesByIds,
} from '../data/kbRagDataAccess.ts';
import { getLlmProviderSummary, isLlmEmbeddingConfigured } from '../lib/llm/llmService.ts';
import {
  createIngestJob,
  findLatestIngestJob,
  purgeKbDocumentIndex,
} from '../lib/rag/ingestKbDocument.ts';
import {
  enqueueKbDocumentIngest,
  isKbIngestQueueEnabled,
} from '../lib/rag/kbIngestQueue.ts';
import { autofillCustomerFromKb } from '../lib/rag/customerAutofill.ts';
import { normalizeAutofillGroupIds } from '../lib/rag/customerAutofillGroups.ts';
import { searchCustomerKbChunks } from '../lib/rag/searchCustomerKb.ts';
import { answerKnowledgeChatQuery } from '../lib/rag/knowledgeChatAnswer.ts';
import { autofillTaskQuestionAnswer } from '../lib/rag/taskQuestionAutofill.ts';
import { pingQdrant } from '../lib/rag/qdrantStore.ts';
import { assertTaskQuestionAutofillAccess } from '../lib/taskAutofillAccess.ts';
import { KB_INGEST_GEMINI_QUOTA_CODE, isGeminiEmbeddingQuotaError, resolveKbIngestErrorCode } from '../../lib/kbIngestErrors.ts';
import { getRagSearchStatus } from '../../lib/ragSearchConfig.ts';

const INDEX_ROLES = new Set(['platform_admin', 'consultant_manager', 'consultant']);

function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res: Response, status: number, error: string, code = 'kb-rag/error') {
  return res.status(status).json({ success: false, error, code });
}

function mapLlmRouteError(err: unknown): { status: number; error: string; code: string } | null {
  const message = err instanceof Error ? err.message : String(err ?? '');
  const status =
    err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : undefined;
  const lower = message.toLowerCase();

  if (isGeminiEmbeddingQuotaError(message)) {
    return {
      status: 503,
      error:
        'Google Gemini embedding quota exceeded. Open Settings → LLM, set Embedding provider to OpenAI, save, and re-index documents.',
      code: KB_INGEST_GEMINI_QUOTA_CODE,
    };
  }

  if (
    message.includes('is not configured') ||
    message.includes('GEMINI_API_KEY is not configured') ||
    message.includes('OpenAI API key is not configured') ||
    message.includes('Anthropic API key is not configured')
  ) {
    return {
      status: 503,
      error: 'LLM provider is not configured. Open Settings → LLM and configure the active provider.',
      code: 'kb-rag/llm-not-configured',
    };
  }
  if (
    status === 503 ||
    status === 429 ||
    /high demand|unavailable|resource_exhausted|rate limit|quota/i.test(lower)
  ) {
    return {
      status: 503,
      error: 'LLM API is temporarily busy. Please wait a moment and try again.',
      code: 'kb-rag/llm-unavailable',
    };
  }
  if (status === 403 || /permission_denied|denied access|invalid api key|incorrect api key/i.test(lower)) {
    return {
      status: 503,
      error: 'LLM API access was denied. Check API keys and provider status in Settings → LLM.',
      code: 'kb-rag/llm-denied',
    };
  }
  return null;
}

function serializeJob(doc: any) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  obj.id = obj.id || obj._id?.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.startedAt instanceof Date) obj.startedAt = obj.startedAt.getTime();
  if (obj.completedAt instanceof Date) obj.completedAt = obj.completedAt.getTime();
  if (obj.createdAt instanceof Date) obj.createdAt = obj.createdAt.getTime();
  if (obj.updatedAt instanceof Date) obj.updatedAt = obj.updatedAt.getTime();
  if (typeof obj.error === 'string') {
    const code =
      obj.error.startsWith('kb-rag/') ? obj.error : resolveKbIngestErrorCode(obj.error);
    if (code) obj.errorCode = code;
  }
  return obj;
}

export function registerKbRagRoutes(app: Express, options: { jwtSecret: string }) {
  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
    if (!auth.user) {
      return failure(res, 401, 'Authentication required', 'auth/missing-token');
    }
    (req as any).platformUser = auth.user;
    return next();
  };

  const requireIndexer = async (req: Request, res: Response, next: NextFunction) => {
    const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
    if (!auth.user) {
      return failure(res, 401, 'Authentication required', 'auth/missing-token');
    }
    if (!INDEX_ROLES.has(auth.user.role)) {
      return failure(res, 403, 'Insufficient permissions', 'auth/forbidden');
    }
    (req as any).platformUser = auth.user;
    return next();
  };

  const withKbDb = (res: Response, run: () => Promise<void>) => {
    void run().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'KB RAG operation failed';
      failure(res, 500, message, 'kb-rag/server-error');
    });
  };

  app.get('/api/kb-rag/health', requireIndexer, (req, res) => {
    void withKbDb(res, async () => {
      let qdrant: { url: string; collection: string } | null = null;
      let qdrantError: string | null = null;
      try {
        qdrant = await pingQdrant();
      } catch (err: unknown) {
        qdrantError = err instanceof Error ? err.message : 'Qdrant unreachable';
      }

      const llm = await getLlmProviderSummary();
      success(res, {
        llmEmbedding: await isLlmEmbeddingConfigured(),
        llm,
        redisQueue: isKbIngestQueueEnabled(),
        qdrant,
        qdrantError,
        retrieval: getRagSearchStatus(),
      });
    });
  });

  app.post('/api/kb-rag/documents/:docId/index', requireIndexer, (req, res) => {
    void withKbDb(res, async () => {
      const docId = String(req.params.docId || '').trim();
      if (!docId) {
        failure(res, 400, 'Document id required', 'kb-rag/missing-doc-id');
        return;
      }

      const doc = await findKbDocumentById(docId);
      if (!doc) {
        failure(res, 404, 'Document not found', 'kb-rag/not-found');
        return;
      }

      const docText = typeof doc.text === 'string' ? doc.text.trim() : '';
      if (!docText) {
        failure(res, 400, 'Document has no text to index', 'kb-rag/missing-text');
        return;
      }

      const existing = await findLatestIngestJob(docId);
      if (existing?.status === 'processing') {
        success(res, {
          job: serializeJob(existing),
          mode: isKbIngestQueueEnabled() ? 'queue' : 'inline',
        });
        return;
      }

      const job =
        existing?.status === 'queued'
          ? existing
          : await createIngestJob(docId, String(doc.kbId));

      const mongoJobId = String(job.id || job._id);
      const enqueue = await enqueueKbDocumentIngest(docId, mongoJobId);

      success(res, {
        job: serializeJob(job),
        mode: enqueue.mode,
        requeued: existing?.status === 'queued',
      }, 202);
    });
  });

  app.get('/api/kb-rag/documents/:docId/status', requireIndexer, (req, res) => {
    void withKbDb(res, async () => {
      const docId = String(req.params.docId || '').trim();
      const [doc, job] = await Promise.all([
        findKbDocumentById(docId),
        findLatestIngestJob(docId),
      ]);

      if (!doc) {
        failure(res, 404, 'Document not found', 'kb-rag/not-found');
        return;
      }

      success(res, {
        documentId: docId,
        processed: Boolean(doc.processed),
        job: job ? serializeJob(job) : null,
      });
    });
  });

  app.get('/api/kb-rag/tasks/llm-provider', requireAuth, (req, res) => {
    void withKbDb(res, async () => {
      const summary = await getLlmProviderSummary();
      success(res, summary);
    });
  });

  app.post('/api/kb-rag/tasks/autofill-answer', requireAuth, (req, res) => {
    void withKbDb(res, async () => {
      const projectId = String(req.body?.projectId ?? '').trim();
      const questionId = String(req.body?.questionId ?? '').trim();
      const assignmentId = String(req.body?.assignmentId ?? '').trim();
      const lang = req.body?.lang === 'tr' ? 'tr' : 'en';
      const mode = req.body?.mode === 'general' ? 'general' : 'local';
      const user = (req as any).platformUser;

      if (!projectId || !questionId || !assignmentId) {
        failure(res, 400, 'projectId, questionId, and assignmentId are required', 'kb-rag/missing-params');
        return;
      }

      try {
        await assertTaskQuestionAutofillAccess(user, projectId, assignmentId, questionId);
        const result = await autofillTaskQuestionAnswer({
          projectId,
          questionId,
          lang,
          mode,
        });
        success(res, result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Autofill failed';
        if (message === 'Insufficient permissions') {
          failure(res, 403, message, 'auth/forbidden');
          return;
        }
        if (
          message === 'Assignment not found' ||
          message === 'Question not found' ||
          message === 'Project not found' ||
          message === 'Question is not part of this assignment'
        ) {
          failure(res, 404, message, 'kb-rag/not-found');
          return;
        }
        if (message === 'Assignment is already completed') {
          failure(res, 400, message, 'kb-rag/assignment-completed');
          return;
        }
        if (message.includes('No indexed knowledge-base')) {
          failure(res, 400, message, 'kb-rag/no-indexed-docs');
          return;
        }
        const llmErr = mapLlmRouteError(err);
        if (llmErr) {
          failure(res, llmErr.status, llmErr.error, llmErr.code);
          return;
        }
        throw err;
      }
    });
  });

  app.post('/api/kb-rag/customers/:customerId/autofill', requireIndexer, (req, res) => {
    void withKbDb(res, async () => {
      const customerId = String(req.params.customerId || '').trim();
      if (!customerId) {
        failure(res, 400, 'Customer id required', 'kb-rag/missing-customer-id');
        return;
      }

      const customer = await findCustomerById(customerId);
      if (!customer) {
        failure(res, 404, 'Customer not found', 'kb-rag/customer-not-found');
        return;
      }

      const groupIds = normalizeAutofillGroupIds(req.body?.groups);
      try {
        const result = await autofillCustomerFromKb(
          customerId,
          String(customer.name ?? ''),
          groupIds,
        );
        success(res, result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Autofill failed';
        if (message.includes('No indexed knowledge-base')) {
          failure(res, 400, message, 'kb-rag/no-indexed-docs');
          return;
        }
        const llmErr = mapLlmRouteError(err);
        if (llmErr) {
          failure(res, llmErr.status, llmErr.error, llmErr.code);
          return;
        }
        throw err;
      }
    });
  });

  app.post('/api/kb-rag/chat', requireIndexer, (req, res) => {
    void withKbDb(res, async () => {
      const query = String(req.body?.query ?? '').trim();
      const kbIdsRaw = req.body?.kbIds;
      const kbIds = Array.isArray(kbIdsRaw)
        ? kbIdsRaw.map((id: unknown) => String(id).trim()).filter(Boolean)
        : [];
      const lang = req.body?.lang === 'tr' ? 'tr' : 'en';
      const limitRaw = Number(req.body?.limit ?? 8);
      const limit = Number.isFinite(limitRaw) ? limitRaw : 8;

      if (!query) {
        failure(res, 400, 'Query is required', 'kb-rag/missing-query');
        return;
      }
      if (kbIds.length === 0) {
        failure(res, 400, 'kbIds array is required', 'kb-rag/missing-kb-ids');
        return;
      }

      const kbs = await findKnowledgeBasesByIds(kbIds);
      if (kbs.length === 0) {
        failure(res, 404, 'No matching knowledge bases found', 'kb-rag/kb-not-found');
        return;
      }

      const foundIds = new Set(kbs.map((kb) => String(kb.id || kb._id)));
      const missing = kbIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        failure(res, 404, `Knowledge base not found: ${missing.join(', ')}`, 'kb-rag/kb-not-found');
        return;
      }

      const userContext = req.body?.userContext ?? {};
      const customerId =
        typeof req.body?.customerId === 'string' && req.body.customerId.trim()
          ? req.body.customerId.trim()
          : undefined;
      const projectId =
        typeof req.body?.projectId === 'string' && req.body.projectId.trim()
          ? req.body.projectId.trim()
          : undefined;

      try {
        const result = await answerKnowledgeChatQuery({
          query,
          kbIds,
          lang,
          userContext: {
            projectName:
              typeof userContext.projectName === 'string' ? userContext.projectName : undefined,
            customerName:
              typeof userContext.customerName === 'string' ? userContext.customerName : undefined,
            domains: Array.isArray(userContext.domains)
              ? userContext.domains.map((d: unknown) => String(d).trim()).filter(Boolean)
              : undefined,
          },
          customerId,
          projectId,
          limit,
        });
        success(res, result);
      } catch (err: unknown) {
        const llmErr = mapLlmRouteError(err);
        if (llmErr) {
          failure(res, llmErr.status, llmErr.error, llmErr.code);
          return;
        }
        throw err;
      }
    });
  });

  app.get('/api/kb-rag/customers/:customerId/search', requireIndexer, (req, res) => {
    void withKbDb(res, async () => {
      const customerId = String(req.params.customerId || '').trim();
      const query = String(req.query.q ?? '').trim();
      const limitRaw = Number(req.query.limit ?? 5);
      const limit = Number.isFinite(limitRaw) ? limitRaw : 5;

      if (!customerId) {
        failure(res, 400, 'Customer id required', 'kb-rag/missing-customer-id');
        return;
      }
      if (!query) {
        failure(res, 400, 'Query parameter q is required', 'kb-rag/missing-query');
        return;
      }

      const customer = await findCustomerById(customerId);
      if (!customer) {
        failure(res, 404, 'Customer not found', 'kb-rag/customer-not-found');
        return;
      }

      const hits = await searchCustomerKbChunks(customerId, query, limit);
      success(res, {
        customerId,
        customerName: String(customer.name ?? ''),
        query,
        hitCount: hits.length,
        hits,
      });
    });
  });

  app.delete('/api/kb-rag/documents/:docId', requireIndexer, (req, res) => {
    void withKbDb(res, async () => {
      const docId = String(req.params.docId || '').trim();
      const doc = await findKbDocumentById(docId);
      if (!doc) {
        failure(res, 404, 'Document not found', 'kb-rag/not-found');
        return;
      }

      await purgeKbDocumentIndex(docId);
      success(res, { documentId: docId, purged: true });
    });
  });
}
