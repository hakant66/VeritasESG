/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import * as DB from '../../services/db';
import { Branch } from '../../types';
import { formatBranchLocation } from '../../lib/branchUtils';
import { useTranslation } from '../../hooks/useTranslation';
import Modal from '../ui/Modal';

/** A facility being composed before the customer exists — local-only, not yet persisted. */
export type DraftBranch = Omit<Branch, 'customerId' | 'createdAt'>;

const randomDraftId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

type CustomerBranchesSectionProps = {
  customerId?: string;
  refreshKey?: number;
  /** Draft mode (no customerId yet): compose facilities locally, applied once the customer is created. */
  draftBranches?: DraftBranch[];
  onDraftBranchesChange?: (branches: DraftBranch[]) => void;
};

export function CustomerBranchesSection({
  customerId,
  refreshKey,
  draftBranches,
  onDraftBranchesChange,
}: CustomerBranchesSectionProps) {
  const { t } = useTranslation();
  const isDraftMode = !customerId && !!onDraftBranchesChange;
  const sectionActive = !!customerId || isDraftMode;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Branch | DraftBranch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    if (!customerId) {
      setBranches([]);
      return;
    }
    setLoading(true);
    try {
      const list = await DB.branches.listByCustomer(customerId);
      setBranches(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches, refreshKey]);

  const displayBranches: (Branch | DraftBranch)[] = customerId ? branches : draftBranches ?? [];

  const parseBranchForm = (formData: FormData) => {
    const name = String(formData.get('name') ?? '').trim();
    const branchType = String(formData.get('type') ?? '').trim();
    const province = String(formData.get('province') ?? '').trim();
    const district = String(formData.get('district') ?? '').trim();
    const address = String(formData.get('address') ?? '').trim();
    return { name, branchType, province, district, address };
  };

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const { name, branchType, province, district, address } = parseBranchForm(new FormData(e.currentTarget));
    if (!name) return;
    setFormError(null);

    if (customerId) {
      setIsSubmitting(true);
      try {
        await DB.branches.create(customerId, { name, type: branchType || undefined, province, district, address });
        setShowAdd(false);
        await loadBranches();
      } catch (err) {
        console.error('Failed to create branch:', err);
        setFormError(t.customers.branchSaveFailed);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isDraftMode) {
      const draft: DraftBranch = { id: randomDraftId(), name, type: branchType || undefined, province, district, address };
      onDraftBranchesChange?.([...(draftBranches ?? []), draft]);
      setShowAdd(false);
    }
  };

  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editing) return;
    const { name, branchType, province, district, address } = parseBranchForm(new FormData(e.currentTarget));
    if (!name) return;
    setFormError(null);

    if (customerId) {
      setIsSubmitting(true);
      try {
        await DB.branches.update(customerId, editing.id, {
          name,
          type: branchType || undefined,
          province,
          district,
          address,
        });
        setEditing(null);
        await loadBranches();
      } catch (err) {
        console.error('Failed to update branch:', err);
        setFormError(t.customers.branchSaveFailed);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isDraftMode) {
      const updated: DraftBranch = {
        ...(editing as DraftBranch),
        name,
        type: branchType || undefined,
        province,
        district,
        address,
      };
      onDraftBranchesChange?.((draftBranches ?? []).map((b) => (b.id === editing.id ? updated : b)));
      setEditing(null);
    }
  };

  // The select's value IS the display label (matches the historical free-text `type` field,
  // so existing data and the read-only display stay consistent regardless of UI language).
  const branchTypeOptions = [
    t.customers.branchTypeWarehouse,
    t.customers.branchTypeFactory,
    t.customers.branchTypeOffice,
    t.customers.branchTypeStore,
    t.customers.branchTypeDealer,
    t.customers.branchTypeBranch,
    t.customers.branchTypeOther,
  ];

  /** Existing records may carry a free-text type from before this became a select; keep it selectable. */
  const branchTypeOptionsFor = (currentValue?: string) => {
    const trimmed = currentValue?.trim();
    if (trimmed && !branchTypeOptions.includes(trimmed)) return [trimmed, ...branchTypeOptions];
    return branchTypeOptions;
  };

  const handleDelete = async (branch: Branch | DraftBranch) => {
    if (!window.confirm(`${branch.name}?`)) return;

    if (customerId) {
      try {
        await DB.branches.delete(customerId, branch.id);
        await loadBranches();
      } catch (err) {
        console.error(err);
        alert(t.customers.branchDeleteFailed);
      }
      return;
    }

    if (isDraftMode) {
      onDraftBranchesChange?.((draftBranches ?? []).filter((b) => b.id !== branch.id));
    }
  };

  return (
  <>
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.customers.branchesSectionTitle}
        </h4>
        {sectionActive ? (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowAdd(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            <Plus size={12} />
            {t.customers.addBranchSubmit}
          </button>
        ) : null}
      </div>

      {!sectionActive ? (
        <p className="text-sm text-slate-500 italic">{t.customers.branchesSaveCustomerFirst}</p>
      ) : loading ? (
        <p className="text-sm text-slate-400">{t.common.loading}</p>
      ) : displayBranches.length === 0 ? (
        <p className="text-sm text-slate-500 italic">{t.customers.noBranchesRegistered}</p>
      ) : (
        <ul className="space-y-2">
          {displayBranches.map((b) => (
            <li
              key={b.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                {formatBranchLocation(b) ? (
                  <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    {formatBranchLocation(b)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setEditing(b);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                  title={t.customers.editBranchTooltip}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(b)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title={t.common.delete}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>

    {showAdd && sectionActive ? (
      <Modal
        isOpen
        title={t.customers.addBranchModalTitle}
        onClose={() => setShowAdd(false)}
        showFooterClose={false}
        showHeaderClose={false}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {t.customers.branchNameLabel}
            </label>
            <input name="name" required className="minimal-input" placeholder={t.customers.branchNamePlaceholder} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {t.customers.branchTypeLabel}
            </label>
            <select name="type" className="minimal-input" defaultValue="">
              <option value="">{t.customers.branchTypeSelectPlaceholder}</option>
              {branchTypeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {t.customers.headquartersProvinceLabel}
              </label>
              <input name="province" className="minimal-input" placeholder={t.customers.headquartersProvincePlaceholder} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {t.customers.headquartersDistrictLabel}
              </label>
              <input name="district" className="minimal-input" placeholder={t.customers.headquartersDistrictPlaceholder} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {t.customers.branchAddressLabel}
            </label>
            <textarea
              name="address"
              className="minimal-input h-20"
              placeholder={t.customers.branchAddressTextareaPlaceholder}
            />
          </div>
          {formError ? (
            <p className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
              <AlertTriangle size={14} className="shrink-0" />
              {formError}
            </p>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="minimal-button-secondary flex-1">
              {t.common.cancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="minimal-button-primary flex-1">
              {isSubmitting ? t.common.saving : t.customers.addBranchSubmit}
            </button>
          </div>
        </form>
      </Modal>
    ) : null}

    {editing && sectionActive ? (
      <Modal
        isOpen
        title={t.customers.editBranchModalTitle}
        onClose={() => setEditing(null)}
        showFooterClose={false}
        showHeaderClose={false}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {t.customers.branchNameLabel}
            </label>
            <input
              name="name"
              required
              className="minimal-input"
              defaultValue={editing.name}
              placeholder={t.customers.branchNamePlaceholder}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {t.customers.branchTypeLabel}
            </label>
            <select name="type" className="minimal-input" defaultValue={editing.type?.trim() ?? ''}>
              <option value="">{t.customers.branchTypeSelectPlaceholder}</option>
              {branchTypeOptionsFor(editing.type).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {t.customers.headquartersProvinceLabel}
              </label>
              <input
                name="province"
                className="minimal-input"
                defaultValue={editing.province}
                placeholder={t.customers.headquartersProvincePlaceholder}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {t.customers.headquartersDistrictLabel}
              </label>
              <input
                name="district"
                className="minimal-input"
                defaultValue={editing.district}
                placeholder={t.customers.headquartersDistrictPlaceholder}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {t.customers.branchLocationOptionalLabel}
            </label>
            <input
              name="address"
              className="minimal-input"
              defaultValue={editing.address}
              placeholder={t.customers.branchLocationSinglePlaceholder}
            />
          </div>
          {formError ? (
            <p className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
              <AlertTriangle size={14} className="shrink-0" />
              {formError}
            </p>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="minimal-button-secondary flex-1">
              {t.common.cancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="minimal-button-primary flex-1">
              {isSubmitting ? t.common.saving : t.common.update}
            </button>
          </div>
        </form>
      </Modal>
    ) : null}
  </>
  );
}
