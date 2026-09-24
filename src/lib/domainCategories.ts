/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DOMAIN_CATEGORIES = ['esg', 'sasb_issb', 'gri', 'other'] as const;

export type DomainCategory = (typeof DOMAIN_CATEGORIES)[number];

export const DEFAULT_DOMAIN_CATEGORY: DomainCategory = 'esg';

export function isDomainCategory(value: unknown): value is DomainCategory {
  return typeof value === 'string' && (DOMAIN_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeDomainCategory(value: unknown): DomainCategory {
  return isDomainCategory(value) ? value : DEFAULT_DOMAIN_CATEGORY;
}
