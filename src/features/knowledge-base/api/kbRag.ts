/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiRequest } from '../../../lib/apiClient.ts';
import {
  formatKbIngestErrorMessage,
  KB_INGEST_GEMINI_QUOTA_CODE,
  resolveKbIngestErrorCode,
} from '../../../../lib/kbIngestErrors.ts';

export type KbIngestJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type KbIngestJob = {
  id: string;
  documentId: string;
  kbId: string;
  status: KbIngestJobStatus;
  chunkCount?: number;
  error?: string;
  errorCode?: string;
  startedAt?: number;
  completedAt?: number;
};

export async function indexKbDocument(documentId: string) {
  return apiRequest<{ job: KbIngestJob; mode: 'queue' | 'inline' }>(
    `/api/kb-rag/documents/${encodeURIComponent(documentId)}/index`,
    { method: 'POST' },
  );
}

export async function getKbDocumentIndexStatus(documentId: string) {
  return apiRequest<{ documentId: string; processed: boolean; job: KbIngestJob | null }>(
    `/api/kb-rag/documents/${encodeURIComponent(documentId)}/status`,
  );
}

export type CustomerAutofillGroupId =
  | 'basic'
  | 'workforce'
  | 'sector'
  | 'esg'
  | 'reporting'
  | 'stakeholders'
  | 'facilities';

export type StakeholderAutofillSuggestion = {
  name: string;
  email?: string;
  role?: string;
  department?: string;
  linkedinUrl?: string;
  sourceDocumentName?: string;
  sourceChunkIndex?: number;
  sourceExcerpt?: string;
};

export type BranchAutofillSuggestion = {
  name: string;
  type?: string;
  address?: string;
  sourceDocumentName?: string;
  sourceChunkIndex?: number;
  sourceExcerpt?: string;
};

export type CustomerAutofillFieldSuggestion = {
  value: string | number | boolean | string[];
  sourceDocumentName?: string;
  sourceChunkIndex?: number;
  sourceExcerpt?: string;
};

export type CustomerAutofillResult = {
  customerId: string;
  groups: CustomerAutofillGroupId[];
  chunkCount: number;
  suggestions: Record<string, CustomerAutofillFieldSuggestion>;
  stakeholderSuggestions?: StakeholderAutofillSuggestion[];
  branchSuggestions?: BranchAutofillSuggestion[];
  contextChunks: Array<{
    documentName: string;
    chunkIndex: number;
    score: number;
    textPreview: string;
  }>;
};

export async function autofillCustomerFromKb(
  customerId: string,
  groups?: CustomerAutofillGroupId[],
) {
  return apiRequest<CustomerAutofillResult>(
    `/api/kb-rag/customers/${encodeURIComponent(customerId)}/autofill`,
    {
      method: 'POST',
      body: JSON.stringify(groups ? { groups } : {}),
    },
  );
}

export type CustomerKbSearchHit = {
  score: number;
  kbId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  customerId?: string;
  projectId?: string;
};

export async function searchCustomerKb(customerId: string, query: string, limit = 5) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return apiRequest<{
    customerId: string;
    customerName: string;
    query: string;
    hitCount: number;
    hits: CustomerKbSearchHit[];
  }>(`/api/kb-rag/customers/${encodeURIComponent(customerId)}/search?${params}`);
}

export async function purgeKbDocumentIndex(documentId: string) {
  return apiRequest<{ documentId: string; purged: boolean }>(
    `/api/kb-rag/documents/${encodeURIComponent(documentId)}`,
    { method: 'DELETE' },
  );
}

export type KnowledgeChatSource = {
  documentName: string;
  chunkIndex: number;
  score: number;
  textPreview: string;
};

export type KnowledgeChatResult = {
  answer: string;
  query: string;
  kbIds: string[];
  chunkCount: number;
  sources: KnowledgeChatSource[];
};

export type TaskQuestionAutofillResult = {
  answer: string;
  projectId: string;
  questionId: string;
  chunkCount: number;
  mode?: 'local' | 'general';
  sources: KnowledgeChatSource[];
};

export type TaskLlmProviderSummary = {
  textProvider: string;
  textModel?: string;
  embeddingProvider: string;
  textConfigured: boolean;
  embeddingConfigured: boolean;
};

export async function fetchTaskLlmProviderSummary() {
  return apiRequest<TaskLlmProviderSummary>('/api/kb-rag/tasks/llm-provider');
}

export async function autofillTaskQuestionAnswer(options: {
  projectId: string;
  questionId: string;
  assignmentId: string;
  lang?: 'tr' | 'en';
  mode?: 'local' | 'general';
}) {
  return apiRequest<TaskQuestionAutofillResult>('/api/kb-rag/tasks/autofill-answer', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function chatKnowledgeBase(options: {
  query: string;
  kbIds: string[];
  lang?: 'tr' | 'en';
  userContext?: {
    projectName?: string;
    customerName?: string;
    domains?: string[];
  };
  customerId?: string;
  projectId?: string;
  limit?: number;
}) {
  return apiRequest<KnowledgeChatResult>('/api/kb-rag/chat', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

const POLL_MS = 2000;
const POLL_MAX_ATTEMPTS = 180;
const QUEUED_STUCK_ATTEMPTS = 30;

export async function waitForKbDocumentIndexed(documentId: string) {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    const status = await getKbDocumentIndexStatus(documentId);
    const job = status.job;
    if (job?.status === 'completed' && status.processed) {
      return status;
    }
    if (job?.status === 'failed') {
      const code = job.errorCode || resolveKbIngestErrorCode(job.error || '');
      throw Object.assign(new Error(job.error || 'Document indexing failed'), {
        code: code || 'kb-rag/index-failed',
      });
    }
    if (job?.status === 'queued' && attempt >= QUEUED_STUCK_ATTEMPTS) {
      throw new Error(
        'Document indexing is queued but not starting. Check Redis/worker and try again.',
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(
    'Document indexing timed out. Large documents or slow LLM APIs may need more time — try again.',
  );
}
