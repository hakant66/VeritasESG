/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

function unwrapNestedErrorMessage(raw: string): string {
  let message = raw.trim();
  for (let depth = 0; depth < 3; depth += 1) {
    try {
      const parsed = JSON.parse(message) as { error?: string };
      if (typeof parsed?.error !== 'string' || !parsed.error.trim()) break;
      message = parsed.error.trim();
    } catch {
      break;
    }
  }
  return message;
}

/** User-facing message from API / db layer errors. */
export function parseApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const unwrapped = unwrapNestedErrorMessage(err.message);
    if (unwrapped) return unwrapped;
  }
  if (typeof err === 'string' && err.trim()) {
    return unwrapNestedErrorMessage(err);
  }
  return fallback;
}
