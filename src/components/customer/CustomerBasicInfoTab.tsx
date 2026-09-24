/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronDown } from 'lucide-react';
import { Customer } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { COUNTRIES } from '../../constants';
import { CustomerLogoNameFields } from './CustomerLogoNameFields';
import { CustomerTaxCurrencyFields } from './CustomerTaxCurrencyFields';
export type CustomerBasicInfoTabProps = {
  customer?: Customer | null;
  tempLogo?: string | null;
  onLogoFile: (dataUrl: string) => void;
  onWebsiteBlur?: (url: string) => void;
};

export function CustomerBasicInfoTab({
  customer,
  tempLogo,
  onLogoFile,
  onWebsiteBlur,
}: CustomerBasicInfoTabProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <CustomerLogoNameFields
        defaultName={customer?.name}
        logoUrl={customer?.logoUrl}
        tempLogo={tempLogo}
        onLogoFile={onLogoFile}
      />

      <div className="space-y-4 border-t border-slate-200/70 pt-4">
        <CustomerTaxCurrencyFields initial={customer ?? undefined} inputClassName="bg-white" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {t.customers.headquartersCountry}
            </label>
            <div className="relative">
              <select
                name="headquartersCountry"
                className="minimal-input h-10 cursor-pointer appearance-none bg-white pr-10"
                defaultValue={customer?.headquartersCountry}
              >
                <option value="">{t.customers.newCustomerModalSelectCountry}</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {t.customers.website}
            </label>
            <input
              name="websiteUrl"
              type="url"
              className="minimal-input bg-white"
              defaultValue={customer?.websiteUrl}
              placeholder={t.customers.newCustomerModalWebsitePlaceholder}
              onBlur={(e) => onWebsiteBlur?.(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.registeredAddress}
          </label>
          <input
            name="address"
            type="text"
            className="minimal-input bg-white"
            defaultValue={customer?.address}
            placeholder={t.customers.newCustomerModalAddressPlaceholder}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.companyDescription}
          </label>
          <textarea
            name="description"
            className="minimal-input h-20 bg-white"
            defaultValue={customer?.description}
            placeholder={t.customers.newCustomerModalDescriptionPlaceholder}
          />
        </div>
      </div>
    </div>
  );
}
