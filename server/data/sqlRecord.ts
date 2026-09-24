/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared Prisma lookups that mirror Mongoose findByExternalId semantics.
 */

type IdLookupDelegate = {
  findFirst: (args: {
    where: { OR: Array<{ id?: string; legacyFirebaseId?: string }> };
  }) => Promise<Record<string, unknown> | null>;
};

export async function findByIdOrLegacy(
  delegate: IdLookupDelegate,
  id: string,
): Promise<Record<string, unknown> | null> {
  if (!id) return null;
  return delegate.findFirst({ where: { OR: [{ id }, { legacyFirebaseId: id }] } });
}
