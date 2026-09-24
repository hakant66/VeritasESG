/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';
import { getPrisma } from './prismaClient.ts';

export async function findAppSettingByKey(key: string): Promise<Record<string, unknown> | null> {
  const row = await getPrisma().appSetting.findUnique({ where: { key } });
  if (!row) return null;
  return row.data && typeof row.data === 'object'
    ? (row.data as Record<string, unknown>)
    : {};
}

export async function upsertAppSetting(
  key: string,
  data: Record<string, unknown>,
): Promise<void> {
  await getPrisma().appSetting.upsert({
    where: { key },
    create: { key, data: data as Prisma.InputJsonValue },
    update: { data: data as Prisma.InputJsonValue, updatedAt: new Date() },
  });
}
