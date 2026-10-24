/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from 'react';
import * as DB from '../../services/db';
import type { Customer } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { ReportingFrameworksPicker } from '../customer/ReportingFrameworksPicker';
import { GriStandardsPicker } from '../customer/GriStandardsPicker';
import { EsrsStandardsPicker } from '../customer/EsrsStandardsPicker';
import {
  reportingFrameworksFromFormData,
  griStandardCodesFromFormData,
  esrsStandardCodesFromFormData,
} from '../../lib/customerFormFields';

type ProjectReportingFrameworksCardProps = {
  customer: Customer;
  onSaved: (updated: Customer) => void;
};

export function ProjectReportingFrameworksCard({ customer, onSaved }: ProjectReportingFrameworksCardProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload: Partial<Customer> = {
      reportingFrameworkKeys: reportingFrameworksFromFormData(formData) as Customer['reportingFrameworkKeys'],
      griStandardCodes: griStandardCodesFromFormData(formData),
      esrsStandardCodes: esrsStandardCodesFromFormData(formData),
    };
    setError(null);
    setIsSaving(true);
    try {
      await DB.customers.update(customer.id, payload);
      onSaved({ ...customer, ...payload });
    } catch (err) {
      console.error('Failed to save reporting frameworks:', err);
      setError(t.customers.reportingPrioritiesSaveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <ReportingFrameworksPicker initialKeys={customer.reportingFrameworkKeys} />
      <GriStandardsPicker initialCodes={customer.griStandardCodes} />
      <EsrsStandardsPicker initialCodes={customer.esrsStandardCodes} />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSaving} className="minimal-button-primary flex-1">
          {isSaving ? t.common.saving : t.common.save}
        </button>
      </div>
    </form>
  );
}
