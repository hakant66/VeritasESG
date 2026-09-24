/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import * as DB from '../../services/db';
import type { Branch, Contact } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import Modal from '../ui/Modal';

type EditStakeholderModalProps = {
  contact: Contact | null;
  customerId: string | undefined;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function parseContactForm(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const role = String(formData.get('role') ?? '').trim();
  const department = String(formData.get('department') ?? '').trim();
  const linkedinUrl = String(formData.get('linkedinUrl') ?? '').trim();
  const branchId = String(formData.get('branchId') ?? '').trim();
  return { name, email, role, department, linkedinUrl, branchId };
}

export function EditStakeholderModal({
  contact,
  customerId,
  onClose,
  onSaved,
}: EditStakeholderModalProps) {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBranches = useCallback(async () => {
    if (!customerId) {
      setBranches([]);
      return;
    }
    try {
      setBranches(await DB.branches.listByCustomer(customerId));
    } catch (err) {
      console.error('Failed to load branches:', err);
      setBranches([]);
    }
  }, [customerId]);

  useEffect(() => {
    if (contact && customerId) {
      void loadBranches();
    }
  }, [contact, customerId, loadBranches]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerId || !contact) return;
    const { name, email, role, department, linkedinUrl, branchId } = parseContactForm(
      new FormData(e.currentTarget),
    );
    if (!name || !email) return;
    setIsSubmitting(true);
    try {
      const data: Partial<Contact> = {
        name,
        email,
        role,
        department,
        linkedinUrl: linkedinUrl || undefined,
      };
      if (branchId) data.branchId = branchId;
      else data.branchId = undefined;
      await DB.contacts.update(customerId, contact.id, data);
      await onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to update stakeholder:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(contact && customerId)}
      title={t.customers.editStakeholderModalTitle}
      onClose={onClose}
      showFooterClose={false}
      showHeaderClose
      size="lg"
    >
      {contact ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
              defaultValue={contact.name}
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
              defaultValue={contact.email}
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
                defaultValue={contact.department}
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
                defaultValue={contact.role}
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
              defaultValue={contact.linkedinUrl}
            />
          </div>
          {branches.length > 0 ? (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {t.customers.stakeholderBranchOptionalLabel}
              </label>
              <select
                name="branchId"
                className="minimal-input"
                defaultValue={contact.branchId ?? ''}
              >
                <option value="">{t.customers.stakeholderNoBranch}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="minimal-button-secondary flex-1"
              disabled={isSubmitting}
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="minimal-button-primary flex-1"
            >
              {isSubmitting ? t.common.saving : t.common.update}
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
