/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AuditLog } from '../types';
import type { TranslationKey } from './i18n';

export type EmailDeliveryStatus =
  | 'sent'
  | 'delivered'
  | 'deferred'
  | 'bounced'
  | 'blocked'
  | 'spam'
  | 'failed';

export function resolveEmailDeliveryStatus(log: AuditLog): EmailDeliveryStatus | null {
  if (log.collection !== 'emails') return null;
  if (log.emailDeliveryStatus) return log.emailDeliveryStatus;

  const details = String(log.details || '').toLowerCase();
  if (/delivery:\s*delivered/.test(details)) return 'delivered';
  if (/delivery:\s*deferred/.test(details)) return 'deferred';
  if (/delivery:\s*bounced/.test(details)) return 'bounced';
  if (/delivery:\s*blocked/.test(details)) return 'blocked';
  if (/delivery:\s*spam/.test(details)) return 'spam';
  if (/delivery:\s*failed/.test(details) || /email failed/.test(details)) return 'failed';
  if (/delivery:\s*sent/.test(details) || /email sent/.test(details)) return 'sent';
  return null;
}

export function emailDeliveryStatusLabel(
  status: EmailDeliveryStatus | null,
  t: TranslationKey['audit'],
): string {
  switch (status) {
    case 'sent':
      return t.deliverySent;
    case 'delivered':
      return t.deliveryDelivered;
    case 'deferred':
      return t.deliveryDeferred;
    case 'bounced':
      return t.deliveryBounced;
    case 'blocked':
      return t.deliveryBlocked;
    case 'spam':
      return t.deliverySpam;
    case 'failed':
      return t.deliveryFailed;
    default:
      return t.deliveryUnknown;
  }
}

export function emailDeliveryStatusTone(
  status: EmailDeliveryStatus | null,
): 'success' | 'warning' | 'danger' | 'muted' {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'sent':
    case 'deferred':
      return 'warning';
    case 'bounced':
    case 'blocked':
    case 'spam':
    case 'failed':
      return 'danger';
    default:
      return 'muted';
  }
}

export function isEmailDeliveryFailure(status: EmailDeliveryStatus | null): boolean {
  return status === 'bounced' || status === 'blocked' || status === 'spam' || status === 'failed';
}
