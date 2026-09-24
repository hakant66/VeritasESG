/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Building,
  Layers,
  FileText,
  Leaf,
  Linkedin,
  Mail,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Branch, Contact, Segment, EsgPolicyStatus, Project, PlatformUser } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { SectorClassificationDisplay } from './SectorClassificationDisplay';
import { EsgSectionCard } from './EsgSectionCard';
import { buildSectoralDefinitionLegacy } from '../../data/sectorClassification';
import { formatMeurValue } from '../../lib/customerFormFields';
import {
  computeCsrdScopeStatus,
  getReportingFrameworkLabel,
} from '../../lib/reportingFrameworks';
import { formatBranchLocation } from '../../lib/branchUtils';
import { cn } from '../../lib/utils';

export type CustomerProfileDataCollapseKey =
  | 'basicInfo'
  | 'projects'
  | 'projectUsers'
  | 'stakeholders'
  | 'facilities'
  | 'sectorInfo'
  | 'reporting'
  | 'esgSummary';

type CustomerProfileDataSectionsProps = {
  customer: Customer;
  contacts: Contact[];
  branches: Branch[];
  projects: Project[];
  projectUsers: PlatformUser[];
  availableSectors: Segment[];
  collapsed: Record<CustomerProfileDataCollapseKey, boolean>;
  onToggle: (key: CustomerProfileDataCollapseKey) => void;
};

export function CustomerProfileDataSections({
  customer,
  contacts,
  branches,
  projects,
  projectUsers,
  availableSectors,
  collapsed,
  onToggle,
}: CustomerProfileDataSectionsProps) {
  const { t, lang } = useTranslation();
  const dateLocale = lang === 'tr' ? 'tr-TR' : 'en-US';
  const esg = customer.esgSummary ?? {};
  const notProvided = t.customers.notProvided;

  const sectoralDisplay =
    customer.sectoralDefinition?.trim() ||
    buildSectoralDefinitionLegacy(customer.naceCode ?? '', customer.naceDescription ?? '');

  const csrdStatus = computeCsrdScopeStatus({
    employeeCount: customer.csrdScopeEmployeeCount,
    turnoverMeur: customer.csrdScopeTurnoverMeur,
    assetsMeur: customer.csrdScopeAssetsMeur,
    isPie: customer.isPublicInterestEntity,
  });

  const csrdBadgeLabel =
    csrdStatus === 'in_scope'
      ? t.customers.csrdScopeInScope
      : csrdStatus === 'pie'
        ? t.customers.csrdScopePieBadge
        : t.customers.csrdScopeOutOfScope;

  const formatPolicy = (status?: EsgPolicyStatus) => {
    if (status === 'yes') return t.customers.policyStatusYes;
    if (status === 'no') return t.customers.policyStatusNo;
    if (status === 'unknown') return t.customers.policyStatusUnknown;
    return notProvided;
  };

  const formatNum = (value?: number) =>
    value === undefined || value === null
      ? undefined
      : value.toLocaleString(dateLocale);

  const formatRoleLabel = (role?: string) =>
    role?.replace(/_/g, ' ').toUpperCase() ?? '';

  return (
    <div className="space-y-4">
      <ProfileCategoryCard
        icon={<Building size={18} />}
        iconClass="bg-blue-50 text-blue-600"
        title={t.customers.tabBasicInfo}
        collapsed={collapsed.basicInfo}
        onToggle={() => onToggle('basicInfo')}
      >
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
          <div className="space-y-5">
            <ProfileField label={t.customers.companyName} value={customer.name} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ProfileField
                label={t.customers.taxNumberLabel}
                value={customer.taxNumber}
                notProvided={notProvided}
              />
              <ProfileField
                label={t.customers.reportingCurrencyLabel}
                value={customer.reportingCurrency}
                notProvided={notProvided}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ProfileField
                label={t.customers.headquartersCountry}
                value={customer.headquartersCountry}
                notProvided={notProvided}
              />
              <ProfileField
                label={t.customers.website}
                value={customer.websiteUrl}
                link={customer.websiteUrl}
                notProvided={notProvided}
              />
            </div>
            <ProfileField
              label={t.customers.registeredAddress}
              value={customer.address}
              notProvided={notProvided}
            />
            <ProfileField
              label={t.customers.companyDescription}
              value={customer.description}
              long
              notProvided={notProvided}
            />
          </div>
        </div>
      </ProfileCategoryCard>

      <ProfileCategoryCard
        icon={<FolderKanban size={18} />}
        iconClass="bg-purple-50 text-purple-600"
        title={t.customers.clientProjects}
        collapsed={collapsed.projects}
        onToggle={() => onToggle('projects')}
        count={projects.length}
        countClass="bg-purple-100 text-purple-700"
      >
        <ProfileRecordsTable
          isEmpty={projects.length === 0}
          emptyMessage={t.customers.noCustomerProjects}
          columns={[
            { header: t.customers.projectNameAndStatus },
            { header: t.customers.projectDetail },
            { header: t.customers.added, align: 'right' },
          ]}
        >
          {projects.map((p) => (
            <tr key={p.id} className="transition-colors hover:bg-slate-50/50">
              <td className="px-4 py-4">
                <Link to={`/projects/${p.id}`} className="mb-0.5 block font-bold text-slate-900 hover:text-blue-600">
                  {p.name}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-[10px] font-medium uppercase',
                      p.category === 'Project' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600',
                    )}
                  >
                    {p.category}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span
                    className={cn(
                      'text-[10px] font-medium uppercase',
                      p.status === 'active' ? 'text-emerald-500' : 'text-slate-400',
                    )}
                  >
                    {p.status}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm font-bold tabular-nums text-slate-700">{p.progress ?? 0}%</span>
              </td>
              <td className="px-4 py-4 text-right text-xs tabular-nums text-slate-400">
                {new Date(p.createdAt).toLocaleDateString(dateLocale)}
              </td>
            </tr>
          ))}
        </ProfileRecordsTable>
      </ProfileCategoryCard>

      <ProfileCategoryCard
        icon={<Briefcase size={18} />}
        iconClass="bg-indigo-50 text-indigo-600"
        title={t.customers.customerProjectUsers}
        collapsed={collapsed.projectUsers}
        onToggle={() => onToggle('projectUsers')}
        count={projectUsers.length}
        countClass="bg-indigo-100 text-indigo-700"
      >
        <ProfileRecordsTable
          isEmpty={projectUsers.length === 0}
          emptyMessage={t.customers.noProjectUsersAssigned}
          columns={[
            { header: t.customers.nameAndRole },
            { header: t.customers.contactDetail },
            { header: t.customers.added, align: 'right' },
          ]}
        >
          {projectUsers.map((u) => (
            <tr key={u.id} className="transition-colors hover:bg-slate-50/50">
              <td className="px-4 py-4">
                <span className="mb-0.5 block font-bold text-slate-900">{u.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase text-slate-500">{formatRoleLabel(u.role)}</span>
                  {u.department ? (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-medium uppercase text-slate-400">{u.department}</span>
                    </>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={12} className="text-slate-400" />
                  <span>{u.email}</span>
                </div>
              </td>
              <td className="px-4 py-4 text-right text-xs tabular-nums text-slate-400">
                {new Date(u.createdAt).toLocaleDateString(dateLocale)}
              </td>
            </tr>
          ))}
        </ProfileRecordsTable>
      </ProfileCategoryCard>

      <ProfileCategoryCard
        icon={<Users size={18} />}
        iconClass="bg-amber-50 text-amber-600"
        title={t.customers.customerStakeholders}
        collapsed={collapsed.stakeholders}
        onToggle={() => onToggle('stakeholders')}
        count={contacts.length}
        countClass="bg-amber-100 text-amber-700"
      >
        <ProfileRecordsTable
          isEmpty={contacts.length === 0}
          emptyMessage={t.customers.noStakeholdersRegistered}
          columns={[
            { header: t.customers.nameAndRole },
            { header: t.customers.contactDetail },
            { header: t.customers.added, align: 'right' },
          ]}
        >
          {contacts.map((c) => (
            <tr key={c.id} className="transition-colors hover:bg-slate-50/50">
              <td className="px-4 py-4">
                <span className="mb-0.5 block font-bold text-slate-900">{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase text-slate-500">{c.role}</span>
                  {c.department ? (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-medium uppercase text-slate-400">{c.department}</span>
                    </>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={12} className="text-slate-400" />
                    <span>{c.email}</span>
                  </div>
                  {c.linkedinUrl ? (
                    <a
                      href={c.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Linkedin size={12} />
                      <span>{t.customers.linkedInProfile}</span>
                    </a>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-4 text-right text-xs tabular-nums text-slate-400">
                {new Date(c.createdAt).toLocaleDateString(dateLocale)}
              </td>
            </tr>
          ))}
        </ProfileRecordsTable>
      </ProfileCategoryCard>

      <ProfileCategoryCard
        icon={<MapPin size={18} />}
        iconClass="bg-emerald-50 text-emerald-600"
        title={t.customers.tabFacilities}
        collapsed={collapsed.facilities}
        onToggle={() => onToggle('facilities')}
        count={branches.length}
        countClass="bg-emerald-100 text-emerald-700"
      >
        <ProfileRecordsTable
          isEmpty={branches.length === 0}
          emptyMessage={t.customers.noBranchesRegistered}
          columns={[
            { header: t.customers.facilityNameAndType },
            { header: t.customers.facilityLocation },
            { header: t.customers.added, align: 'right' },
          ]}
        >
          {branches.map((b) => (
            <tr key={b.id} className="transition-colors hover:bg-slate-50/50">
              <td className="px-4 py-4">
                <span className="mb-0.5 block font-bold text-slate-900">{b.name}</span>
                {b.type ? (
                  <span className="text-[10px] font-medium uppercase text-slate-500">{b.type}</span>
                ) : null}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin size={12} className="shrink-0 text-slate-400" />
                  <span>{formatBranchLocation(b) || t.customers.addressNotListed}</span>
                </div>
              </td>
              <td className="px-4 py-4 text-right text-xs tabular-nums text-slate-400">
                {new Date(b.createdAt).toLocaleDateString(dateLocale)}
              </td>
            </tr>
          ))}
        </ProfileRecordsTable>
      </ProfileCategoryCard>

      <ProfileCategoryCard
        icon={<Layers size={18} />}
        iconClass="bg-violet-50 text-violet-600"
        title={t.customers.tabSectorInfo}
        collapsed={collapsed.sectorInfo}
        onToggle={() => onToggle('sectorInfo')}
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {t.customers.editCustomerSectorsLabel}
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {t.customers.platformSectorsHint}
            </p>
            <div className="rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex flex-wrap gap-2">
                {(customer.sectorIds || []).map((sid) => {
                  const s = availableSectors.find((as) => as.id === sid);
                  return (
                    <span
                      key={sid}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700"
                    >
                      {s?.name || sid}
                    </span>
                  );
                })}
                {(customer.sectorIds || []).length === 0 && (
                  <span className="text-sm italic text-slate-400">
                    {t.customers.noSectorsAssigned}
                  </span>
                )}
              </div>
            </div>
          </div>

          <SectorClassificationDisplay customer={customer} notProvidedLabel={notProvided} />
        </div>
      </ProfileCategoryCard>

      <ProfileCategoryCard
        icon={<FileText size={18} />}
        iconClass="bg-amber-50 text-amber-600"
        title={t.customers.tabReportingFrameworks}
        collapsed={collapsed.reporting}
        onToggle={() => onToggle('reporting')}
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {t.customers.reportingFrameworksTitle}
            </h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {(customer.reportingFrameworkKeys || []).length === 0 ? (
                <span className="text-sm italic text-slate-400">{notProvided}</span>
              ) : (
                (customer.reportingFrameworkKeys || []).map((key) => (
                  <span
                    key={key}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700"
                  >
                    {getReportingFrameworkLabel(key, lang)}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {t.customers.csrdScopeTitle}
              </h4>
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                  csrdStatus === 'in_scope' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                  csrdStatus === 'pie' && 'border-amber-200 bg-amber-50 text-amber-800',
                  csrdStatus === 'out_of_scope' && 'border-slate-200 bg-slate-100 text-slate-600',
                )}
              >
                {csrdBadgeLabel}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{t.customers.csrdScopeHint}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ProfileField
                label={t.customers.csrdScopeEmployees}
                value={formatNum(customer.csrdScopeEmployeeCount)}
                notProvided={notProvided}
              />
              <ProfileField
                label={t.customers.csrdScopeTurnover}
                value={formatMeurValue(customer.csrdScopeTurnoverMeur)}
                notProvided={notProvided}
              />
              <ProfileField
                label={t.customers.csrdScopeAssets}
                value={formatMeurValue(customer.csrdScopeAssetsMeur)}
                notProvided={notProvided}
              />
            </div>
            <ProfileField
              label={t.customers.csrdScopePie}
              value={customer.isPublicInterestEntity ? t.customers.policyStatusYes : t.customers.policyStatusNo}
              className="mt-4"
            />
          </div>
        </div>
      </ProfileCategoryCard>

      <ProfileCategoryCard
        icon={<Leaf size={18} />}
        iconClass="bg-emerald-50 text-emerald-600"
        title={t.customers.tabEsgSummary}
        collapsed={collapsed.esgSummary}
        onToggle={() => onToggle('esgSummary')}
      >
        <div className="space-y-4">
          <EsgSectionCard sectionNumber={1} title={t.customers.esgSection1Title}>
            <ProfileField label={t.customers.legalNameLabel} value={customer.legalName || customer.name} notProvided={notProvided} />
            <ProfileField label={t.customers.brandPortfolio} value={customer.brandPortfolio} long notProvided={notProvided} />
            <ProfileField label={t.customers.naceCodeLabel} value={customer.naceCode} notProvided={notProvided} />
            <ProfileField label={t.customers.sectoralDefinition} value={sectoralDisplay} notProvided={notProvided} />
            <ProfileField label={t.customers.operationalGeographies} value={customer.operationGeographies} long notProvided={notProvided} />
            <ProfileField label={t.customers.totalEmployees} value={formatNum(customer.employeeCountTotal)} notProvided={notProvided} long />
            <div className="md:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProfileField label={t.customers.blueCollar} value={formatNum(customer.employeeCountBlueCollar)} notProvided={notProvided} />
              <ProfileField label={t.customers.whiteCollar} value={formatNum(customer.employeeCountWhiteCollar)} notProvided={notProvided} />
              <ProfileField label={t.customers.male} value={formatNum(customer.employeeCountMale)} notProvided={notProvided} />
              <ProfileField label={t.customers.female} value={formatNum(customer.employeeCountFemale)} notProvided={notProvided} />
              <ProfileField label={t.customers.employeeCountPermanent} value={formatNum(customer.employeeCountPermanent)} notProvided={notProvided} />
              <ProfileField label={t.customers.employeeCountTemporary} value={formatNum(customer.employeeCountTemporary)} notProvided={notProvided} />
            </div>
            <ProfileField label={t.customers.esgReportingBoundaryNote} value={esg.reportingBoundaryNote} long notProvided={notProvided} />
          </EsgSectionCard>

          <EsgSectionCard sectionNumber={2} title={t.customers.esgSection2Title}>
            <ProfileField label={t.customers.esgFinancialYearStart} value={esg.financialYearStart} notProvided={notProvided} />
            <ProfileField label={t.customers.esgFinancialYearEnd} value={esg.financialYearEnd} notProvided={notProvided} />
            <ProfileField label={t.customers.annualTurnoverMeurLabel} value={formatMeurValue(customer.annualTurnoverMeur)} notProvided={notProvided} />
            <ProfileField label={t.customers.totalAssetsMeurLabel} value={formatMeurValue(customer.totalAssetsMeur)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgEbitda} value={formatMeurValue(esg.ebitdaMeur)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgNetProfit} value={formatMeurValue(esg.netProfitMeur)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgEquity} value={formatMeurValue(esg.equityMeur)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgSustainabilityCapex} value={formatMeurValue(esg.sustainabilityCapexForecastMeur)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgRdExpenditure} value={formatMeurValue(esg.rdExpenditureMeur)} notProvided={notProvided} />
          </EsgSectionCard>

          <EsgSectionCard sectionNumber={3} title={t.customers.esgSection3Title}>
            <ProfileField label={t.customers.esgSustainabilityExecutive} value={esg.sustainabilityExecutive} notProvided={notProvided} />
            <ProfileField label={t.customers.esgBusinessResilience} value={esg.businessResilienceAssessment} long notProvided={notProvided} />
            <ProfileField label={t.customers.esgEthicsPolicy} value={formatPolicy(esg.ethicsPolicyStatus)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgGdprKvkk} value={formatPolicy(esg.gdprKvkkPolicyStatus)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgClimateRiskRegister} value={formatPolicy(esg.climateRiskInRegister)} notProvided={notProvided} />
          </EsgSectionCard>

          <EsgSectionCard sectionNumber={4} title={t.customers.esgSection4Title}>
            <ProfileField label={t.customers.esgElectricityMwh} value={formatNum(esg.electricityMwh)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgNaturalGasMwh} value={formatNum(esg.naturalGasMwh)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgFuelMwh} value={formatNum(esg.fuelMwh)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgRenewableEnergyPercent} value={formatNum(esg.renewableEnergyPercent)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgScope1} value={formatNum(esg.scope1EmissionsTco2e)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgScope2} value={formatNum(esg.scope2EmissionsTco2e)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgScope3} value={formatNum(esg.scope3EmissionsTco2e)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgWaterWithdrawal} value={formatNum(esg.waterWithdrawalM3)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgWasteRecycling} value={formatNum(esg.wasteRecyclingPercent)} notProvided={notProvided} />
          </EsgSectionCard>

          <EsgSectionCard sectionNumber={5} title={t.customers.esgSection5Title}>
            <ProfileField label={t.customers.esgLtiRate} value={formatNum(esg.ltiFrequencyRate)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgTrainingHours} value={formatNum(esg.avgTrainingHoursPerEmployee)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgFemaleManagers} value={formatNum(esg.femaleManagerPercent)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgTurnover} value={formatNum(esg.turnoverPercent)} notProvided={notProvided} />
            <ProfileField label={t.customers.esgSupplierAudit} value={formatPolicy(esg.supplierSocialAuditStatus)} notProvided={notProvided} />
          </EsgSectionCard>
        </div>
      </ProfileCategoryCard>
    </div>
  );
}

function ProfileRecordsTable({
  columns,
  isEmpty,
  emptyMessage,
  children,
}: {
  columns: Array<{ header: string; align?: 'right' }>;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  if (isEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {columns.map((col) => (
              <th
                key={col.header}
                className={cn('px-4 py-3 pb-4', col.align === 'right' && 'text-right')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">{children}</tbody>
      </table>
    </div>
  );
}

function ProfileCategoryCard({
  icon,
  iconClass,
  title,
  collapsed,
  onToggle,
  count,
  countClass,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  count?: number;
  countClass?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between border-b border-slate-50 px-6 py-4 transition-colors hover:bg-slate-50/50"
      >
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg p-2', iconClass)}>{icon}</div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">{title}</h2>
          {count !== undefined && count > 0 ? (
            <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-black', countClass)}>{count}</span>
          ) : null}
        </div>
        {collapsed ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronUp size={20} className="text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-6 sm:p-8">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ProfileField({
  label,
  value,
  notProvided = '',
  long,
  link,
  className,
}: {
  label: string;
  value?: string;
  notProvided?: string;
  long?: boolean;
  link?: string;
  className?: string;
}) {
  const display = value?.trim() || notProvided;
  const isEmpty = !value?.trim();

  const href = link
    ? link.startsWith('http')
      ? link
      : `https://${link}`
    : undefined;

  return (
    <div className={cn('space-y-1.5', long && 'md:col-span-2', className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {href && !isEmpty ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold text-blue-600 hover:underline"
        >
          {display}
        </a>
      ) : (
        <p className={cn('text-sm font-medium', isEmpty ? 'italic text-slate-300' : 'text-slate-700', long && 'leading-relaxed')}>
          {display}
        </p>
      )}
    </div>
  );
}
