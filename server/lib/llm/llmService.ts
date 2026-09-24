/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LlmEmbeddingProviderId, LlmProviderId } from '../../../lib/llmSettings.ts';
import {
  isEmbeddingProviderConfigured,
  isLlmEmbeddingConfigured,
  isLlmTextConfigured,
  isTextProviderConfigured,
  resolveLlmRuntimeConfig,
} from './llmConfig.ts';
import { generateJsonWithClaude, generateTextWithClaude } from './providers/claude.ts';
import { embedTextsWithGemini, generateJsonWithGemini, generateTextWithGemini } from './providers/gemini.ts';
import { embedTextsWithOllama, generateJsonWithOllama, generateTextWithOllama } from './providers/ollama.ts';
import { embedTextsWithOpenAi, generateJsonWithOpenAi, generateTextWithOpenAi } from './providers/openai.ts';

export { isLlmEmbeddingConfigured, isLlmTextConfigured };

export async function getLlmProviderSummary() {
  const runtime = await resolveLlmRuntimeConfig();
  return {
    textProvider: runtime.textProvider,
    textModel: runtime.text.textModel,
    embeddingProvider: runtime.embeddingProvider,
    textConfigured: isTextProviderConfigured(runtime.textProvider, runtime.text),
    embeddingConfigured: isEmbeddingProviderConfigured(
      runtime.embeddingProvider,
      runtime.embedding,
    ),
  };
}

async function embedWithProvider(
  provider: LlmEmbeddingProviderId,
  texts: string[],
  config: Parameters<typeof embedTextsWithGemini>[1],
) {
  switch (provider) {
    case 'gemini':
      return embedTextsWithGemini(texts, config);
    case 'openai':
      return embedTextsWithOpenAi(texts, config);
    case 'ollama':
      return embedTextsWithOllama(texts, config);
    default:
      throw new Error(`Unsupported embedding provider: ${provider}`);
  }
}

async function generateTextWithProvider(
  provider: LlmProviderId,
  prompt: string,
  config: Parameters<typeof generateTextWithGemini>[1],
) {
  switch (provider) {
    case 'gemini':
      return generateTextWithGemini(prompt, config);
    case 'openai':
      return generateTextWithOpenAi(prompt, config);
    case 'claude':
      return generateTextWithClaude(prompt, config);
    case 'ollama':
      return generateTextWithOllama(prompt, config);
    default:
      throw new Error(`Unsupported text provider: ${provider}`);
  }
}

async function generateJsonWithProvider(
  provider: LlmProviderId,
  prompt: string,
  config: Parameters<typeof generateJsonWithGemini>[1],
) {
  switch (provider) {
    case 'gemini':
      return generateJsonWithGemini(prompt, config);
    case 'openai':
      return generateJsonWithOpenAi(prompt, config);
    case 'claude':
      return generateJsonWithClaude(prompt, config);
    case 'ollama':
      return generateJsonWithOllama(prompt, config);
    default:
      throw new Error(`Unsupported text provider: ${provider}`);
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const runtime = await resolveLlmRuntimeConfig();
  if (!isEmbeddingProviderConfigured(runtime.embeddingProvider, runtime.embedding)) {
    throw new Error(
      `LLM embedding provider "${runtime.embeddingProvider}" is not configured. Set it in Settings → LLM.`,
    );
  }
  return embedWithProvider(runtime.embeddingProvider, texts, runtime.embedding);
}

export async function generateTextFromPrompt(prompt: string): Promise<string> {
  const runtime = await resolveLlmRuntimeConfig();
  if (!isTextProviderConfigured(runtime.textProvider, runtime.text)) {
    throw new Error(
      `LLM text provider "${runtime.textProvider}" is not configured. Set it in Settings → LLM.`,
    );
  }
  return generateTextWithProvider(runtime.textProvider, prompt, runtime.text);
}

export async function generateJsonFromPrompt<T>(prompt: string): Promise<T> {
  const runtime = await resolveLlmRuntimeConfig();
  if (!isTextProviderConfigured(runtime.textProvider, runtime.text)) {
    throw new Error(
      `LLM text provider "${runtime.textProvider}" is not configured. Set it in Settings → LLM.`,
    );
  }
  return generateJsonWithProvider(runtime.textProvider, prompt, runtime.text) as Promise<T>;
}
