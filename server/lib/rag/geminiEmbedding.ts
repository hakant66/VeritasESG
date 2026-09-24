/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { getEmbeddingDimensions, getEmbeddingModel } from './constants.ts';

let ai: GoogleGenAI | null = null;

function getAi() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export function isGeminiEmbeddingConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

const EMBED_BATCH_SIZE = 16;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = getEmbeddingModel();
  const outputDimensionality = getEmbeddingDimensions();
  const client = getAi();
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
        `Embedding batch size mismatch: expected ${batch.length}, got ${embeddings.length}`,
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
