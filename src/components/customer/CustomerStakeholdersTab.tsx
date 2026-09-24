/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomerStakeholdersSection } from './CustomerStakeholdersSection';

export type CustomerStakeholdersTabProps = {
  customerId?: string;
  refreshKey?: number;
};

export function CustomerStakeholdersTab({ customerId, refreshKey }: CustomerStakeholdersTabProps) {
  return <CustomerStakeholdersSection customerId={customerId} refreshKey={refreshKey} />;
}
