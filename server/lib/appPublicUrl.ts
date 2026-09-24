/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function isLocalDevHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0';
}

export function isLocalDevOrigin(url: string): boolean {
  try {
    return isLocalDevHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Public base URL for links in outbound emails (assignments, etc.).
 * Prefers a non-localhost URL when APP_PUBLIC_URL points at localhost but
 * PASSWORD_RESET_PUBLIC_URL (or clientOrigin) is a real deployment host.
 */
export function resolveAppPublicOrigin(clientOrigin?: string | null): string {
  const candidates: string[] = [];

  const fromClient = String(clientOrigin || '').trim();
  if (fromClient) candidates.push(fromClient);

  const fromApp = String(process.env.APP_PUBLIC_URL || '').trim();
  if (fromApp) candidates.push(fromApp);

  const fromReset = String(process.env.PASSWORD_RESET_PUBLIC_URL || '').trim();
  if (fromReset) candidates.push(fromReset);

  const normalized = candidates
    .map(normalizeOrigin)
    .filter((c) => c.length > 0);

  const publicCandidate = normalized.find((c) => !isLocalDevOrigin(c));
  if (publicCandidate) return publicCandidate;

  if (normalized.length > 0) return normalized[0];

  const port = process.env.PORT || '3010';
  return `http://localhost:${port}`;
}
