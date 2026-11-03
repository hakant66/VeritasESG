/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LangGraph-based variant of Knowledge Chat. Same inputs/outputs as
 * answerKnowledgeChatQuery() (knowledgeChatAnswer.ts) and reuses its
 * retrieval and prompt-building logic unchanged.
 *
 * The real gap this closes: the default engine is stateless per request —
 * no conversation history reaches the backend at all, so a follow-up like
 * "what about Scope 3?" is answered with zero awareness of what was just
 * discussed. This graph persists turns across requests (LangGraph
 * checkpointer, keyed by conversationId) and adds a query-rewrite step
 * that resolves references to prior turns before retrieval runs.
 *
 * Runs in-process, same as customerAutofillGraph.ts — no new network hop,
 * no new runtime. Opt-in only — see KNOWLEDGE_CHAT_ENGINE in kbRagRoute.ts.
 */

import { z } from 'zod';
import { END, MemorySaver, START, StateGraph } from '@langchain/langgraph';
import { generateTextFromPrompt } from '../llm/llmService.ts';
import {
  buildKnowledgeChatPrompt,
  dedupeHits,
  type KnowledgeChatAnswer,
  type KnowledgeChatUserContext,
} from './knowledgeChatAnswer.ts';
import { countKbChunksByKbIds } from '../../data/kbRagDataAccess.ts';
import { searchKnowledgeKbChunks, type KnowledgeKbSearchHit } from './searchKnowledgeKb.ts';

const MAX_RETRIEVAL_RETRIES = 1;
/** Below this top-hit score, retrieval is treated as weak and gets one broadened retry. */
const WEAK_RETRIEVAL_SCORE_THRESHOLD = 0.15;

const hitSchema = z.custom<KnowledgeKbSearchHit>();
const turnSchema = z.object({ query: z.string(), answer: z.string() });

const ChatState = z.object({
  conversationId: z.string(),
  query: z.string(),
  kbIds: z.array(z.string()),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  lang: z.enum(['tr', 'en']),
  userContext: z.custom<KnowledgeChatUserContext>(),
  limit: z.number(),
  indexedChunkCount: z.number().default(0),
  /** Restored by the checkpointer from the prior turn in this thread; appended to at the end of each turn. */
  history: z.array(turnSchema).default([]),
  rewrittenQuery: z.string().default(''),
  hits: z.array(hitSchema).default([]),
  retryCount: z.number().default(0),
  answer: z.string().default(''),
});

type ChatStateT = z.infer<typeof ChatState>;

async function rewriteQueryNode(state: ChatStateT) {
  if (state.history.length === 0) {
    // First turn of a conversation: nothing to resolve against.
    return { rewrittenQuery: state.query };
  }

  const recentTurns = state.history.slice(-3);
  const historyBlock = recentTurns.map((t) => `Q: ${t.query}\nA: ${t.answer.slice(0, 300)}`).join('\n\n');
  const prompt = `Rewrite the LATEST QUESTION below into a standalone search query that resolves any pronouns or
implicit references to the prior conversation turns (e.g. "what about Scope 3?" after a Scope 1/2 discussion ->
"What are the company's Scope 3 emissions?"). If the latest question is already standalone, return it unchanged.
Return ONLY the rewritten query text, nothing else — no quotes, no explanation.

PRIOR TURNS:
${historyBlock}

LATEST QUESTION:
${state.query}`;

  try {
    const rewritten = (await generateTextFromPrompt(prompt)).trim();
    return { rewrittenQuery: rewritten || state.query };
  } catch {
    // A rewrite failure should never block the chat — fall back to the raw query.
    return { rewrittenQuery: state.query };
  }
}

async function retrieveNode(state: ChatStateT) {
  const hits = dedupeHits(
    await searchKnowledgeKbChunks({
      query: state.rewrittenQuery,
      kbIds: state.kbIds,
      customerId: state.customerId,
      projectId: state.projectId,
      limit: state.limit,
    }),
  ).sort((a, b) => b.score - a.score);
  return { hits };
}

function broadenQueryNode(state: ChatStateT) {
  // Drop the rewrite's specificity and fall back toward the user's original wording,
  // which is sometimes a better match than an over-narrowed rewrite.
  return { rewrittenQuery: state.query, retryCount: state.retryCount + 1 };
}

function routeAfterRetrieve(state: ChatStateT): 'broadenQuery' | 'generateAnswer' {
  const topScore = state.hits[0]?.score ?? 0;
  const weak = state.hits.length === 0 || topScore < WEAK_RETRIEVAL_SCORE_THRESHOLD;
  if (weak && state.retryCount < MAX_RETRIEVAL_RETRIES) return 'broadenQuery';
  return 'generateAnswer';
}

async function answerNode(state: ChatStateT) {
  if (state.hits.length === 0) {
    const noHitsMessage =
      state.lang === 'tr'
        ? 'Sorunuzla eşleşen indekslenmiş pasaj bulunamadı. Daha spesifik bir soru deneyin veya ilgili belgelerin indekslendiğinden emin olun.'
        : 'No indexed passages matched your question. Try a more specific query or confirm the relevant documents are indexed.';
    return { answer: noHitsMessage };
  }

  const prompt = buildKnowledgeChatPrompt(
    state.hits,
    state.query,
    state.lang,
    state.userContext,
    state.history.slice(-3),
  );
  const answer = await generateTextFromPrompt(prompt);
  return { answer };
}

const MARKDOWN_DOC_CITATION_RE = /\*([^*\n]+\.(?:pdf|docx?|xlsx?|pptx?|txt|csv))\*/gi;

/**
 * Deterministic, not another LLM call: pulls every "*filename.ext*"-style
 * inline citation out of the answer and flags any that don't match a
 * document name actually in the retrieved hit set — i.e. the model citing
 * a source it wasn't given. Does not block the response (an LLM rewrite
 * to "fix" this would cost another full call for a rare failure mode);
 * flags it in state for now so it's visible in logs/future UI.
 */
function checkFaithfulnessNode(state: ChatStateT) {
  const knownDocs = new Set(state.hits.map((h) => h.documentName));
  const cited = [...state.answer.matchAll(MARKDOWN_DOC_CITATION_RE)].map((m) => m[1].trim());
  const unfaithfulCitations = [...new Set(cited.filter((name) => !knownDocs.has(name)))];
  if (unfaithfulCitations.length > 0) {
    console.warn('[knowledgeChatGraph] answer cites document(s) not in the retrieved set:', unfaithfulCitations);
  }
  return {};
}

/** Appends this turn to history so the NEXT invoke() on this thread_id sees it. */
function appendHistoryNode(state: ChatStateT) {
  return { history: [...state.history, { query: state.query, answer: state.answer }] };
}

let compiledChatGraph: ReturnType<typeof buildChatGraph> | null = null;
// In-memory: fine for a single-process deployment (CLAUDE.md); conversation history
// doesn't need to survive a restart. Swap for a Postgres-backed checkpointer later
// if that changes.
const checkpointer = new MemorySaver();

function buildChatGraph() {
  return new StateGraph(ChatState)
    .addNode('rewriteQuery', rewriteQueryNode)
    .addNode('retrieve', retrieveNode)
    .addNode('broadenQuery', broadenQueryNode)
    .addNode('generateAnswer', answerNode)
    .addNode('checkFaithfulness', checkFaithfulnessNode)
    .addNode('appendHistory', appendHistoryNode)
    .addEdge(START, 'rewriteQuery')
    .addEdge('rewriteQuery', 'retrieve')
    .addConditionalEdges('retrieve', routeAfterRetrieve, {
      broadenQuery: 'broadenQuery',
      generateAnswer: 'generateAnswer',
    })
    .addEdge('broadenQuery', 'retrieve')
    .addEdge('generateAnswer', 'checkFaithfulness')
    .addEdge('checkFaithfulness', 'appendHistory')
    .addEdge('appendHistory', END)
    .compile({ checkpointer });
}

function getChatGraph() {
  if (!compiledChatGraph) compiledChatGraph = buildChatGraph();
  return compiledChatGraph;
}

export async function answerKnowledgeChatQueryViaGraph(options: {
  conversationId: string;
  query: string;
  kbIds: string[];
  lang?: 'tr' | 'en';
  userContext?: KnowledgeChatUserContext;
  customerId?: string;
  projectId?: string;
  limit?: number;
}): Promise<KnowledgeChatAnswer> {
  const query = options.query.trim();
  const kbIds = options.kbIds.map((id) => String(id).trim()).filter(Boolean);
  const lang = options.lang === 'tr' ? 'tr' : 'en';

  if (!query) throw new Error('Query is required');
  if (kbIds.length === 0) throw new Error('At least one knowledge base id is required');

  const indexedChunkCount = await countKbChunksByKbIds(kbIds);
  if (indexedChunkCount === 0) {
    const noIndexMessage =
      lang === 'tr'
        ? 'Seçili bilgi bankalarında henüz indekslenmiş belge bulunmuyor. Belgeleri yükleyip **İndeksle** ile vektör indeksini oluşturun, ardından tekrar deneyin.'
        : 'No indexed documents exist in the selected knowledge bases yet. Upload files and run **Index** to build the vector index, then try again.';
    return {
      answer: noIndexMessage,
      query,
      kbIds,
      chunkCount: 0,
      sources: [],
      engine: 'graph',
      conversationId: options.conversationId,
    };
  }

  const graph = getChatGraph();
  const result = (await graph.invoke(
    {
      conversationId: options.conversationId,
      query,
      kbIds,
      customerId: options.customerId,
      projectId: options.projectId,
      lang,
      userContext: options.userContext ?? {},
      limit: options.limit ?? 8,
      indexedChunkCount,
    },
    { configurable: { thread_id: options.conversationId } },
  )) as ChatStateT;

  return {
    answer: result.answer,
    query,
    kbIds,
    chunkCount: indexedChunkCount,
    sources: result.hits.map((hit) => ({
      documentName: hit.documentName,
      chunkIndex: hit.chunkIndex,
      score: hit.score,
      textPreview: hit.text.slice(0, 320),
    })),
    engine: 'graph',
    conversationId: options.conversationId,
  };
}
