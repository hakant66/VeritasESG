/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import * as DB from '../../services/db';
import { logActivity } from '../../services/db';
import type { Customer, Project, Template } from '../../types';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import Modal from '../ui/Modal';

export type NewProjectLaunchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
  /** When set, customer is pre-selected and cannot be changed. */
  presetCustomerId?: string | null;
  presetCustomerName?: string;
};

export function NewProjectLaunchModal({
  isOpen,
  onClose,
  onCreated,
  presetCustomerId,
  presetCustomerName,
}: NewProjectLaunchModalProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const lockCustomer = Boolean(presetCustomerId);

  const [customersPick, setCustomersPick] = useState<Customer[]>([]);
  const [projectTemplates, setProjectTemplates] = useState<Template[]>([]);
  const [launchCategory] = useState<Project['category']>('Project');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCustomerId(presetCustomerId || '');
    let cancelled = false;

    (async () => {
      setLoadingOptions(true);
      try {
        const [custList, tmplList] = await Promise.all([
          DB.customers.list(),
          DB.templates.listAll(true),
        ]);
        if (cancelled) return;
        setCustomersPick(custList || []);
        setProjectTemplates(tmplList || []);
      } catch (err) {
        console.error('Failed to load project launch options:', err);
        if (!cancelled) {
          setCustomersPick([]);
          setProjectTemplates([]);
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, presetCustomerId]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerId = (lockCustomer ? presetCustomerId : formData.get('customerId')) as string;
    const rawTemplateId = formData.get('templateId');
    const templateId =
      typeof rawTemplateId === 'string' && rawTemplateId.trim() ? rawTemplateId.trim() : undefined;
    const name = (formData.get('name') as string)?.trim();
    const category = (formData.get('category') as Project['category']);
    if (!customerId || !name) return;

    setSubmitting(true);
    try {
      const projectId = await DB.projects.createFromTemplate(
        customerId,
        templateId,
        name,
        user?.uid,
        category,
        false,
      );
      if (user) {
        const cust =
          customersPick.find((c) => c.id === customerId) ||
          (presetCustomerName ? { name: presetCustomerName } : null);
        await logActivity(
          user,
          'create',
          'projects',
          projectId,
          `Launched project "${name}" with category "${category}" for customer ${cust?.name || customerId}`,
        );
      }
      handleClose();
      await onCreated?.();
    } catch (err) {
      console.error('Launch failed:', err);
      alert('Failed to launch project. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const sortedCustomers = [...customersPick].sort((a, b) =>
    (a.name || '').localeCompare(b.name || ''),
  );

  const effectiveCustomerId = lockCustomer ? presetCustomerId : selectedCustomerId;
  const selectedCustomer = useMemo(
    () => customersPick.find((c) => c.id === effectiveCustomerId),
    [customersPick, effectiveCustomerId],
  );

  const launchTemplates = useMemo(() => {
    const sectorIds = selectedCustomer?.sectorIds || [];
    if (!selectedCustomer || sectorIds.length === 0) return [];

    return projectTemplates.filter((tmpl) => tmpl.sectorId && sectorIds.includes(tmpl.sectorId));
  }, [
    projectTemplates,
    selectedCustomer,
  ]);

  return (
    <Modal
      isOpen={isOpen}
      showFooterClose={false}
      title={t.projects.launchModalTitle}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {t.projects.customer}
          </label>
          {lockCustomer && presetCustomerId ? (
            <>
              <input type="hidden" name="customerId" value={presetCustomerId} />
              <input
                type="text"
                readOnly
                disabled
                value={presetCustomerName || sortedCustomers.find((c) => c.id === presetCustomerId)?.name || ''}
                className="minimal-input cursor-not-allowed bg-slate-50 text-slate-700 opacity-90"
                aria-readonly="true"
              />
            </>
          ) : (
            <select
              name="customerId"
              required
              className="minimal-input"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              disabled={loadingOptions}
            >
              <option value="" disabled>
                {t.common.selectItem.replace('{item}', t.nav.customers)}
              </option>
              {sortedCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {t.projects.launchModalProjectTitle}
          </label>
          <input
            name="name"
            type="text"
            required
            className="minimal-input"
            placeholder={
              t.projects.launchModalProjectTitlePlaceholder
            }
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {t.projects.launchModalCategoryLabel}
          </label>
          <input
            type="hidden"
            name="category"
            value={'Project'}
          />
          <select
            disabled
            value={'Project'}
            className="minimal-input cursor-not-allowed bg-slate-50 text-slate-700 opacity-90"
            aria-readonly="true"
          >
            <option value="Project">{t.projects.launchModalCategoryProject}</option>
            </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {t.projects.launchModalSelectDataset}{' '}
            <span className="font-medium normal-case tracking-normal text-slate-400">
              ({t.common.optional})
            </span>
          </label>
          <select
            key={`${effectiveCustomerId || 'none'}-${launchCategory}`}
            name="templateId"
            className="minimal-input"
            disabled={loadingOptions || !effectiveCustomerId}
            defaultValue=""
          >
            <option value="">{t.projects.launchModalSelectPlaceholderOptional}</option>
            {launchTemplates.length === 0 ? (
              <option disabled>{t.projects.launchModalNoTemplates}</option>
            ) : (
              launchTemplates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))
            )}
          </select>
          {launchTemplates.length === 0 && effectiveCustomerId ? (
            <p className="mt-1 text-[10px] font-medium text-slate-500">
              {t.projects.launchModalNoTemplatesOptionalHint}
            </p>
          ) : null}
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={handleClose} className="minimal-button-secondary flex-1">
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting || loadingOptions || !effectiveCustomerId}
            className="minimal-button-primary flex-1"
          >
            {submitting
              ? t.projects.launchModalLaunching
              : t.projects.launchModalInitialize}
          </button>
        </div>
      </form>
    </Modal>
  );
}
