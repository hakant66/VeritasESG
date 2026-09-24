/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LlmProviderConfig } from '../../../../lib/llmSettings.ts';

function getBaseUrl(config: LlmProviderConfig) {
  const base = config.baseUrl.trim() || 'http://127.0.0.1:11434';
  return base.replace(/\/$/, '');
}

/** nomic-embed-text context is limited; cap input to avoid Ollama 400 errors. */
const OLLAMA_EMBED_MAX_CHARS = 2048;

function clipEmbedInput(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= OLLAMA_EMBED_MAX_CHARS) return trimmed;
  return trimmed.slice(0, OLLAMA_EMBED_MAX_CHARS);
}

async function parseOllamaError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || res.statusText || 'Ollama request failed';
  } catch {
    return res.statusText || 'Ollama request failed';
  }
}

export async function embedTextsWithOllama(
  texts: string[],
  config: LlmProviderConfig,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const baseUrl = getBaseUrl(config);
  const model = config.embeddingModel.trim() || 'nomic-embed-text';
  const vectors: number[][] = [];

  for (const text of texts) {
    const res = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: clipEmbedInput(text) }),
    });

    if (!res.ok) {
      const message = await parseOllamaError(res);
      const err = new Error(message) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }

    const body = (await res.json()) as { embeddings?: number[][] };
    const embedding = body.embeddings?.[0];
    if (!embedding?.length) {
      throw new Error('Empty embedding vector returned from Ollama');
    }
    vectors.push(embedding);
  }

  return vectors;
}

export async function generateTextWithOllama(
  prompt: string,
  config: LlmProviderConfig,
): Promise<string> {
  const baseUrl = getBaseUrl(config);
  const model = config.textModel.trim() || 'llama3.2';

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const message = await parseOllamaError(res);
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const body = (await res.json()) as { message?: { content?: string } };
  const text = body.message?.content?.trim() || '';
  if (!text) {
    throw new Error('Empty text response from Ollama');
  }
  return text;
}

export async function generateJsonWithOllama<T>(
  prompt: string,
  config: LlmProviderConfig,
): Promise<T> {
  const baseUrl = getBaseUrl(config);
  const model = config.textModel.trim() || 'llama3.2';

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nRespond with valid JSON only.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const message = await parseOllamaError(res);
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const body = (await res.json()) as { message?: { content?: string } };
  const text = body.message?.content?.trim() || '';
  if (!text) {
    throw new Error('Empty JSON response from Ollama');
  }
  return JSON.parse(text) as T;
}
