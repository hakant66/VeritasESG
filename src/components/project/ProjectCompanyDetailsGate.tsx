/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from 'react';
import * as DB from '../../services/db';
import type { Customer } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { FormField, YesNoSelect } from '../customer/FormField';
import { SubsidiariesField } from '../customer/SubsidiariesField';
import { ReportingFrameworksPicker } from '../customer/ReportingFrameworksPicker';
import { GriStandardsPicker } from '../customer/GriStandardsPicker';
import { EsrsStandardsPicker } from '../customer/EsrsStandardsPicker';
import {
  reportingFrameworksFromFormData,
  griStandardCodesFromFormData,
  esrsStandardCodesFromFormData,
  parseSubsidiariesJson,
} from '../../lib/customerFormFields';

type ProjectCompanyDetailsGateProps = {
  customer: Customer;
  onConfirmed: (updated: Customer) => void;
  /** Omit when there's no previous step to go back to (e.g. editing from the project's own tab). */
  onCancel?: () => void;
  /** Override the default "confirm and launch" hint/button copy for standalone editing; pass '' to hide it. */
  hint?: string;
  submitLabel?: string;
  /** Hide the built-in "Şirket Detay Bilgileri" heading when the host page already shows its own title. */
  showTitle?: boolean;
};

function parseOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function numDefault(v?: number) {
  return v === undefined || v === null ? '' : String(v);
}

export function ProjectCompanyDetailsGate({
  customer,
  onConfirmed,
  onCancel,
  hint,
  submitLabel,
  showTitle = true,
}: ProjectCompanyDetailsGateProps) {
  const { t } = useTranslation();
  const esg = customer.esgSummary ?? {};
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const reportingFrameworkKeys = reportingFrameworksFromFormData(formData);
    const griStandardCodes = griStandardCodesFromFormData(formData);
    const esrsStandardCodes = esrsStandardCodesFromFormData(formData);
    if (reportingFrameworkKeys.length + griStandardCodes.length + esrsStandardCodes.length === 0) {
      setError(t.projects.companyDetailsGateStandardsRequired);
      return;
    }
    setError(null);

    // Only the fields this gate owns are merged in — everything else already on
    // esgSummary (filled from the customer profile) is preserved untouched.
    const payload: Partial<Customer> = {
      reportingFrameworkKeys: reportingFrameworkKeys as Customer['reportingFrameworkKeys'],
      griStandardCodes,
      esrsStandardCodes,
      employeeCountTotal: parseOptionalNumber(formData.get('employeeCountTotal')),
      annualTurnoverMeur: parseOptionalNumber(formData.get('annualTurnoverMeur')),
      totalAssetsMeur: parseOptionalNumber(formData.get('totalAssetsMeur')),
      esgSummary: {
        ...esg,
        financialYearStart: String(formData.get('esg_financialYearStart') ?? '').trim(),
        financialYearEnd: String(formData.get('esg_financialYearEnd') ?? '').trim(),
        isPubliclyListed: formData.get('esg_isPubliclyListed') === 'yes',
        isSubjectToIndependentAudit: formData.get('esg_isSubjectToIndependentAudit') === 'yes',
        isResponsibleProgramMember: formData.get('esg_isResponsibleProgramMember') === 'yes',
        isTurqualityMember: formData.get('esg_isTurqualityMember') === 'yes',
        isTrEtsInScope: formData.get('esg_isTrEtsInScope') === 'yes',
        subsidiaries: parseSubsidiariesJson(formData.get('esg_subsidiariesJson')),
      },
      companyDetailsConfirmed: true,
    };

    setIsSaving(true);
    try {
      await DB.customers.update(customer.id, payload);
      onConfirmed({ ...customer, ...payload, esgSummary: payload.esgSummary });
    } catch (err) {
      console.error('Failed to save company details gate:', err);
      setError(t.projects.companyDetailsGateSaveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const resolvedHint = hint ?? t.projects.companyDetailsGateHint;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      {showTitle || resolvedHint ? (
        <div>
          {showTitle ? <h3 className="text-sm font-bold text-slate-900">{t.projects.companyDetailsGateTitle}</h3> : null}
          {resolvedHint ? (
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">{resolvedHint}</p>
          ) : null}
        </div>
      ) : null}

      <ReportingFrameworksPicker initialKeys={customer.reportingFrameworkKeys} />
      <GriStandardsPicker initialCodes={customer.griStandardCodes} />
      <EsrsStandardsPicker initialCodes={customer.esrsStandardCodes} />

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.projects.companyDetailsGateReportingPeriodTitle}
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t.customers.totalEmployees}>
            <input
              name="employeeCountTotal"
              type="number"
              className="minimal-input"
              defaultValue={numDefault(customer.employeeCountTotal)}
            />
          </FormField>
          <FormField label={t.customers.annualTurnoverMeurLabel}>
            <input
              name="annualTurnoverMeur"
              type="number"
              min={0}
              step="any"
              className="minimal-input"
              defaultValue={numDefault(customer.annualTurnoverMeur)}
            />
          </FormField>
          <FormField label={t.customers.totalAssetsMeurLabel}>
            <input
              name="totalAssetsMeur"
              type="number"
              min={0}
              step="any"
              className="minimal-input"
              defaultValue={numDefault(customer.totalAssetsMeur)}
            />
          </FormField>
          <FormField label={t.customers.esgFinancialYearStart}>
            <input
              name="esg_financialYearStart"
              type="date"
              className="minimal-input"
              defaultValue={esg.financialYearStart}
            />
          </FormField>
          <FormField label={t.customers.esgFinancialYearEnd}>
            <input
              name="esg_financialYearEnd"
              type="date"
              className="minimal-input"
              defaultValue={esg.financialYearEnd}
            />
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.customers.esgSection6Title}
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t.customers.esgIsPubliclyListed}>
            <YesNoSelect name="esg_isPubliclyListed" defaultValue={esg.isPubliclyListed} />
          </FormField>
          <FormField label={t.customers.esgIsSubjectToIndependentAudit}>
            <YesNoSelect name="esg_isSubjectToIndependentAudit" defaultValue={esg.isSubjectToIndependentAudit} />
          </FormField>
          <FormField label={t.customers.esgIsResponsibleProgramMember}>
            <YesNoSelect name="esg_isResponsibleProgramMember" defaultValue={esg.isResponsibleProgramMember} />
          </FormField>
          <FormField label={t.customers.esgIsTurqualityMember}>
            <YesNoSelect name="esg_isTurqualityMember" defaultValue={esg.isTurqualityMember} />
          </FormField>
          <FormField label={t.customers.esgIsTrEtsInScope}>
            <YesNoSelect name="esg_isTrEtsInScope" defaultValue={esg.isTrEtsInScope} />
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.projects.companyDetailsGateSubsidiariesTitle}
        </h4>
        <SubsidiariesField initial={esg.subsidiaries} />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3 pt-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="minimal-button-secondary flex-1">
            {t.projects.companyDetailsGateBack}
          </button>
        ) : null}
        <button type="submit" disabled={isSaving} className="minimal-button-primary flex-1">
          {isSaving ? t.projects.companyDetailsGateSaving : submitLabel ?? t.projects.companyDetailsGateSubmit}
        </button>
      </div>
    </form>
  );
}
