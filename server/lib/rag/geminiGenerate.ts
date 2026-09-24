/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

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

function getGeminiTextModel() {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  return fromEnv || 'gemini-2.5-flash';
}

function extractResponseText(response: {
  text?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}) {
  if (response.text?.trim()) return response.text.trim();
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || '').join('').trim();
}

export async function generateJsonFromPrompt<T>(prompt: string): Promise<T> {
  const client = getAi();
  const model = getGeminiTextModel();
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

export async function generateTextFromPrompt(prompt: string): Promise<string> {
  const client = getAi();
  const model = getGeminiTextModel();
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
