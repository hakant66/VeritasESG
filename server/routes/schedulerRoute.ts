import type { Express } from 'express';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';
import {
  createScheduledJob,
  deleteScheduledJob,
  findScheduledJobById,
  listScheduledJobs,
  saveScheduledJobEnabled,
  scheduledJobId,
  updateScheduledJob,
} from '../data/schedulerDataAccess.ts';
import {
  scheduleJob,
  unscheduleJob,
  runJobNow,
} from '../lib/schedulerService.ts';
import { detectBackupEngine, getDefaultBackupCommand } from '../lib/backupCommand.ts';

export function registerSchedulerRoutes(app: Express, options?: { jwtSecret?: string }): void {
  const jwtSecret = options?.jwtSecret || process.env.JWT_SECRET || 'fallback-secret';

  const sendError = (res: any, status: number, error: string) => {
    return res.status(status).json({ success: false, error });
  };

  const sendSuccess = (res: any, data: any, status = 200) => {
    return res.status(status).json({ success: true, data });
  };

  app.get('/api/admin/scheduled-jobs/default-command', async (req, res) => {
    try {
      const auth = await resolvePlatformUserFromRequest(req, jwtSecret);
      if (!auth?.user || auth.reason) {
        return sendError(res, 401, 'Unauthorized');
      }
      if (auth.user.role !== 'platform_admin') {
        return sendError(res, 403, 'Forbidden');
      }

      return sendSuccess(res, {
        engine: detectBackupEngine(),
        command: getDefaultBackupCommand(),
      });
    } catch (err) {
      return sendError(res, 500, String(err));
    }
  });

  app.get('/api/admin/scheduled-jobs', async (req, res) => {
    try {
      const auth = await resolvePlatformUserFromRequest(req, jwtSecret);
      if (!auth?.user || auth.reason) {
        return sendError(res, 401, 'Unauthorized');
      }
      if (auth.user.role !== 'platform_admin') {
        return sendError(res, 403, 'Forbidden');
      }

      const jobs = await listScheduledJobs();
      return sendSuccess(res, jobs);
    } catch (err) {
      return sendError(res, 500, String(err));
    }
  });

  app.post('/api/admin/scheduled-jobs', async (req, res) => {
    try {
      const auth = await resolvePlatformUserFromRequest(req, jwtSecret);
      if (!auth?.user || auth.reason) {
        return sendError(res, 401, 'Unauthorized');
      }
      if (auth.user.role !== 'platform_admin') {
        return sendError(res, 403, 'Forbidden');
      }

      const { name, command, cronExpression, enabled } = req.body;
      if (!name || !command || !cronExpression) {
        return sendError(res, 400, 'Missing required fields: name, command, cronExpression');
      }

      const job = await createScheduledJob({
        name,
        command,
        cronExpression,
        enabled: enabled || false,
        lastRunStatus: 'never',
      });

      if (enabled) {
        await scheduleJob(job as any);
      }

      return sendSuccess(res, job, 201);
    } catch (err) {
      return sendError(res, 500, String(err));
    }
  });

  app.put('/api/admin/scheduled-jobs/:id', async (req, res) => {
    try {
      const auth = await resolvePlatformUserFromRequest(req, jwtSecret);
      if (!auth?.user || auth.reason) {
        return sendError(res, 401, 'Unauthorized');
      }
      if (auth.user.role !== 'platform_admin') {
        return sendError(res, 403, 'Forbidden');
      }

      const { name, command, cronExpression } = req.body;
      const job = await updateScheduledJob(req.params.id, { name, command, cronExpression });

      if (!job) {
        return sendError(res, 404, 'Job not found');
      }

      if (job.enabled) {
        await unscheduleJob(scheduledJobId(job));
        await scheduleJob(job as any);
      }

      return sendSuccess(res, job);
    } catch (err) {
      return sendError(res, 500, String(err));
    }
  });

  app.delete('/api/admin/scheduled-jobs/:id', async (req, res) => {
    try {
      const auth = await resolvePlatformUserFromRequest(req, jwtSecret);
      if (!auth?.user || auth.reason) {
        return sendError(res, 401, 'Unauthorized');
      }
      if (auth.user.role !== 'platform_admin') {
        return sendError(res, 403, 'Forbidden');
      }

      const job = await deleteScheduledJob(req.params.id);
      if (!job) {
        return sendError(res, 404, 'Job not found');
      }

      await unscheduleJob(scheduledJobId(job));
      return sendSuccess(res, { message: 'Job deleted' });
    } catch (err) {
      return sendError(res, 500, String(err));
    }
  });

  app.post('/api/admin/scheduled-jobs/:id/run', async (req, res) => {
    try {
      const auth = await resolvePlatformUserFromRequest(req, jwtSecret);
      if (!auth?.user || auth.reason) {
        return sendError(res, 401, 'Unauthorized');
      }
      if (auth.user.role !== 'platform_admin') {
        return sendError(res, 403, 'Forbidden');
      }

      const job = await findScheduledJobById(req.params.id);
      if (!job) {
        return sendError(res, 404, 'Job not found');
      }

      res.status(202).json({
        status: 'accepted',
        message: 'Job started',
        jobId: scheduledJobId(job),
      });

      void runJobNow(job as any);
    } catch (err) {
      return sendError(res, 500, String(err));
    }
  });

  app.post('/api/admin/scheduled-jobs/:id/toggle', async (req, res) => {
    try {
      const auth = await resolvePlatformUserFromRequest(req, jwtSecret);
      if (!auth?.user || auth.reason) {
        return sendError(res, 401, 'Unauthorized');
      }
      if (auth.user.role !== 'platform_admin') {
        return sendError(res, 403, 'Forbidden');
      }

      const existing = await findScheduledJobById(req.params.id);
      if (!existing) {
        return sendError(res, 404, 'Job not found');
      }

      const job = await saveScheduledJobEnabled(req.params.id, !existing.enabled);
      if (!job) {
        return sendError(res, 404, 'Job not found');
      }

      const jobId = scheduledJobId(job);
      if (job.enabled) {
        await scheduleJob(job as any);
      } else {
        await unscheduleJob(jobId);
      }

      return sendSuccess(res, job);
    } catch (err) {
      return sendError(res, 500, String(err));
    }
  });

  app.post('/api/admin/assignment-reminders/run', async (req, res) => {
    try {
      const auth = await resolvePlatformUserFromRequest(req, jwtSecret);
      if (!auth?.user || auth.reason) {
        return sendError(res, 401, 'Unauthorized');
      }
      if (auth.user.role !== 'platform_admin') {
        return sendError(res, 403, 'Forbidden');
      }

      const { runAssignmentDeadlineReminders } = await import(
        '../lib/assignmentReminderService.ts'
      );
      const result = await runAssignmentDeadlineReminders();
      return sendSuccess(res, result);
    } catch (err) {
      return sendError(res, 500, String(err));
    }
  });
}
