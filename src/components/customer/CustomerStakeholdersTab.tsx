/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomerStakeholdersSection, type DraftContact } from './CustomerStakeholdersSection';
import type { Contact } from '../../types';

export type CustomerStakeholdersTabProps = {
  customerId?: string;
  refreshKey?: number;
  onContactsChange?: (contacts: Contact[]) => void;
  draftContacts?: DraftContact[];
  onDraftContactsChange?: (contacts: DraftContact[]) => void;
};

export function CustomerStakeholdersTab({
  customerId,
  refreshKey,
  onContactsChange,
  draftContacts,
  onDraftContactsChange,
}: CustomerStakeholdersTabProps) {
  return (
    <CustomerStakeholdersSection
      customerId={customerId}
      refreshKey={refreshKey}
      onContactsChange={onContactsChange}
      draftContacts={draftContacts}
      onDraftContactsChange={onDraftContactsChange}
    />
  );
}
