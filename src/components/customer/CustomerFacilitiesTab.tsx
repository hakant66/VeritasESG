/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomerBranchesSection } from './CustomerBranchesSection';

export type CustomerFacilitiesTabProps = {
  customerId?: string;
  refreshKey?: number;
};

export function CustomerFacilitiesTab({ customerId, refreshKey }: CustomerFacilitiesTabProps) {
  return <CustomerBranchesSection customerId={customerId} refreshKey={refreshKey} />;
}
