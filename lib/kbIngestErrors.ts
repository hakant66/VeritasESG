/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Stable API / job error code for Gemini embedding quota failures during KB ingest. */
export const KB_INGEST_GEMINI_QUOTA_CODE = 'kb-rag/gemini-embedding-quota';

export function isGeminiEmbeddingQuotaError(message: string): boolean {
  const lower = message.toLowerCase();
  if (!lower.trim()) return false;

  const geminiHint =
    lower.includes('ai.google.dev') ||
    lower.includes('generativelanguage.googleapis.com') ||
    lower.includes('google.rpc') ||
    lower.includes('gemini-api') ||
    lower.includes('gemini embedding');

  const quotaHint =
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('exceeded your current quota') ||
    lower.includes('rate limit') ||
    lower.includes('rate-limit');

  const status429 =
    lower.includes('429') ||
    lower.includes('"code":429') ||
    lower.includes('status":"resource_exhausted"');

  return (geminiHint && quotaHint) || (status429 && quotaHint && geminiHint);
}

export function resolveKbIngestErrorCode(message: string): string | null {
  if (message === KB_INGEST_GEMINI_QUOTA_CODE) return KB_INGEST_GEMINI_QUOTA_CODE;
  return isGeminiEmbeddingQuotaError(message) ? KB_INGEST_GEMINI_QUOTA_CODE : null;
}

export type KbIngestErrorMessages = {
  geminiQuota: string;
  fallback: string;
};

export function formatKbIngestErrorMessage(
  error: string | undefined,
  messages: KbIngestErrorMessages,
): string {
  if (!error?.trim()) return messages.fallback;
  const code = resolveKbIngestErrorCode(error);
  if (code === KB_INGEST_GEMINI_QUOTA_CODE) return messages.geminiQuota;
  if (error.startsWith('kb-rag/')) return messages.fallback;
  return error;
}
