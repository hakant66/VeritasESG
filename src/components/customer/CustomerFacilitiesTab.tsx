/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomerBranchesSection, type DraftBranch } from './CustomerBranchesSection';

export type CustomerFacilitiesTabProps = {
  customerId?: string;
  refreshKey?: number;
  draftBranches?: DraftBranch[];
  onDraftBranchesChange?: (branches: DraftBranch[]) => void;
};

export function CustomerFacilitiesTab({
  customerId,
  refreshKey,
  draftBranches,
  onDraftBranchesChange,
}: CustomerFacilitiesTabProps) {
  return (
    <CustomerBranchesSection
      customerId={customerId}
      refreshKey={refreshKey}
      draftBranches={draftBranches}
      onDraftBranchesChange={onDraftBranchesChange}
    />
  );
}
