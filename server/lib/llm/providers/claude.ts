/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LlmProviderConfig } from '../../../../lib/llmSettings.ts';

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';

function getBaseUrl(config: LlmProviderConfig) {
  return (config.baseUrl.trim() || DEFAULT_BASE_URL).replace(/\/$/, '');
}

function requireApiKey(config: LlmProviderConfig) {
  const key = config.apiKey.trim();
  if (!key) {
    throw new Error('Anthropic API key is not configured');
  }
  return key;
}

async function parseClaudeError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message || res.statusText || 'Claude request failed';
  } catch {
    return res.statusText || 'Claude request failed';
  }
}

async function generateWithClaude(prompt: string, config: LlmProviderConfig): Promise<string> {
  const apiKey = requireApiKey(config);
  const model = config.textModel.trim() || 'claude-sonnet-4-20250514';
  const baseUrl = getBaseUrl(config);

  const res = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const message = await parseClaudeError(res);
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const body = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = (body.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Empty text response from Claude');
  }
  return text;
}

export async function generateTextWithClaude(
  prompt: string,
  config: LlmProviderConfig,
): Promise<string> {
  return generateWithClaude(prompt, config);
}

export async function generateJsonWithClaude<T>(
  prompt: string,
  config: LlmProviderConfig,
): Promise<T> {
  const text = await generateWithClaude(
    `${prompt}\n\nRespond with valid JSON only. Do not wrap the JSON in markdown fences.`,
    config,
  );
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}
