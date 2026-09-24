/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkOllamaHealth } from '../../../server/lib/llm/ollamaHealth.ts';

describe('checkOllamaHealth', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns model list when Ollama responds', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '0.5.0' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'llama3.2:latest' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

    const health = await checkOllamaHealth('http://127.0.0.1:11434');

    expect(health.ok).toBe(true);
    expect(health.version).toBe('0.5.0');
    expect(health.models).toEqual(['llama3.2:latest']);
  });

  it('returns error when unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('connection refused'));

    const health = await checkOllamaHealth('http://bad-host:11434');

    expect(health.ok).toBe(false);
    expect(health.error).toContain('connection refused');
  });
});
