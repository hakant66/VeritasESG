/**
 * Idempotently create (or update) the default scheduled database backup job.
 *
 * Usage:
 *   npx tsx scripts/seed-default-backup-job.ts
 *
 * Requires DATABASE_URL. The app process (server/lib/schedulerService.ts)
 * only reloads enabled jobs from the DB at boot (`initScheduler()`), so a
 * running server must be restarted for this job to actually start firing.
 */

import { getPrisma } from '../server/data/prismaClient.ts';
import { getDefaultBackupCommand } from '../server/lib/backupCommand.ts';

const JOB_NAME = 'Nightly database backup';
const CRON_EXPRESSION = '0 23 * * *'; // every day at 23:00

async function main() {
  const prisma = getPrisma();
  const command = getDefaultBackupCommand();

  const existing = await prisma.scheduledJob.findFirst({ where: { name: JOB_NAME } });

  if (existing) {
    const job = await prisma.scheduledJob.update({
      where: { id: existing.id },
      data: { command, cronExpression: CRON_EXPRESSION, enabled: true },
    });
    console.log(`Updated existing job "${job.name}" (${job.id}): ${job.cronExpression}`);
  } else {
    const job = await prisma.scheduledJob.create({
      data: {
        name: JOB_NAME,
        command,
        cronExpression: CRON_EXPRESSION,
        enabled: true,
        lastRunStatus: 'never',
      },
    });
    console.log(`Created job "${job.name}" (${job.id}): ${job.cronExpression}`);
  }

  console.log(`Command: ${command}`);
  console.log('Restart the app process/container so the scheduler picks this up.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
