/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function isObjectIdLike(id: string) {
  return /^[0-9a-f]{24}$/i.test(id);
}

export function documentPublicId(doc: {
  legacyFirebaseId?: string;
  _id?: unknown;
  id?: string;
} | null): string {
  if (!doc) return '';
  if (doc.legacyFirebaseId) return String(doc.legacyFirebaseId);
  if (doc.id) return String(doc.id);
  if (doc._id) return String(doc._id);
  return '';
}
