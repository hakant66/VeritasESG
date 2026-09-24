/**
 * Dev-only: set a platform user's password (scrypt hash).
 *
 * Usage:
 *   npm run dev:set-password -- taskin.baba@gmail.com 'MyNewPass123'
 *
 * Requires DATABASE_URL.
 * Blocked when NODE_ENV=production unless ALLOW_DEV_SET_PASSWORD=1.
 */

import dotenv from 'dotenv';
import { hashPassword } from '../server/auth/password.ts';
import { getPrisma } from '../server/data/prismaClient.ts';

dotenv.config();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function usage() {
  console.error(
    'Usage: npm run dev:set-password -- <email> <new-password>\n' +
      'Example: npm run dev:set-password -- taskin.baba@gmail.com \'MyNewPass123\'',
  );
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_SET_PASSWORD !== '1') {
    console.error(
      'Refusing to run in production. Set ALLOW_DEV_SET_PASSWORD=1 to override (not recommended).',
    );
    process.exit(1);
  }

  const emailArg = process.argv[2];
  const passwordArg = process.argv[3];

  if (!emailArg || !passwordArg) {
    usage();
    process.exit(1);
  }

  if (!emailArg.includes('@')) {
    console.error('Invalid email address.');
    process.exit(1);
  }

  if (passwordArg.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const email = normalizeEmail(emailArg);

  const prisma = getPrisma();
  const user = await prisma.platformUser.findFirst({ where: { email } });
  if (!user) {
    console.error(`No platform user found for ${email}`);
    process.exit(1);
  }

  const passwordHash = hashPassword(passwordArg);
  await prisma.platformUser.update({
    where: { id: user.id },
    data: { passwordHash, isConfirmed: true, passwordUpdatedAt: new Date() },
  });

  console.log(`Password updated for ${email} (${user.role})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
