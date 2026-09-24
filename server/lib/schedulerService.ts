import cron, { type ScheduledTask } from 'node-cron';
import { spawn } from 'child_process';
import type { ScheduledJob as ScheduledJobRow } from '@prisma/client';
import {
  listEnabledScheduledJobs,
  markScheduledJobRunning,
  recordScheduledJobRun,
  scheduledJobId,
  updateScheduledJobNextRun,
} from '../data/schedulerDataAccess.ts';

const scheduledTasks = new Map<string, ScheduledTask>();

function calculateNextRun(cronExpression: string): Date | undefined {
  try {
    const task = cron.schedule(cronExpression, () => {});
    const nextDate = (task as any).nextDate().toDate();
    task.stop();
    return nextDate;
  } catch {
    return undefined;
  }
}

type ScheduledJob = ScheduledJobRow & { _id?: unknown };

function jobId(job: ScheduledJob): string {
  return scheduledJobId(job as { id?: string; _id?: unknown });
}

export async function executeCommand(job: ScheduledJob): Promise<string> {
  const id = jobId(job);
  return new Promise((resolve) => {
    const replacedCommand = job.command
      .replace(/\$PWD/g, process.env.BACKUP_HOST_PWD || process.cwd())
      .replace(/\$\{PWD\}/g, process.env.BACKUP_HOST_PWD || process.cwd());

    let output = '';
    let error = '';

    const proc = spawn('bash', ['-c', replacedCommand], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 3600000,
    });

    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      error += data.toString();
    });

    const finish = async (code: number | null, errMsg?: string) => {
      const fullOutput = errMsg || output || error || '';
      const trimmed = fullOutput.length > 8192 ? fullOutput.slice(-8192) : fullOutput;

      await recordScheduledJobRun(id, {
        lastRunAt: new Date(),
        lastRunStatus: code === 0 ? 'success' : 'error',
        lastRunOutput: trimmed,
        nextRunAt: calculateNextRun(job.cronExpression),
      });

      resolve(trimmed);
    };

    proc.on('close', (code) => {
      void finish(code);
    });

    proc.on('error', (err) => {
      void finish(null, err.toString());
    });
  });
}

export async function scheduleJob(job: ScheduledJob): Promise<void> {
  const id = jobId(job);
  const existing = scheduledTasks.get(id);
  if (existing) {
    existing.stop();
    scheduledTasks.delete(id);
  }

  if (!job.enabled) {
    return;
  }

  try {
    const task = cron.schedule(job.cronExpression, async () => {
      await markScheduledJobRunning(id);
      await executeCommand(job);
    });

    scheduledTasks.set(id, task);

    const nextRun = calculateNextRun(job.cronExpression);
    await updateScheduledJobNextRun(id, nextRun);
  } catch (err) {
    console.error(`Failed to schedule job ${id}:`, err);
  }
}

export async function unscheduleJob(jobId: string): Promise<void> {
  const task = scheduledTasks.get(jobId);
  if (task) {
    task.stop();
    scheduledTasks.delete(jobId);
  }
}

export async function runJobNow(job: ScheduledJob): Promise<string> {
  const id = jobId(job);
  await markScheduledJobRunning(id);
  return executeCommand(job);
}

export async function initScheduler(): Promise<void> {
  try {
    const jobs = await listEnabledScheduledJobs();
    for (const job of jobs) {
      await scheduleJob(job as unknown as ScheduledJob);
    }
    console.log(`Initialized ${jobs.length} scheduled jobs`);
  } catch (err) {
    console.error('Failed to initialize scheduler:', err);
  }
}

export async function stopAllSchedules(): Promise<void> {
  for (const task of scheduledTasks.values()) {
    task.stop();
  }
  scheduledTasks.clear();
}
