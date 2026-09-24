/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { EsgPolicyStatus } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

export function FormField({
  label,
  children,
  className = '',
  fullWidth,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${fullWidth ? 'md:col-span-2' : ''} ${className}`}>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

export function PolicyStatusSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: EsgPolicyStatus;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <select name={name} className="minimal-input h-10 cursor-pointer appearance-none pr-10" defaultValue={defaultValue ?? ''}>
        <option value="">{t.customers.policyStatusSelect}</option>
        <option value="yes">{t.customers.policyStatusYes}</option>
        <option value="no">{t.customers.policyStatusNo}</option>
        <option value="unknown">{t.customers.policyStatusUnknown}</option>
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        <ChevronDown size={14} />
      </div>
    </div>
  );
}
