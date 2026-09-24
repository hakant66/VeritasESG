/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LlmProviderConfig } from '../../../../lib/llmSettings.ts';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

function getBaseUrl(config: LlmProviderConfig) {
  return (config.baseUrl.trim() || DEFAULT_BASE_URL).replace(/\/$/, '');
}

function requireApiKey(config: LlmProviderConfig) {
  const key = config.apiKey.trim();
  if (!key) {
    throw new Error('OpenAI API key is not configured');
  }
  return key;
}

async function parseOpenAiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message || res.statusText || 'OpenAI request failed';
  } catch {
    return res.statusText || 'OpenAI request failed';
  }
}

export async function embedTextsWithOpenAi(
  texts: string[],
  config: LlmProviderConfig,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = requireApiKey(config);
  const model = config.embeddingModel.trim() || 'text-embedding-3-small';
  const dimensions = config.embeddingDimensions || 768;
  const baseUrl = getBaseUrl(config);

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: texts,
      dimensions,
    }),
  });

  if (!res.ok) {
    const message = await parseOpenAiError(res);
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const body = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  const rows = body.data || [];
  if (rows.length !== texts.length) {
    throw new Error(
      `OpenAI embedding batch size mismatch: expected ${texts.length}, got ${rows.length}`,
    );
  }

  return rows.map((row) => {
    if (!row.embedding?.length) {
      throw new Error('Empty embedding vector returned from OpenAI');
    }
    return row.embedding;
  });
}

export async function generateTextWithOpenAi(
  prompt: string,
  config: LlmProviderConfig,
): Promise<string> {
  const apiKey = requireApiKey(config);
  const model = config.textModel.trim() || 'gpt-4o-mini';
  const baseUrl = getBaseUrl(config);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const message = await parseOpenAiError(res);
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = body.choices?.[0]?.message?.content?.trim() || '';
  if (!text) {
    throw new Error('Empty text response from OpenAI');
  }
  return text;
}

export async function generateJsonWithOpenAi<T>(
  prompt: string,
  config: LlmProviderConfig,
): Promise<T> {
  const apiKey = requireApiKey(config);
  const model = config.textModel.trim() || 'gpt-4o-mini';
  const baseUrl = getBaseUrl(config);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nRespond with valid JSON only.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const message = await parseOpenAiError(res);
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = body.choices?.[0]?.message?.content?.trim() || '';
  if (!text) {
    throw new Error('Empty JSON response from OpenAI');
  }
  return JSON.parse(text) as T;
}
