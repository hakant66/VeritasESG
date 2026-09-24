/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared entity lookups used by compliance and climate services.
 */

import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';

export async function findProjectById(projectId: string): Promise<Record<string, unknown> | null> {
  return findByIdOrLegacy(getPrisma().project, projectId);
}

/** Normalize a row's identifier to a plain `id` string (legacy rows may carry `_id`). */
export function withExternalId<T extends Record<string, unknown>>(row: T | null): (T & { id: string }) | null {
  if (!row) return null;
  const id = String(row.id || row._id || '');
  return { ...row, id };
}

export function withExternalIds<T extends Record<string, unknown>>(rows: T[]): Array<T & { id: string }> {
  return rows.map((row) => withExternalId(row)!);
}
