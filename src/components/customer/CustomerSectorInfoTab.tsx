/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer, Segment } from '../../types';
import { SectorClassificationFields } from './SectorClassificationFields';

export type CustomerSectorInfoTabProps = {
  customer?: Customer | null;
  sectors: Segment[];
};

export function CustomerSectorInfoTab({ customer, sectors }: CustomerSectorInfoTabProps) {
  return (
    <div className="space-y-5">
      <SectorClassificationFields initial={customer ?? undefined} sectors={sectors} />
    </div>
  );
}
