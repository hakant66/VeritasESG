/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Branch } from '../types';

/** Tip, il/ilçe ve adresi "Tip, İl / İlçe, Adres" biçiminde birleştirir. */
export function formatBranchLocation(
  branch: Pick<Branch, 'type' | 'province' | 'district' | 'address'>,
): string | undefined {
  const type = branch.type?.trim();
  const province = branch.province?.trim();
  const district = branch.district?.trim();
  const address = branch.address?.trim();
  const provinceDistrict = [province, district].filter(Boolean).join(' / ');
  const parts = [type, provinceDistrict, address].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}
