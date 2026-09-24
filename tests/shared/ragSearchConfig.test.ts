/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('getRerankProvider', () => {
  const env = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env };
    delete process.env.RERANK_PROVIDER;
    delete process.env.COHERE_API_KEY;
  });

  afterEach(() => {
    process.env = env;
  });

  it('auto-selects cohere when COHERE_API_KEY is set', async () => {
    process.env.COHERE_API_KEY = 'test-key';
    const { getRerankProvider } = await import('../../lib/ragSearchConfig.ts');
    expect(getRerankProvider()).toBe('cohere');
  });

  it('returns none when explicitly disabled', async () => {
    process.env.COHERE_API_KEY = 'test-key';
    process.env.RERANK_PROVIDER = 'none';
    const { getRerankProvider } = await import('../../lib/ragSearchConfig.ts');
    expect(getRerankProvider()).toBe('none');
  });
});
