/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistence for scheduled jobs.
 */

import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';
import { withExternalId, withExternalIds } from './entityLookup.ts';

type Row = Record<string, unknown>;

export async function listScheduledJobs(): Promise<Row[]> {
  const rows = await getPrisma().scheduledJob.findMany({ orderBy: { createdAt: 'desc' } });
  return withExternalIds(rows as Row[]);
}

export async function findScheduledJobById(jobId: string): Promise<Row | null> {
  return withExternalId(await findByIdOrLegacy(getPrisma().scheduledJob, jobId));
}

export async function createScheduledJob(data: {
  name: string;
  command: string;
  cronExpression: string;
  enabled: boolean;
  lastRunStatus: string;
}): Promise<Row> {
  const row = await getPrisma().scheduledJob.create({ data });
  return withExternalId(row as Row)!;
}

export async function updateScheduledJob(
  jobId: string,
  data: Record<string, unknown>,
): Promise<Row | null> {
  const existing = await findByIdOrLegacy(getPrisma().scheduledJob, jobId);
  if (!existing) return null;
  const row = await getPrisma().scheduledJob.update({
    where: { id: String(existing.id) },
    data: { ...data, updatedAt: new Date() } as Record<string, unknown>,
  });
  return withExternalId(row as Row);
}

export async function deleteScheduledJob(jobId: string): Promise<Row | null> {
  const existing = await findByIdOrLegacy(getPrisma().scheduledJob, jobId);
  if (!existing) return null;
  const row = await getPrisma().scheduledJob.delete({ where: { id: String(existing.id) } });
  return withExternalId(row as Row);
}

export async function listEnabledScheduledJobs(): Promise<Row[]> {
  const rows = await getPrisma().scheduledJob.findMany({ where: { enabled: true } });
  return withExternalIds(rows as Row[]);
}

export function scheduledJobId(job: Row): string {
  return String(job.id || job._id || '');
}

export async function saveScheduledJobEnabled(
  jobId: string,
  enabled: boolean,
): Promise<Row | null> {
  return updateScheduledJob(jobId, { enabled });
}

export async function markScheduledJobRunning(jobId: string): Promise<void> {
  await updateScheduledJob(jobId, { lastRunStatus: 'running' });
}

export async function recordScheduledJobRun(
  jobId: string,
  data: {
    lastRunAt?: Date;
    lastRunStatus: string;
    lastRunOutput?: string;
    nextRunAt?: Date;
  },
): Promise<void> {
  await updateScheduledJob(jobId, data);
}

export async function updateScheduledJobNextRun(
  jobId: string,
  nextRunAt?: Date,
): Promise<void> {
  await updateScheduledJob(jobId, { nextRunAt });
}
