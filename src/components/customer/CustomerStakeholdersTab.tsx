/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomerStakeholdersSection } from './CustomerStakeholdersSection';
import type { Contact } from '../../types';

export type CustomerStakeholdersTabProps = {
  customerId?: string;
  refreshKey?: number;
  onContactsChange?: (contacts: Contact[]) => void;
};

export function CustomerStakeholdersTab({
  customerId,
  refreshKey,
  onContactsChange,
}: CustomerStakeholdersTabProps) {
  return (
    <CustomerStakeholdersSection
      customerId={customerId}
      refreshKey={refreshKey}
      onContactsChange={onContactsChange}
    />
  );
}
