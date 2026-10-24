/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import * as DB from '../../services/db';
import { logActivity } from '../../services/db';
import { Contact, Customer, Segment } from '../../types';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  autofillCustomerFromKb,
  type BranchAutofillSuggestion,
  type CustomerAutofillFieldSuggestion,
  type StakeholderAutofillSuggestion,
} from '../../lib/kbRag';
import { filterBranchSuggestions } from '../../lib/applyBranchAutofill';
import { filterStakeholderSuggestions } from '../../lib/applyStakeholderAutofill';
import {
  countAutofillSuggestions,
  customerPatchFromAutofill,
  withReportingFrameworksSuggestion,
  withSectorIdsSuggestion,
} from '../../lib/applyCustomerAutofill';
import {
  AUTOFILL_SCOPE_TO_GROUPS,
  enrichAutofillPatch,
  filterSuggestionsForEmptyFields,
  mergeCustomerPatches,
  type CustomerAutofillUiScope,
} from '../../lib/customerAutofillMapping';
import { CustomerAutofillPanel } from './CustomerAutofillPanel';
import Modal from '../ui/Modal';
import { customerPayloadFromFormData } from '../../lib/customerFormFields';
import {
  CustomerFormTabs,
  type CustomerFormTabId,
  getNextVisibleCustomerFormTab,
} from './CustomerFormTabs';

/**
 * Raporlama Çerçeveleri, ESG Öncelikleri ve ESG Özet bu ekrandan kaldırıldı — firma
 * kaydedildikten sonra profil sayfasındaki "Raporlama Çerçeveleri" / "ESG Özet"
 * kartlarından (detaylı bilgi toplama) düzenlenir.
 */
const EDIT_CUSTOMER_VISIBLE_TABS: CustomerFormTabId[] = [
  'basic',
  'stakeholders',
  'facilities',
  'sector',
];
import { CustomerBasicInfoTab } from './CustomerBasicInfoTab';
import { CustomerSectorInfoTab } from './CustomerSectorInfoTab';
import { CustomerReportingTab } from './CustomerReportingTab';
import { CustomerEsgSummaryTab } from './CustomerEsgSummaryTab';
import { CustomerEsgPrioritiesTab } from './CustomerEsgPrioritiesTab';
import { CustomerFacilitiesTab } from './CustomerFacilitiesTab';
import { CustomerStakeholdersTab } from './CustomerStakeholdersTab';
import {
  CustomerBranchAutofillModal,
  type BranchAutofillReviewRow,
} from './CustomerBranchAutofillModal';
import {
  CustomerStakeholderAutofillModal,
  type StakeholderAutofillReviewRow,
} from './CustomerStakeholderAutofillModal';

const getBrandLogo = (url: string) => {
  try {
    const formattedUrl = url.includes('://') ? url : `https://${url}`;
    const domain = new URL(formattedUrl).hostname.replace('www.', '');
    if (!domain) return '';
    return `https://cdn.brandfetch.io/domain/${domain}?c=1id_HZ4dOpJiCU-9g96`;
  } catch {
    return '';
  }
};

export type EditCustomerModalProps = {
  customer: Customer | null;
  sectors: Segment[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: (merged: Customer) => void;
  /** Called after the customer was successfully deleted (modal is closed automatically). */
  onDeleted?: (customerId: string) => void;
};

export function EditCustomerModal({
  customer,
  sectors,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
}: EditCustomerModalProps) {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const [tempLogo, setTempLogo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [onlyFillEmpty, setOnlyFillEmpty] = useState(true);
  const [autofillScope, setAutofillScope] = useState<CustomerAutofillUiScope>('basic');
  const [autofillNotice, setAutofillNotice] = useState<string | null>(null);
  const [autofillSuggestions, setAutofillSuggestions] = useState<Record<
    string,
    CustomerAutofillFieldSuggestion
  > | null>(null);
  const [activeTab, setActiveTab] = useState<CustomerFormTabId>('basic');
  const [autofillDraft, setAutofillDraft] = useState<Partial<Customer> | null>(null);
  const [stakeholderReviewOpen, setStakeholderReviewOpen] = useState(false);
  const [stakeholderReviewRows, setStakeholderReviewRows] = useState<StakeholderAutofillSuggestion[]>(
    [],
  );
  const [isApplyingStakeholders, setIsApplyingStakeholders] = useState(false);
  const [stakeholderRefreshKey, setStakeholderRefreshKey] = useState(0);
  const [branchReviewOpen, setBranchReviewOpen] = useState(false);
  const [branchReviewRows, setBranchReviewRows] = useState<BranchAutofillSuggestion[]>([]);
  const [isApplyingBranches, setIsApplyingBranches] = useState(false);
  const [branchRefreshKey, setBranchRefreshKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  /** null while loading; a real count once fetched. Delete stays disabled until known. */
  const [projectCount, setProjectCount] = useState<number | null>(null);
  /** null until the stakeholders tab has loaded at least once; gates the "at least one" requirement. */
  const [stakeholderCount, setStakeholderCount] = useState<number | null>(null);
  const formKeyRef = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen && customer) {
      formKeyRef.current += 1;
      setTempLogo(null);
      setAutofillDraft(null);
      setAutofillNotice(null);
      setAutofillSuggestions(null);
      setOnlyFillEmpty(true);
      setAutofillScope('basic');
      setStakeholderReviewOpen(false);
      setStakeholderReviewRows([]);
      setStakeholderRefreshKey(0);
      setBranchReviewOpen(false);
      setBranchReviewRows([]);
      setBranchRefreshKey(0);
      setActiveTab('basic');
      setProjectCount(null);
      setStakeholderCount(null);

      const customerId = customer.id;
      DB.getDocs(DB.query(DB.getCol('projects'), DB.where('customerId', '==', customerId)))
        .then((snap) => setProjectCount(snap.docs.length))
        .catch(() => setProjectCount(null));
    }
  }, [isOpen, customer?.id]);

  const handleDelete = async () => {
    if (!customer || isDeleting) return;
    if (!window.confirm(t.customers.deleteCustomerConfirm.replace('{name}', customer.name))) return;

    setIsDeleting(true);
    try {
      await DB.customers.delete(customer.id);
      if (user) {
        await logActivity(user, 'delete', 'customers', customer.id, `Deleted customer "${customer.name}"`);
      }
      onDeleted?.(customer.id);
      onClose();
    } catch (error: unknown) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code === 'db/customer-has-projects') {
        alert(t.customers.deleteCustomerBlockedByProjects);
      } else {
        console.error('Failed to delete customer:', error);
        alert(t.customers.deleteCustomerError);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const displayCustomer = useMemo((): Customer => {
    if (!customer) return customer as Customer;
    if (!autofillDraft) return customer;
    return {
      ...customer,
      ...autofillDraft,
      esgSummary: {
        ...(customer.esgSummary || {}),
        ...(autofillDraft.esgSummary || {}),
      },
    };
  }, [customer, autofillDraft]);

  if (!customer || !isOpen) return null;

  const isLastTab = activeTab === 'sector';

  const handleActiveTabChange = (tab: CustomerFormTabId) => {
    setActiveTab(tab);
    if (tab === 'reporting' || tab === 'priorities' || tab === 'esg') {
      setAutofillScope('reporting');
    }
    if (tab === 'stakeholders') setAutofillScope('stakeholders');
    if (tab === 'facilities') setAutofillScope('facilities');
    if (tab === 'basic') setAutofillScope('basic');
    if (tab === 'sector') setAutofillScope('sector');
  };

  const validateForTab = (formData: FormData, tab: CustomerFormTabId): boolean => {
    const name = String(formData.get('name') ?? '').trim();
    const naceCode = String(formData.get('naceCode') ?? '').trim();
    const sasbSubSectorSics = String(formData.get('sasbSubSectorSics') ?? '').trim();
    const logoUrl = tempLogo || customer.logoUrl || '';

    if (
      tab === 'basic' ||
      tab === 'stakeholders' ||
      tab === 'facilities' ||
      tab === 'sector' ||
      tab === 'reporting' ||
      tab === 'priorities' ||
      tab === 'esg'
    ) {
      if (!name) {
        alert(t.customers.newCustomerValidationNameRequired);
        return false;
      }
    }
    if (tab === 'sector' || tab === 'reporting' || tab === 'priorities' || tab === 'esg') {
      if (!naceCode && !sasbSubSectorSics) {
        alert(t.customers.newCustomerValidationSectorRequired);
        return false;
      }
    }
    if (
      tab === 'stakeholders' ||
      tab === 'facilities' ||
      tab === 'sector' ||
      tab === 'reporting' ||
      tab === 'priorities' ||
      tab === 'esg'
    ) {
      if (stakeholderCount === 0) {
        alert(t.customers.newCustomerValidationStakeholderRequired);
        return false;
      }
    }
    if (logoUrl && logoUrl.startsWith('data:') && logoUrl.length > 800000) {
      alert(t.customers.newCustomerValidationLogoTooLarge);
      return false;
    }
    return true;
  };

  const persistCustomer = async (closeAfter: boolean): Promise<boolean> => {
    const form = formRef.current;
    if (!form) return false;

    const formData = new FormData(form);
    if (!validateForTab(formData, activeTab)) return false;

    const logoUrl = tempLogo || customer.logoUrl;
    const name = String(formData.get('name') ?? '').trim();

    setIsSubmitting(true);
    try {
      const updateData = customerPayloadFromFormData(formData, { logoUrl: logoUrl || '' });
      await DB.customers.update(customer.id, updateData);

      try {
        if (user) {
          await logActivity(user, 'update', 'customers', customer.id, `Updated customer details for "${name}"`);
        }
      } catch (logErr) {
        console.warn('Logging failed, but update succeeded:', logErr);
      }

      const merged = { ...customer, ...updateData } as Customer;
      setTempLogo(null);
      onSaved(merged);

      if (closeAfter) {
        onClose();
      }
      return true;
    } catch (error: unknown) {
      console.error('Update failed:', error);
      const msg =
        error && typeof error === 'object' && 'message' in error && String((error as { message?: string }).message).includes('Quota exceeded')
          ? t.customers.newCustomerErrorQuota
          : t.customers.newCustomerErrorUpdateFailed;
      alert(msg);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndNext = async () => {
    const ok = await persistCustomer(false);
    if (!ok) return;
    const next = getNextVisibleCustomerFormTab(activeTab, EDIT_CUSTOMER_VISIBLE_TABS);
    if (next) handleActiveTabChange(next);
  };

  const handleSave = async () => {
    await persistCustomer(false);
  };

  const handleSaveAndClose = async () => {
    await persistCustomer(true);
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLastTab) {
      void handleSave();
    } else {
      void handleSaveAndNext();
    }
  };

  const handleClose = () => {
    setTempLogo(null);
    setAutofillDraft(null);
    setAutofillNotice(null);
    setAutofillSuggestions(null);
    onClose();
  };

  const handleApplyBranchSuggestions = async (rows: BranchAutofillReviewRow[]) => {
    if (!customer) return;
    const selected = rows.filter((row) => row.selected && row.nameDraft.trim().length >= 2);
    if (selected.length === 0) return;

    setIsApplyingBranches(true);
    try {
      for (const row of selected) {
        await DB.branches.create(customer.id, {
          name: row.nameDraft.trim(),
          type: row.typeDraft.trim() || undefined,
          address: row.addressDraft.trim() || undefined,
        });
      }
      setBranchReviewOpen(false);
      setBranchReviewRows([]);
      setBranchRefreshKey((key) => key + 1);
      setAutofillNotice(
        t.customers.aiAutofillFacilitiesSuccess.replace('{count}', String(selected.length)),
      );
    } catch (error) {
      console.error('Branch autofill apply failed', error);
      alert(t.customers.aiAutofillFailed);
    } finally {
      setIsApplyingBranches(false);
    }
  };

  const handleApplyStakeholderSuggestions = async (rows: StakeholderAutofillReviewRow[]) => {
    if (!customer) return;
    const selected = rows.filter(
      (row) => row.selected && row.emailDraft.trim().includes('@'),
    );
    if (selected.length === 0) return;

    setIsApplyingStakeholders(true);
    try {
      for (const row of selected) {
        await DB.contacts.create(customer.id, {
          name: row.name.trim(),
          email: row.emailDraft.trim(),
          role: row.role?.trim() || '',
          department: row.department?.trim() || '',
          linkedinUrl: row.linkedinUrl?.trim() || undefined,
        });
      }
      setStakeholderReviewOpen(false);
      setStakeholderReviewRows([]);
      setStakeholderRefreshKey((key) => key + 1);
      setAutofillNotice(
        t.customers.aiAutofillStakeholdersSuccess.replace('{count}', String(selected.length)),
      );
    } catch (error) {
      console.error('Stakeholder autofill apply failed', error);
      alert(t.customers.aiAutofillFailed);
    } finally {
      setIsApplyingStakeholders(false);
    }
  };

  const handleAiAutofill = async () => {
    if (!customer) return;
    setIsAutofilling(true);
    setAutofillNotice(null);
    try {
      const groups = AUTOFILL_SCOPE_TO_GROUPS[autofillScope];
      const result = await autofillCustomerFromKb(customer.id, groups);

      if (autofillScope === 'stakeholders') {
        const existingContacts = await DB.contacts.listByCustomer(customer.id);
        const filtered = filterStakeholderSuggestions(
          result.stakeholderSuggestions ?? [],
          existingContacts,
          onlyFillEmpty,
        );
        if (filtered.length === 0) {
          alert(t.customers.aiAutofillStakeholdersEmpty);
          return;
        }
        setStakeholderReviewRows(filtered);
        setStakeholderReviewOpen(true);
        return;
      }

      if (autofillScope === 'facilities') {
        const existingBranches = await DB.branches.listByCustomer(customer.id);
        const filtered = filterBranchSuggestions(
          result.branchSuggestions ?? [],
          existingBranches,
          onlyFillEmpty,
        );
        if (filtered.length === 0) {
          alert(t.customers.aiAutofillFacilitiesEmpty);
          return;
        }
        setBranchReviewRows(filtered);
        setBranchReviewOpen(true);
        return;
      }
      const filtered = filterSuggestionsForEmptyFields(
        displayCustomer,
        result.suggestions,
        onlyFillEmpty,
      );

      let patch = customerPatchFromAutofill(filtered);
      patch = enrichAutofillPatch(patch, filtered, sectors);

      if (onlyFillEmpty && customer.sectorIds?.length) {
        delete patch.sectorIds;
      }

      const resolvedSectorNames =
        patch.sectorIds?.map((id) => sectors.find((s) => s.id === id)?.name).filter(Boolean) as string[] ||
        [];

      let appliedSuggestions = withSectorIdsSuggestion(
        filtered,
        patch.sectorIds || [],
        resolvedSectorNames,
        filtered.naceCode,
      );

      if (patch.reportingFrameworkKeys?.length) {
        appliedSuggestions = withReportingFrameworksSuggestion(
          appliedSuggestions,
          patch.reportingFrameworkKeys,
          lang === 'tr' ? 'tr' : 'en',
          filtered.reportingFrameworkKeys,
        );
      }

      const count = countAutofillSuggestions(appliedSuggestions);

      if (count === 0) {
        const emptyMessage =
          activeTab === 'stakeholders'
            ? t.customers.aiAutofillStakeholdersEmpty
            : activeTab === 'facilities'
              ? t.customers.aiAutofillFacilitiesEmpty
              : t.customers.aiAutofillEmpty;
        alert(emptyMessage);
        setAutofillSuggestions(null);
        return;
      }

      setAutofillDraft((prev) => mergeCustomerPatches(prev, patch));
      setAutofillSuggestions(appliedSuggestions);
      formKeyRef.current += 1;
      setAutofillNotice(
        t.customers.aiAutofillSuccess.replace('{count}', String(count)),
      );
    } catch (error: unknown) {
      console.error('AI autofill failed', error);
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code ?? '')
          : '';
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : t.customers.aiAutofillFailed;
      if (message.toLowerCase().includes('no indexed')) {
        alert(t.customers.aiAutofillNoKb);
      } else if (
        code === 'kb-rag/gemini-unavailable' ||
        /high demand|temporarily busy|unavailable|resource_exhausted|rate limit/i.test(message)
      ) {
        alert(t.customers.aiAutofillGeminiBusy);
      } else if (code === 'kb-rag/gemini-not-configured' || code === 'kb-rag/gemini-denied') {
        alert(t.customers.aiAutofillFailed);
      } else {
        alert(t.customers.aiAutofillFailed);
      }
    } finally {
      setIsAutofilling(false);
    }
  };

  return (
    <Modal
      size="2xl"
      isOpen
      showFooterClose={false}
      title={t.customers.editCustomerModalTitle}
      onClose={handleClose}
    >
      <form
        ref={formRef}
        key={formKeyRef.current}
        onSubmit={handleFormSubmit}
        className="flex min-w-0 max-h-[min(calc(90vh-6rem),900px)] flex-col"
      >
        <div className="mb-2 space-y-1">
          <CustomerAutofillPanel
            isAutofilling={isAutofilling}
            onlyFillEmpty={onlyFillEmpty}
            onOnlyFillEmptyChange={setOnlyFillEmpty}
            scope={autofillScope}
            onScopeChange={setAutofillScope}
            onAutofill={() => void handleAiAutofill()}
            disabled={isSubmitting}
            suggestions={autofillSuggestions}
            activeTab={activeTab}
          />
          {autofillNotice ? (
            <p className="text-xs font-medium text-blue-800">{autofillNotice}</p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1 custom-scrollbar">
          <CustomerFormTabs
            activeTab={activeTab}
            onActiveTabChange={handleActiveTabChange}
            basicContent={
              <CustomerBasicInfoTab
                customer={displayCustomer}
                tempLogo={tempLogo}
                onLogoFile={setTempLogo}
                onWebsiteBlur={(val) => {
                  if (val && (val !== displayCustomer.websiteUrl || !displayCustomer.logoUrl)) {
                    const suggestedLogo = getBrandLogo(val);
                    if (suggestedLogo) setTempLogo(suggestedLogo);
                  }
                }}
              />
            }
            stakeholdersContent={
              <CustomerStakeholdersTab
                customerId={customer.id}
                refreshKey={stakeholderRefreshKey}
                onContactsChange={(contacts: Contact[]) => setStakeholderCount(contacts.length)}
              />
            }
            facilitiesContent={
              <CustomerFacilitiesTab customerId={customer.id} refreshKey={branchRefreshKey} />
            }
            sectorContent={<CustomerSectorInfoTab customer={displayCustomer} sectors={sectors} />}
          />
          {/*
            Raporlama Çerçeveleri, ESG Öncelikleri ve ESG Özet artık bu ekranda sekme olarak
            gösterilmiyor (firma profilindeki "Raporlama Çerçeveleri" / "ESG Özet" kartlarından
            düzenleniyor). Ama bu alanların gizli inputları formda kalmalı — yoksa her kayıtta
            mevcut değerler boş dizilerle/varsayılanlarla ezilir.
          */}
          <div className="hidden" aria-hidden="true">
            <CustomerReportingTab customer={displayCustomer} />
            <CustomerEsgPrioritiesTab customer={displayCustomer} />
            <CustomerEsgSummaryTab customer={displayCustomer} />
          </div>
        </div>

        <div className="mt-4 flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-4 sm:gap-3">
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting || projectCount === null || projectCount > 0}
            title={
              projectCount !== null && projectCount > 0
                ? t.customers.deleteCustomerBlockedByProjects
                : undefined
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Trash2 size={14} />
            {isDeleting ? t.common.loading : t.customers.deleteCustomerButton}
          </button>
          <div className="flex-1" />
          <button type="button" onClick={handleClose} className="minimal-button-secondary min-w-0 flex-1">
            {t.common.cancel}
          </button>
          {isLastTab ? (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSave()}
                className="minimal-button-secondary min-w-0 flex-1"
              >
                {isSubmitting ? t.common.loading : t.common.save}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSaveAndClose()}
                className="minimal-button-primary min-w-0 flex-1"
              >
                {isSubmitting ? t.common.loading : t.customers.saveAndClose}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleSaveAndNext()}
              className="minimal-button-primary min-w-0 flex-1"
            >
              {isSubmitting ? t.common.loading : t.common.save}
            </button>
          )}
        </div>
      </form>

      <CustomerStakeholderAutofillModal
        isOpen={stakeholderReviewOpen}
        suggestions={stakeholderReviewRows}
        isApplying={isApplyingStakeholders}
        onClose={() => {
          setStakeholderReviewOpen(false);
          setStakeholderReviewRows([]);
        }}
        onApply={handleApplyStakeholderSuggestions}
      />

      <CustomerBranchAutofillModal
        isOpen={branchReviewOpen}
        suggestions={branchReviewRows}
        isApplying={isApplyingBranches}
        onClose={() => {
          setBranchReviewOpen(false);
          setBranchReviewRows([]);
        }}
        onApply={handleApplyBranchSuggestions}
      />
    </Modal>
  );
}
