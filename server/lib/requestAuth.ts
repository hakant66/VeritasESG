/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import {
  findPlatformUserByEmail,
  findPlatformUserById,
  findPlatformUserByLegacyId,
  type PlatformUserRow,
} from '../data/platformAuth.ts';

export type PlatformAuthPayload = {
  uid?: string;
  sub?: string;
  email?: string;
  role?: string;
};

export type ResolvedPlatformUser = PlatformUserRow;

export async function resolvePlatformUserFromRequest(
  req: Request,
  jwtSecret: string,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return { user: null, decoded: null as PlatformAuthPayload | null, reason: 'missing-token' as const };
  }

  let decoded: PlatformAuthPayload;
  try {
    decoded = jwt.verify(header.slice('Bearer '.length), jwtSecret) as PlatformAuthPayload;
  } catch {
    return { user: null, decoded: null, reason: 'invalid-token' as const };
  }

  const uid = String(decoded?.uid || decoded?.sub || '').trim();
  if (!uid && !decoded?.email) {
    return { user: null, decoded, reason: 'invalid-token' as const };
  }

  let user: PlatformUserRow | null = null;

  if (uid) {
    user = await findPlatformUserById(uid);
    if (!user) {
      user = await findPlatformUserByLegacyId(uid);
    }
  }

  if (!user && decoded.email) {
    user = await findPlatformUserByEmail(decoded.email);
  }

  if (user) return { user, decoded, reason: null };

  return { user: null, decoded, reason: 'user-not-found' as const };
}
