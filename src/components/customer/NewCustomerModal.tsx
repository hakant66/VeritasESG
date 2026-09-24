/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type FormEvent } from 'react';
import * as DB from '../../services/db';
import { logActivity } from '../../services/db';
import { Segment } from '../../types';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import Modal from '../ui/Modal';
import { customerPayloadFromFormData } from '../../lib/customerFormFields';
import { CustomerFormTabs } from './CustomerFormTabs';
import { CustomerBasicInfoTab } from './CustomerBasicInfoTab';
import { CustomerSectorInfoTab } from './CustomerSectorInfoTab';
import { CustomerReportingTab } from './CustomerReportingTab';
import { CustomerEsgSummaryTab } from './CustomerEsgSummaryTab';
import { CustomerEsgPrioritiesTab } from './CustomerEsgPrioritiesTab';
import { CustomerFacilitiesTab } from './CustomerFacilitiesTab';
import { CustomerStakeholdersTab } from './CustomerStakeholdersTab';

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

export interface NewCustomerModalProps {
  open: boolean;
  onClose: () => void;
  availableSectors: Segment[];
  /** Called after a successful create, before `onClose` */
  onCreated?: () => void | Promise<void>;
}

export function NewCustomerModal({ open, onClose, availableSectors, onCreated }: NewCustomerModalProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [logoDraft, setLogoDraft] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (open) {
      setLogoDraft(null);
      setFormKey((k) => k + 1);
    }
  }, [open]);

  const handleDismiss = () => {
    setLogoDraft(null);
    onClose();
  };

  if (!open) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const logoUrl = logoDraft || '';
    const sectorIds = formData.getAll('sectorIds') as string[];
    const name = String(formData.get('name') ?? '').trim();

    if (!name) {
      alert(t.customers.newCustomerValidationNameRequired);
      return;
    }
    if (sectorIds.length === 0) {
      alert(t.customers.newCustomerValidationSectorRequired);
      return;
    }
    if (logoUrl && logoUrl.startsWith('data:') && logoUrl.length > 800000) {
      alert(t.customers.newCustomerValidationLogoTooLarge);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = customerPayloadFromFormData(formData, { logoUrl });
      const created = await DB.customers.create(payload);

      if (user && created?.id) {
        await logActivity(user, 'create', 'customers', created.id, `Created customer "${name}"`);
      }
      await onCreated?.();
      handleDismiss();
    } catch (error: unknown) {
      console.error('Creation failed:', error);
      const msg = error instanceof Error ? error.message : '';
      alert(
        msg.includes('Quota exceeded')
          ? t.customers.newCustomerErrorQuota
          : t.customers.newCustomerErrorCreateFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      size="xl"
      isOpen
      showFooterClose={false}
      showHeaderClose={false}
      title={t.customers.registerNewCustomer}
      onClose={handleDismiss}
    >
      <form
        key={formKey}
        onSubmit={handleSubmit}
        className="flex min-w-0 max-h-[min(calc(90vh-8rem),780px)] flex-col"
      >
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1 custom-scrollbar">
          <CustomerFormTabs
            basicContent={
              <CustomerBasicInfoTab
                tempLogo={logoDraft}
                onLogoFile={setLogoDraft}
                onWebsiteBlur={(val) => {
                  if (val && !logoDraft) {
                    const suggestedLogo = getBrandLogo(val);
                    if (suggestedLogo) setLogoDraft(suggestedLogo);
                  }
                }}
              />
            }
            stakeholdersContent={<CustomerStakeholdersTab />}
            facilitiesContent={<CustomerFacilitiesTab />}
            sectorContent={<CustomerSectorInfoTab sectors={availableSectors} />}
            reportingContent={<CustomerReportingTab />}
            prioritiesContent={<CustomerEsgPrioritiesTab />}
            esgContent={<CustomerEsgSummaryTab />}
          />
        </div>

        <div className="mt-4 flex shrink-0 gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={handleDismiss} className="minimal-button-secondary flex-1">
            {t.common.cancel}
          </button>
          <button type="submit" disabled={isSubmitting} className="minimal-button-primary flex-1">
            {isSubmitting ? t.customers.creatingCustomer : t.customers.createCustomer}
          </button>
        </div>
      </form>
    </Modal>
  );
}
