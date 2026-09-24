/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared request-body normalization for the generic `/api/db` API, used by both
 * the Mongoose and SQL paths so writes behave identically: reserved keys are
 * dropped and epoch-millis date fields are coerced to Date objects.
 */

import { dateFields } from './apiSerialize.ts';

export function stripReservedFields(input: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined || key === 'id' || key === '_id' || key === '__v') continue;
    data[key] = value;
  }
  return data;
}

export function convertIncomingDates(input: Record<string, unknown>): Record<string, unknown> {
  const data = stripReservedFields(input);
  for (const key of dateFields) {
    const value = data[key];
    if (typeof value === 'number') data[key] = new Date(value);
    if (typeof value === 'string' && /^\d+$/.test(value)) data[key] = new Date(Number(value));
  }
  return data;
}
