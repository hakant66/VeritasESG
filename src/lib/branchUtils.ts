/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Branch } from '../types';

/** Tip ve lokasyonu "Tip, Lokasyon" biçiminde birleştirir. */
export function formatBranchLocation(branch: Pick<Branch, 'type' | 'address'>): string | undefined {
  const type = branch.type?.trim();
  const address = branch.address?.trim();
  if (type && address) return `${type}, ${address}`;
  return type || address || undefined;
}
