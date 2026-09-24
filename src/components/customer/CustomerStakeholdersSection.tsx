/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Linkedin, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import * as DB from '../../services/db';
import { Branch, Contact } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import Modal from '../ui/Modal';

type CustomerStakeholdersSectionProps = {
  customerId?: string;
  refreshKey?: number;
};

export function CustomerStakeholdersSection({ customerId, refreshKey }: CustomerStakeholdersSectionProps) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!customerId) {
      setContacts([]);
      setBranches([]);
      return;
    }
    setLoading(true);
    try {
      const [cList, bList] = await Promise.all([
        DB.contacts.listByCustomer(customerId),
        DB.branches.listByCustomer(customerId),
      ]);
      setContacts(cList);
      setBranches(bList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts, refreshKey]);

  const parseContactForm = (formData: FormData) => {
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const role = String(formData.get('role') ?? '').trim();
    const department = String(formData.get('department') ?? '').trim();
    const linkedinUrl = String(formData.get('linkedinUrl') ?? '').trim();
    const branchId = String(formData.get('branchId') ?? '').trim();
    return { name, email, role, department, linkedinUrl, branchId };
  };

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerId) return;
    const { name, email, role, department, linkedinUrl, branchId } = parseContactForm(new FormData(e.currentTarget));
    if (!name || !email) return;
    setIsSubmitting(true);
    try {
      const data: Omit<Contact, 'id' | 'customerId' | 'createdAt'> = {
        name,
        email,
        role,
        department,
        linkedinUrl: linkedinUrl || undefined,
      };
      if (branchId) data.branchId = branchId;
      await DB.contacts.create(customerId, data);
      setShowAdd(false);
      await loadContacts();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerId || !editing) return;
    const { name, email, role, department, linkedinUrl, branchId } = parseContactForm(new FormData(e.currentTarget));
    if (!name || !email) return;
    setIsSubmitting(true);
    try {
      const data: Partial<Contact> = { name, email, role, department, linkedinUrl: linkedinUrl || undefined };
      if (branchId) data.branchId = branchId;
      else data.branchId = undefined;
      await DB.contacts.update(customerId, editing.id, data);
      setEditing(null);
      await loadContacts();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (contact: Contact) => {
    if (!customerId) return;
    if (!window.confirm(t.customers.deleteStakeholderConfirm.replace('{name}', contact.name))) return;
    try {
      await DB.contacts.delete(customerId, contact.id);
      await loadContacts();
    } catch (err) {
      console.error(err);
    }
  };

  const stakeholderFormFields = (contact?: Contact) => (
    <>
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {t.users.fullName}
        </label>
        <input
          name="name"
          type="text"
          required
          className="minimal-input"
          placeholder={t.customers.stakeholderNamePlaceholder}
          defaultValue={contact?.name}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {t.users.emailAddress}
        </label>
        <input
          name="email"
          type="email"
          required
          className="minimal-input"
          placeholder={t.customers.stakeholderEmailPlaceholder}
          defaultValue={contact?.email}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {t.common.department}
          </label>
          <input
            name="department"
            type="text"
            className="minimal-input"
            placeholder={t.customers.stakeholderDepartmentPlaceholder}
            defaultValue={contact?.department}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {t.common.role}
          </label>
          <input
            name="role"
            type="text"
            className="minimal-input"
            placeholder={t.customers.stakeholderRolePlaceholder}
            defaultValue={contact?.role}
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {t.customers.stakeholderLinkedInLabel}
        </label>
        <input
          name="linkedinUrl"
          type="url"
          className="minimal-input"
          placeholder={t.customers.stakeholderLinkedInPlaceholder}
          defaultValue={contact?.linkedinUrl}
        />
      </div>
      {branches.length > 0 ? (
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {t.customers.stakeholderBranchOptionalLabel}
          </label>
          <select name="branchId" className="minimal-input" defaultValue={contact?.branchId ?? ''}>
            <option value="">{t.customers.stakeholderNoBranch}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {t.customers.stakeholdersSectionTitle}
          </h4>
          {customerId ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
            >
              <Plus size={12} />
              {t.customers.addStakeholderSubmit}
            </button>
          ) : null}
        </div>

        {!customerId ? (
          <p className="text-sm text-slate-500 italic">{t.customers.stakeholdersSaveCustomerFirst}</p>
        ) : loading ? (
          <p className="text-sm text-slate-400">{t.common.loading}</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-slate-500 italic">{t.customers.noStakeholdersRegistered}</p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {c.role ? (
                      <span className="text-[10px] font-medium uppercase text-slate-500">{c.role}</span>
                    ) : null}
                    {c.department ? (
                      <>
                        {c.role ? <span className="text-slate-300">•</span> : null}
                        <span className="text-[10px] font-medium uppercase text-slate-400">{c.department}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Mail size={12} className="shrink-0 text-slate-400" />
                      {c.email}
                    </p>
                    {c.linkedinUrl ? (
                      <a
                        href={c.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                      >
                        <Linkedin size={12} />
                        {t.customers.linkedInProfile}
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    title={t.customers.editStakeholderTooltip}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(c)}
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
          title={t.customers.addStakeholderModalTitle}
          onClose={() => setShowAdd(false)}
          showFooterClose={false}
          showHeaderClose={false}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            {stakeholderFormFields()}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="minimal-button-secondary flex-1">
                {t.common.cancel}
              </button>
              <button type="submit" disabled={isSubmitting} className="minimal-button-primary flex-1">
                {isSubmitting ? t.common.saving : t.customers.addStakeholderSubmit}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editing && customerId ? (
        <Modal
          isOpen
          title={t.customers.editStakeholderModalTitle}
          onClose={() => setEditing(null)}
          showFooterClose={false}
          showHeaderClose={false}
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            {stakeholderFormFields(editing)}
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
