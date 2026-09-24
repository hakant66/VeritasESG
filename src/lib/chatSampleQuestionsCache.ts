/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Language } from './i18n';
import type { ChatSampleQuestionsContext } from '../services/gemini';
import type { KnowledgeBase } from '../types';

const CACHE_PREFIX = 'chat-sample-v1';
const TTL_MS = 24 * 60 * 60 * 1000;

type CachedSampleQuestions = {
  questions: string[];
  cachedAt: number;
};

function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function fingerprintContext(ctx: ChatSampleQuestionsContext): string {
  return hashString(
    JSON.stringify({
      scope: ctx.scope,
      names: ctx.knowledgeBaseNames,
      descriptions: ctx.knowledgeBaseDescriptions,
      documentNames: ctx.documentNames,
      projectName: ctx.projectName ?? '',
    }),
  );
}

/** Fast lookup key (KB metadata only) — used to skip listDocuments + Gemini on repeat visits. */
export function buildSampleQuestionsLookupKey(
  lang: Language,
  selectedKbId: string,
  kbs: Pick<KnowledgeBase, 'id' | 'updatedAt' | 'name' | 'description'>[],
  projectName?: string,
): string {
  const kbPart = [...kbs]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((k) => `${k.id}:${k.updatedAt}:${k.name}:${k.description}`)
    .join('|');
  return `${CACHE_PREFIX}:lookup:${lang}:${selectedKbId}:${hashString(kbPart)}:${projectName ?? ''}`;
}

/** Full key including document titles — invalidates when documents change. */
export function buildSampleQuestionsCacheKey(
  lang: Language,
  selectedKbId: string,
  kbIds: string[],
  ctx: ChatSampleQuestionsContext,
): string {
  const sortedIds = [...kbIds].sort().join(',');
  return `${CACHE_PREFIX}:${lang}:${selectedKbId}:${sortedIds}:${fingerprintContext(ctx)}`;
}

function readStorage(key: string): CachedSampleQuestions | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSampleQuestions;
    if (
      !parsed ||
      typeof parsed.cachedAt !== 'number' ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length === 0
    ) {
      return null;
    }
    if (Date.now() - parsed.cachedAt > TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getCachedSampleQuestions(key: string): string[] | null {
  const entry = readStorage(key);
  return entry?.questions ?? null;
}

export function setCachedSampleQuestions(key: string, questions: string[]): void {
  if (questions.length === 0) return;
  try {
    const payload: CachedSampleQuestions = {
      questions,
      cachedAt: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Write both lookup (fast) and full (document-aware) keys. */
export function cacheSampleQuestions(
  lookupKey: string,
  fullKey: string,
  questions: string[],
): void {
  setCachedSampleQuestions(lookupKey, questions);
  if (lookupKey !== fullKey) {
    setCachedSampleQuestions(fullKey, questions);
  }
}
