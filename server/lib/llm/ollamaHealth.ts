/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OllamaHealthResult = {
  ok: boolean;
  baseUrl: string;
  version?: string;
  models: string[];
  runningModels: Array<{
    name: string;
    sizeVram?: number;
    processor?: string;
  }>;
  error?: string;
};

function normalizeOllamaBaseUrl(baseUrl: string): string {
  const base = baseUrl.trim() || 'http://127.0.0.1:11434';
  return base.replace(/\/$/, '');
}

async function fetchOllamaJson<T>(url: string, timeoutMs = 15_000): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function checkOllamaHealth(baseUrl: string): Promise<OllamaHealthResult> {
  const normalized = normalizeOllamaBaseUrl(baseUrl);

  try {
    const versionBody = await fetchOllamaJson<{ version?: string }>(`${normalized}/api/version`);
    const tagsBody = await fetchOllamaJson<{ models?: Array<{ name?: string }> }>(
      `${normalized}/api/tags`,
    );
    const psBody = await fetchOllamaJson<{
      models?: Array<{
        name?: string;
        size_vram?: number;
        details?: { family?: string };
      }>;
    }>(`${normalized}/api/ps`);

    const models = (tagsBody.models ?? [])
      .map((model) => String(model.name ?? '').trim())
      .filter(Boolean);

    const runningModels = (psBody.models ?? []).map((model) => ({
      name: String(model.name ?? '').trim(),
      sizeVram: typeof model.size_vram === 'number' ? model.size_vram : undefined,
      processor:
        typeof model.size_vram === 'number' && model.size_vram > 0 ? 'gpu' : 'cpu',
    }));

    return {
      ok: true,
      baseUrl: normalized,
      version: versionBody.version,
      models,
      runningModels,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      baseUrl: normalized,
      models: [],
      runningModels: [],
      error: message,
    };
  }
}
