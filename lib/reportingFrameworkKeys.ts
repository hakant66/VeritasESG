/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Allowed reporting framework keys (synced with src/lib/reportingFrameworks.ts). */
export const REPORTING_FRAMEWORK_KEYS = [
  'ifrs_s1',
  'ifrs_s2',
  'tsrs_1',
  'tsrs_2',
  'esrs_csrd',
  'gri',
  'cdp',
  'tcfd',
] as const;

export type ReportingFrameworkKey = (typeof REPORTING_FRAMEWORK_KEYS)[number];

const FRAMEWORK_ALIASES: Record<string, ReportingFrameworkKey> = {
  ifrs_s1: 'ifrs_s1',
  'ifrs s1': 'ifrs_s1',
  'ifrs-s1': 'ifrs_s1',
  ifrs_s2: 'ifrs_s2',
  'ifrs s2': 'ifrs_s2',
  'ifrs-s2': 'ifrs_s2',
  tsrs_1: 'tsrs_1',
  'tsrs 1': 'tsrs_1',
  tsrs_2: 'tsrs_2',
  'tsrs 2': 'tsrs_2',
  esrs_csrd: 'esrs_csrd',
  esrs: 'esrs_csrd',
  csrd: 'esrs_csrd',
  'esrs / csrd': 'esrs_csrd',
  gri: 'gri',
  'gri standards': 'gri',
  cdp: 'cdp',
  tcfd: 'tcfd',
};

const allowed = new Set<string>(REPORTING_FRAMEWORK_KEYS);

export function normalizeReportingFrameworkKeys(raw: unknown): ReportingFrameworkKey[] {
  const items = Array.isArray(raw) ? raw : String(raw ?? '').split(/[,;]+/);
  const keys: ReportingFrameworkKey[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const normalized = String(item).trim().toLowerCase();
    if (!normalized) continue;
    const key: ReportingFrameworkKey | null =
      FRAMEWORK_ALIASES[normalized] ??
      (allowed.has(normalized) ? (normalized as ReportingFrameworkKey) : null);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }

  return keys;
}
