/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin-managed switch between the two Knowledge Chat engines (see
 * server/lib/rag/knowledgeChatAnswer.ts vs knowledgeChatGraph.ts).
 * Off (default engine) by default — platform_admin must opt in.
 */

export interface KnowledgeChatEngineSettings {
  /** true = LangGraph engine (multi-turn memory, query rewrite, retry, faithfulness check); false = default stateless engine. */
  useGraphEngine: boolean;
  updatedAt?: number;
  updatedBy?: string;
}

export const KNOWLEDGE_CHAT_ENGINE_SETTINGS_KEY = 'knowledgeChatEngine';

export const DEFAULT_KNOWLEDGE_CHAT_ENGINE_SETTINGS: KnowledgeChatEngineSettings = {
  useGraphEngine: false,
};

export function normalizeKnowledgeChatEngineSettings(
  raw: Record<string, unknown>,
): KnowledgeChatEngineSettings {
  return {
    useGraphEngine: Boolean(raw.useGraphEngine),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
  };
}
