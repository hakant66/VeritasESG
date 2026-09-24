/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';

export type CustomerFormTabId =
  | 'basic'
  | 'stakeholders'
  | 'facilities'
  | 'sector'
  | 'reporting'
  | 'priorities'
  | 'esg';

/** @deprecated Use CustomerFormTabId reporting | priorities | esg */
export type SustainabilitySubTabId = 'reporting' | 'priorities' | 'esg';

export const CUSTOMER_FORM_TAB_ORDER: CustomerFormTabId[] = [
  'basic',
  'stakeholders',
  'facilities',
  'sector',
  'reporting',
  'priorities',
  'esg',
];

export function getNextCustomerFormTab(tab: CustomerFormTabId): CustomerFormTabId | null {
  const index = CUSTOMER_FORM_TAB_ORDER.indexOf(tab);
  if (index < 0 || index >= CUSTOMER_FORM_TAB_ORDER.length - 1) return null;
  return CUSTOMER_FORM_TAB_ORDER[index + 1];
}

/** @deprecated Use getNextCustomerFormTab */
export function getNextSustainabilitySubTab(
  sub: SustainabilitySubTabId,
): SustainabilitySubTabId | null {
  return getNextCustomerFormTab(sub) as SustainabilitySubTabId | null;
}

type CustomerFormTabsProps = {
  basicContent: ReactNode;
  stakeholdersContent: ReactNode;
  facilitiesContent: ReactNode;
  sectorContent: ReactNode;
  reportingContent: ReactNode;
  prioritiesContent: ReactNode;
  esgContent: ReactNode;
  activeTab?: CustomerFormTabId;
  onActiveTabChange?: (tab: CustomerFormTabId) => void;
};

export function CustomerFormTabs({
  basicContent,
  stakeholdersContent,
  facilitiesContent,
  sectorContent,
  reportingContent,
  prioritiesContent,
  esgContent,
  activeTab: controlledTab,
  onActiveTabChange,
}: CustomerFormTabsProps) {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState<CustomerFormTabId>('basic');

  const activeTab = controlledTab ?? internalTab;

  const setActiveTab = (tab: CustomerFormTabId) => {
    onActiveTabChange?.(tab);
    if (controlledTab === undefined) setInternalTab(tab);
  };

  const mainTabs: { id: CustomerFormTabId; label: string }[] = [
    { id: 'basic', label: t.customers.tabBasicInfo },
    { id: 'stakeholders', label: t.customers.tabStakeholders },
    { id: 'facilities', label: t.customers.tabFacilities },
    { id: 'sector', label: t.customers.tabSectorInfo },
    { id: 'reporting', label: t.customers.tabReportingFrameworks },
    { id: 'priorities', label: t.customers.tabEsgPriorities },
    { id: 'esg', label: t.customers.tabEsgSummary },
  ];

  return (
    <div className="max-w-full space-y-4 overflow-x-hidden">
      <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:grid-cols-4 lg:grid-cols-7">
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'min-w-0 rounded-xl px-1 py-2 text-center text-[9px] font-bold uppercase leading-tight tracking-wide transition-all sm:px-2 sm:text-[10px] sm:tracking-widest',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={activeTab === 'basic' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'basic'}>
        {basicContent}
      </div>
      <div
        className={activeTab === 'stakeholders' ? 'block' : 'hidden'}
        aria-hidden={activeTab !== 'stakeholders'}
      >
        {stakeholdersContent}
      </div>
      <div
        className={activeTab === 'facilities' ? 'block' : 'hidden'}
        aria-hidden={activeTab !== 'facilities'}
      >
        {facilitiesContent}
      </div>
      <div className={activeTab === 'sector' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'sector'}>
        {sectorContent}
      </div>
      <div
        className={activeTab === 'reporting' ? 'block' : 'hidden'}
        aria-hidden={activeTab !== 'reporting'}
      >
        {reportingContent}
      </div>
      <div
        className={activeTab === 'priorities' ? 'block' : 'hidden'}
        aria-hidden={activeTab !== 'priorities'}
      >
        {prioritiesContent}
      </div>
      <div className={activeTab === 'esg' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'esg'}>
        {esgContent}
      </div>
    </div>
  );
}
