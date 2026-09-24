import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LLM_SETTINGS,
  applyEnvLlmProviderDefaults,
  mergeLlmSettingsForSave,
  mergeLlmSettingsFromEnv,
  maskApiKey,
  normalizeLlmSettings,
} from '../../../lib/llmSettings.ts';

describe('llmSettings helpers', () => {
  it('normalizes partial settings with defaults', () => {
    const settings = normalizeLlmSettings({
      activeProvider: 'openai',
      openai: { textModel: 'gpt-4o-mini' },
    });

    expect(settings.activeProvider).toBe('openai');
    expect(settings.openai.textModel).toBe('gpt-4o-mini');
    expect(settings.gemini.textModel).toBe(DEFAULT_LLM_SETTINGS.gemini.textModel);
  });

  it('masks api keys for client responses', () => {
    expect(maskApiKey('sk-abcdefghijklmnop')).toContain('mnop');
    expect(maskApiKey('')).toBe('');
  });

  it('keeps existing api key when incoming value is masked', () => {
    const existing = normalizeLlmSettings({
      gemini: { apiKey: 'stored-key', textModel: 'gemini-2.5-flash' },
    });
    const incoming = normalizeLlmSettings({
      gemini: { apiKey: '••••••••••••-key', textModel: 'gemini-2.5-flash' },
    });

    const merged = mergeLlmSettingsForSave(existing, incoming);
    expect(merged.gemini.apiKey).toBe('stored-key');
  });

  it('merges Ollama GPU host env overrides without overriding saved providers', () => {
    const prev = { ...process.env };
    process.env.OLLAMA_BASE_URL = 'http://gpu.local:11434';
    process.env.OLLAMA_TEXT_MODEL = 'llama3.2';
    process.env.AI_PROVIDER = 'ollama';

    const merged = mergeLlmSettingsFromEnv(DEFAULT_LLM_SETTINGS);
    expect(merged.activeProvider).toBe(DEFAULT_LLM_SETTINGS.activeProvider);
    expect(merged.ollama.baseUrl).toBe('http://gpu.local:11434');
    expect(merged.ollama.textModel).toBe('llama3.2');

    const withEnvProviders = applyEnvLlmProviderDefaults(DEFAULT_LLM_SETTINGS);
    expect(withEnvProviders.activeProvider).toBe('ollama');

    process.env = prev;
  });
});
