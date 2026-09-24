/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared response serialization for the generic `/api/db` API, extracted so the
 * Mongoose path (`routes/mongoApi.ts`) and the SQL path (`data/genericApiSql.ts`)
 * produce identical JSON: Dates -> epoch millis, passwordHash/_id stripped,
 * avatar URLs and platform roles normalized.
 */

import { normalizePublicAssetUrl } from './publicAssetUrl.ts';
import { normalizePlatformRole } from '../../lib/platformRoles.ts';

export const dateFields = new Set([
  'approvedAt',
  'assignedAt',
  'beginDate',
  'changedAt',
  'completedAt',
  'createdAt',
  'deadline',
  'emailDeliveryAt',
  'expiresAt',
  'generatedAt',
  'lastLoginAt',
  'lastReminderAt',
  'passwordUpdatedAt',
  'sentAt',
  'submittedAt',
  'submittedForApprovalAt',
  'timestamp',
  'tokenExpiry',
  'updatedAt',
]);

export function serialize(value: any): any {
  if (Array.isArray(value)) return value.map(serialize);
  if (!value || typeof value !== 'object') return value;

  const data = typeof value.toJSON === 'function' ? value.toJSON() : { ...value };

  for (const [key, item] of Object.entries(data)) {
    if (item instanceof Date) {
      data[key] = item.getTime();
    } else if (key === 'avatarUrl' && typeof item === 'string') {
      data[key] = normalizePublicAssetUrl(item) || '';
    } else if (typeof item === 'string' && dateFields.has(key)) {
      const parsed = Date.parse(item);
      if (!Number.isNaN(parsed)) data[key] = parsed;
    } else if (item && typeof item === 'object') {
      data[key] = serialize(item);
    }
  }

  delete data.passwordHash;
  delete data._id;

  if (typeof data.role === 'string') {
    const normalized = normalizePlatformRole(data.role);
    if (normalized) data.role = normalized;
  }

  return data;
}
