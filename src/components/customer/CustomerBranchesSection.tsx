/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import * as DB from '../../services/db';
import { Branch } from '../../types';
import { formatBranchLocation } from '../../lib/branchUtils';
import { useTranslation } from '../../hooks/useTranslation';
import Modal from '../ui/Modal';

type CustomerBranchesSectionProps = {
  customerId?: string;
  refreshKey?: number;
};

export function CustomerBranchesSection({ customerId, refreshKey }: CustomerBranchesSectionProps) {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerId) return;
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const branchType = String(formData.get('type') ?? '').trim();
    const address = String(formData.get('address') ?? '').trim();
    if (!name) return;
    setIsSubmitting(true);
    try {
      await DB.branches.create(customerId, { name, type: branchType || undefined, address });
      setShowAdd(false);
      await loadBranches();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerId || !editing) return;
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const branchType = String(formData.get('type') ?? '').trim();
    const address = String(formData.get('address') ?? '').trim();
    if (!name) return;
    setIsSubmitting(true);
    try {
      await DB.branches.update(customerId, editing.id, { name, type: branchType || undefined, address });
      setEditing(null);
      await loadBranches();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!customerId) return;
    if (!window.confirm(`${branch.name}?`)) return;
    try {
      await DB.branches.delete(customerId, branch.id);
      await loadBranches();
    } catch (err) {
      console.error(err);
    }
  };

  return (
  <>
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.customers.branchesSectionTitle}
        </h4>
        {customerId ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            <Plus size={12} />
            {t.customers.addBranchSubmit}
          </button>
        ) : null}
      </div>

      {!customerId ? (
        <p className="text-sm text-slate-500 italic">{t.customers.branchesSaveCustomerFirst}</p>
      ) : loading ? (
        <p className="text-sm text-slate-400">{t.common.loading}</p>
      ) : branches.length === 0 ? (
        <p className="text-sm text-slate-500 italic">{t.customers.noBranchesRegistered}</p>
      ) : (
        <ul className="space-y-2">
          {branches.map((b) => (
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
                  onClick={() => setEditing(b)}
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

    {showAdd && customerId ? (
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
            <input name="type" className="minimal-input" placeholder={t.customers.branchTypePlaceholder} />
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

    {editing && customerId ? (
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
            <input
              name="type"
              className="minimal-input"
              defaultValue={editing.type}
              placeholder={t.customers.branchTypePlaceholder}
            />
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
