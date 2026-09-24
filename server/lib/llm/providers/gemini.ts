/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import type { LlmProviderConfig } from '../../../../lib/llmSettings.ts';

function getClient(apiKey: string) {
  const key = apiKey.trim();
  if (!key) {
    throw new Error('Gemini API key is not configured');
  }
  return new GoogleGenAI({ apiKey: key });
}

function extractResponseText(response: {
  text?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}) {
  if (response.text?.trim()) return response.text.trim();
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || '').join('').trim();
}

const EMBED_BATCH_SIZE = 16;

export async function embedTextsWithGemini(
  texts: string[],
  config: LlmProviderConfig,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = config.embeddingModel.trim() || 'gemini-embedding-001';
  const outputDimensionality = config.embeddingDimensions || 768;
  const client = getClient(config.apiKey);
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const response = await client.models.embedContent({
      model,
      contents: batch.map((text) => ({ parts: [{ text }] })),
      config: { outputDimensionality },
    });

    const embeddings = response.embeddings || [];
    if (embeddings.length !== batch.length) {
      throw new Error(
        `Gemini embedding batch size mismatch: expected ${batch.length}, got ${embeddings.length}`,
      );
    }

    for (const item of embeddings) {
      const values = item.values;
      if (!values?.length) {
        throw new Error('Empty embedding vector returned from Gemini');
      }
      vectors.push(values);
    }
  }

  return vectors;
}

export async function generateTextWithGemini(
  prompt: string,
  config: LlmProviderConfig,
): Promise<string> {
  const client = getClient(config.apiKey);
  const model = config.textModel.trim() || 'gemini-2.5-flash';
  const response = await client.models.generateContent({
    model,
    contents: prompt,
  });

  const text = extractResponseText(response);
  if (!text) {
    throw new Error('Empty text response from Gemini');
  }
  return text;
}

export async function generateJsonWithGemini<T>(
  prompt: string,
  config: LlmProviderConfig,
): Promise<T> {
  const client = getClient(config.apiKey);
  const model = config.textModel.trim() || 'gemini-2.5-flash';
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const text = extractResponseText(response);
  if (!text) {
    throw new Error('Empty JSON response from Gemini');
  }
  return JSON.parse(text) as T;
}
