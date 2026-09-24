/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Engine-neutral data-access seam for the generic `/api/db/:resource` API.
 *
 * The route builds a neutral `ListQuery` (see below) and calls a
 * `ResourceRepository`; a Prisma-backed implementation lives in
 * `prismaResourceRepository.ts`. The existing Mongoose code path remains the
 * default (DB_DRIVER=mongo). This lets the SQL backend be developed and tested
 * without touching frontend contracts.
 *
 * Rows returned by the repository are plain objects that already carry a string
 * `id`; the route's `serialize()` converts Dates to epoch millis and strips
 * sensitive fields, exactly as it does for Mongoose documents.
 */

export type SortDir = 'asc' | 'desc';

export interface ListQuery {
  /** Field equality filters (already lowercased for `email`). */
  equals?: Record<string, string>;
  /** Match `id` OR `legacyFirebaseId` against this list (the `ids` query param). */
  ids?: string[];
  /** `timestamp >= new Date(ms)` filter used by paged audit logs. */
  timestampGteMs?: number;
  sort?: Record<string, SortDir>;
  skip?: number;
  limit?: number;
}

export type Row = Record<string, unknown> & { id: string };

export interface ResourceRepository {
  list(resource: string, query: ListQuery): Promise<Row[]>;
  count(resource: string, query: ListQuery): Promise<number>;
  /** Resolve by canonical id, falling back to legacyFirebaseId. */
  findByExternalId(resource: string, id: string): Promise<Row | null>;
  create(resource: string, data: Record<string, unknown>): Promise<Row>;
  createMany(resource: string, items: Record<string, unknown>[]): Promise<Row[]>;
  /** PATCH semantics: update by canonical id or legacyFirebaseId. */
  updateByExternalId(resource: string, id: string, data: Record<string, unknown>): Promise<Row | null>;
  /** PUT semantics: upsert keyed on legacyFirebaseId. */
  upsertByLegacyId(resource: string, id: string, data: Record<string, unknown>): Promise<Row>;
  deleteByExternalId(resource: string, id: string): Promise<Row | null>;
}

/** Mongo-hex-like id (24 hex chars), used to decide id-vs-legacyId lookups. */
export function isObjectIdLike(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id);
}
