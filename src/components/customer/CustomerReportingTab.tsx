/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer } from '../../types';
import { ReportingFrameworksPicker } from './ReportingFrameworksPicker';
import { CsrdScopeCard } from './CsrdScopeCard';

export type CustomerReportingTabProps = {
  customer?: Customer | null;
};

export function CustomerReportingTab({ customer }: CustomerReportingTabProps) {
  return (
    <div className="space-y-5">
      <ReportingFrameworksPicker initialKeys={customer?.reportingFrameworkKeys} />
      <CsrdScopeCard initial={customer ?? undefined} />
    </div>
  );
}
