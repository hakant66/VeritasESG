/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer } from '../../types';
import { ReportingFrameworksPicker } from './ReportingFrameworksPicker';
import { GriStandardsPicker } from './GriStandardsPicker';
import { EsrsStandardsPicker } from './EsrsStandardsPicker';
import { CsrdScopeCard } from './CsrdScopeCard';

export type CustomerReportingTabProps = {
  customer?: Customer | null;
};

export function CustomerReportingTab({ customer }: CustomerReportingTabProps) {
  return (
    <div className="space-y-5">
      <ReportingFrameworksPicker initialKeys={customer?.reportingFrameworkKeys} />
      <GriStandardsPicker initialCodes={customer?.griStandardCodes} />
      <EsrsStandardsPicker initialCodes={customer?.esrsStandardCodes} />
      <CsrdScopeCard initial={customer ?? undefined} />
    </div>
  );
}
