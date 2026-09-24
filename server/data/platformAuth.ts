/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Platform user + OTP persistence for auth routes (Prisma/PostgreSQL).
 */

import { hashPassword, verifyPassword } from '../auth/password.ts';
import { serialize } from '../lib/apiSerialize.ts';
import { getPrisma } from './prismaClient.ts';

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type PlatformUserRow = Record<string, unknown> & {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash?: string | null;
};

function prismaUserToRow(user: Record<string, unknown>): PlatformUserRow {
  return user as PlatformUserRow;
}

export async function findPlatformUserByEmail(email: string): Promise<PlatformUserRow | null> {
  const normalized = normalizeAuthEmail(email);
  const user = await getPrisma().platformUser.findUnique({ where: { email: normalized } });
  return user ? prismaUserToRow(user as Record<string, unknown>) : null;
}

export async function findPlatformUserByEmailWithPassword(email: string): Promise<PlatformUserRow | null> {
  const normalized = normalizeAuthEmail(email);
  const user = await getPrisma().platformUser.findUnique({ where: { email: normalized } });
  return user ? prismaUserToRow(user as Record<string, unknown>) : null;
}

export async function findPlatformUserById(id: string): Promise<PlatformUserRow | null> {
  const user = await getPrisma().platformUser.findUnique({ where: { id } });
  return user ? prismaUserToRow(user as Record<string, unknown>) : null;
}

export async function findPlatformUserByLegacyId(legacyFirebaseId: string): Promise<PlatformUserRow | null> {
  const user = await getPrisma().platformUser.findFirst({ where: { legacyFirebaseId } });
  return user ? prismaUserToRow(user as Record<string, unknown>) : null;
}

export async function countPlatformUsers(): Promise<number> {
  return getPrisma().platformUser.count();
}

/** First-user OTP bootstrap: create platform_admin when DB is empty. */
export async function createBootstrapPlatformUser(email: string): Promise<PlatformUserRow> {
  const normalized = normalizeAuthEmail(email);
  const name = normalized.split('@')[0] || 'Admin';
  const user = await getPrisma().platformUser.create({
    data: {
      name,
      email: normalized,
      role: 'platform_admin',
      department: 'Management',
      isConfirmed: false,
      language: 'tr',
    },
  });
  return prismaUserToRow(user as Record<string, unknown>);
}

export async function getUserForOtpRequest(email: string): Promise<PlatformUserRow | null> {
  const normalized = normalizeAuthEmail(email);
  const existing = await findPlatformUserByEmail(normalized);
  if (existing) return existing;

  const count = await countPlatformUsers();
  if (count > 0) return null;

  return createBootstrapPlatformUser(normalized);
}

export async function recordPlatformUserLogin(userId: string): Promise<PlatformUserRow | null> {
  const now = new Date();
  const user = await getPrisma().platformUser.update({
    where: { id: userId },
    data: { lastLoginAt: now, isConfirmed: true },
  });
  return prismaUserToRow(user as Record<string, unknown>);
}

export async function updatePlatformUserPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = hashPassword(newPassword);
  const now = new Date();
  await getPrisma().platformUser.update({
    where: { id: userId },
    data: { passwordHash, passwordUpdatedAt: now, isConfirmed: true },
  });
}

export function verifyPlatformUserPassword(user: PlatformUserRow, password: string): boolean {
  return verifyPassword(password, user.passwordHash ?? undefined);
}

export function toAuthPublicUser(user: PlatformUserRow): Record<string, unknown> {
  return serialize(user) as Record<string, unknown>;
}

export async function deleteOtpForEmail(email: string): Promise<void> {
  const normalized = normalizeAuthEmail(email);
  await getPrisma().otpCode.deleteMany({ where: { email: normalized } });
}

export async function upsertOtpCode(email: string, code: string, expiresAt: Date): Promise<void> {
  const normalized = normalizeAuthEmail(email);
  await getPrisma().otpCode.upsert({
    where: { email: normalized },
    create: { email: normalized, code, expiresAt },
    update: { code, expiresAt },
  });
}

export async function findValidOtpRecord(
  email: string,
  code: string,
): Promise<{ id: string; email: string } | null> {
  const normalized = normalizeAuthEmail(email);
  const now = new Date();
  const record = await getPrisma().otpCode.findFirst({
    where: { email: normalized, code },
  });
  if (!record || record.expiresAt <= now) return null;
  return { id: record.id, email: record.email };
}

export async function deleteOtpRecord(id: string): Promise<void> {
  await getPrisma().otpCode.delete({ where: { id } });
}
