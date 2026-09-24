/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OTP expiry cleanup. Postgres has no TTL index, so this provides a periodic
 * sweep to run on an interval. Correctness never depends on it (OTP verify
 * already rejects expired codes at read time) — this is storage hygiene.
 */

import { getPrisma } from '../data/prismaClient.ts';

export async function deleteExpiredOtps(): Promise<number> {
  const now = new Date();
  const res = await getPrisma().otpCode.deleteMany({ where: { expiresAt: { lt: now } } });
  return res.count;
}

/** Start a periodic sweep (default hourly). Returns a stop function. */
export function startOtpCleanup(intervalMs = 60 * 60 * 1000): () => void {
  const timer = setInterval(() => {
    deleteExpiredOtps().catch((err) => console.error('[otp-cleanup] failed:', err));
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
