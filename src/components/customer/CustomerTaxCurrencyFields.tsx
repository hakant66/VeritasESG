/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import type { Customer } from '../../types';

type CustomerTaxCurrencyFieldsProps = {
  initial?: Pick<Customer, 'taxNumber' | 'taxOffice' | 'invoiceEmail' | 'reportingCurrency'>;
  inputClassName?: string;
  /** Minimal mode (new-customer creation): hides reporting currency, which isn't needed up front. */
  minimal?: boolean;
};

export function CustomerTaxCurrencyFields({ initial, inputClassName, minimal }: CustomerTaxCurrencyFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {t.customers.taxNumberLabel}
        </label>
        <input
          name="taxNumber"
          type="text"
          className={cn('minimal-input', inputClassName)}
          defaultValue={initial?.taxNumber}
          placeholder={t.customers.taxNumberPlaceholder}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {t.customers.taxOfficeLabel}
        </label>
        <input
          name="taxOffice"
          type="text"
          className={cn('minimal-input', inputClassName)}
          defaultValue={initial?.taxOffice}
          placeholder={t.customers.taxOfficePlaceholder}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {t.customers.invoiceEmailLabel}
        </label>
        <input
          name="invoiceEmail"
          type="email"
          className={cn('minimal-input', inputClassName)}
          defaultValue={initial?.invoiceEmail}
          placeholder={t.customers.invoiceEmailPlaceholder}
        />
      </div>
      {!minimal ? (
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.reportingCurrencyLabel}
          </label>
          <input
            name="reportingCurrency"
            type="text"
            className={cn('minimal-input uppercase', inputClassName)}
            defaultValue={initial?.reportingCurrency}
            placeholder={t.customers.reportingCurrencyPlaceholder}
            maxLength={3}
            onBlur={(e) => {
              e.target.value = e.target.value.trim().toUpperCase();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
