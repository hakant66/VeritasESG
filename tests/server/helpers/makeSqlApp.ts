/**
 * Minimal Express app for SQL integration tests (Testcontainers).
 * Uses platformAuth + Prisma data access — mirrors production `DB_DRIVER=sql` routes.
 */
import express from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { registerMongoApiRoutes } from '../../../server/routes/mongoApi.ts';
import { registerMaterialitySurveyRoutes } from '../../../server/routes/materialitySurveyRoute.ts';
import { registerOnBehalfResponseRoutes } from '../../../server/routes/onBehalfResponse.ts';
import { registerLlmSettingsRoutes } from '../../../server/routes/llmSettingsRoute.ts';
import { resolvePlatformUserFromRequest } from '../../../server/lib/requestAuth.ts';
import {
  deleteOtpForEmail,
  deleteOtpRecord,
  findPlatformUserByEmail,
  findPlatformUserByEmailWithPassword,
  findPlatformUserById,
  findValidOtpRecord,
  getUserForOtpRequest,
  normalizeAuthEmail,
  recordPlatformUserLogin,
  toAuthPublicUser,
  updatePlatformUserPassword,
  upsertOtpCode,
  verifyPlatformUserPassword,
} from '../../../server/data/platformAuth.ts';
import { findQuestionForProject } from '../../../server/lib/findProjectQuestion.ts';
import { findOpenAssignmentConflict, isOpenAssignmentRecord } from '../../../server/lib/openAssignmentConflict.ts';
import {
  createAssignment,
  deleteAssignmentsByIds,
  findAssignmentForProject,
  findAssignmentsByIds,
  findPlatformUserByExternalId,
  updateAssignment,
} from '../../../server/data/workflowDataAccess.ts';
import {
  getCustomerProjectsForPublicApi,
  getProjectSubmissionsByName,
  listCustomersForPublicApi,
} from '../../../server/data/customerApiDataAccess.ts';
import { TEST_JWT_SECRET, signTestToken } from './testJwt.ts';

export { TEST_JWT_SECRET, signTestToken };

/** Minutes before an OTP code expires (mirrors AUTH_OTP_CODE_EXPIRES_MINUTES in server.ts). */
const OTP_CODE_EXPIRES_MINUTES = 10;

/** Contact questionnaire response link JWT expiry (mirrors server.ts). */
const CONTACT_RESPONSE_TOKEN_EXPIRES_IN = '7d';

export type SendEmailFn = (
  to: string,
  subject: string,
  text: string,
) => Promise<void>;

const noopSendEmail: SendEmailFn = async () => {};

export type MakeSqlAppOptions = {
  sendEmail?: SendEmailFn;
  requireAuth?: boolean;
};

function jwtSecret() {
  return process.env.JWT_SECRET || TEST_JWT_SECRET;
}

function sendSuccess(res: express.Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res: express.Response, status: number, error: string, code?: string) {
  return res.status(status).json({ success: false, error, code });
}

function signAuthToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { uid: user.id, sub: user.id, email: user.email, role: user.role },
    jwtSecret(),
    { expiresIn: '1h' } as SignOptions,
  );
}

function toPublicUser(user: Record<string, unknown>) {
  return toAuthPublicUser(user as Parameters<typeof toAuthPublicUser>[0]);
}

async function getUserFromRequest(req: express.Request) {
  const resolved = await resolvePlatformUserFromRequest(req, jwtSecret());
  return resolved.user;
}

function platformApiKey(): string {
  return process.env.PLATFORM_API_KEY || 'test-platform-api-key';
}

function assertCustomerApiKey(req: express.Request, res: express.Response): boolean {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== platformApiKey()) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid API Key' });
    return false;
  }
  return true;
}

export function makeSqlApp(opts?: MakeSqlAppOptions) {
  const sendEmail = opts?.sendEmail ?? noopSendEmail;
  const app = express();
  app.use(express.json());

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 400, 'Email and password required', 'auth/missing-credentials');
    }
    try {
      const user = await findPlatformUserByEmailWithPassword(email);
      if (!user) {
        return sendError(res, 401, 'Invalid email or password', 'auth/user-not-found');
      }
      if (!verifyPlatformUserPassword(user, password)) {
        return sendError(res, 401, 'Invalid email or password', 'auth/wrong-password');
      }
      const refreshedUser = await recordPlatformUserLogin(user.id);
      const activeUser = refreshedUser || user;
      const publicUser = toPublicUser(activeUser);
      return sendSuccess(res, {
        token: signAuthToken({
          id: String(publicUser.id),
          email: String(publicUser.email),
          role: String(publicUser.role),
        }),
        user: {
          uid: publicUser.id,
          id: publicUser.id,
          email: publicUser.email,
          displayName: publicUser.name,
          emailVerified: true,
        },
        profile: publicUser,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return sendError(res, 500, message, 'auth/internal-error');
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return sendError(res, 401, 'Invalid or expired session', 'auth/invalid-token');
      }
      const publicUser = toPublicUser(user);
      return sendSuccess(res, {
        user: {
          uid: publicUser.id,
          id: publicUser.id,
          email: publicUser.email,
          displayName: publicUser.name,
          emailVerified: true,
        },
        profile: publicUser,
      });
    } catch {
      return sendError(res, 401, 'Invalid or expired session', 'auth/invalid-token');
    }
  });

  app.post('/api/auth/logout', (_req, res) => sendSuccess(res, { ok: true }));

  // -------------------------------------------------------------------------
  // Contact magic-link tokens (mirrors server.ts)
  // -------------------------------------------------------------------------
  app.post('/api/auth/validate-token', (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token required' });
    }
    try {
      const decoded = jwt.verify(token, jwtSecret());
      return res.json({ valid: true, decoded });
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      return res.status(401).json({
        valid: false,
        error:
          name === 'TokenExpiredError'
            ? 'Token has expired'
            : 'Invalid token signature',
      });
    }
  });

  app.post('/api/auth/generate-token', (req, res) => {
    const { projectId, contactId } = req.body;
    if (!projectId || !contactId) {
      return res.status(400).json({ error: 'Missing data' });
    }
    const token = jwt.sign({ projectId, contactId }, jwtSecret(), {
      expiresIn: CONTACT_RESPONSE_TOKEN_EXPIRES_IN,
    } as SignOptions);
    return res.json({ token });
  });

  // -------------------------------------------------------------------------
  // OTP login (mirrors server.ts)
  // -------------------------------------------------------------------------
  app.post('/api/auth/otp/request', async (req, res) => {
    const { email } = req.body;
    if (!email) return sendError(res, 400, 'Email required', 'auth/missing-email');

    try {
      const normalizedEmail = normalizeAuthEmail(email);
      const user = await getUserForOtpRequest(normalizedEmail);

      const genericSuccess = {
        message: 'If an account exists, a login code has been sent.',
      };

      if (!user) {
        // Enumeration protection: never reveal that the email is unknown.
        await deleteOtpForEmail(normalizedEmail);
        return sendSuccess(res, genericSuccess);
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + OTP_CODE_EXPIRES_MINUTES * 60_000);
      await upsertOtpCode(normalizedEmail, code, expiresAt);

      await sendEmail(
        normalizedEmail,
        `Your Login Code: ${code}`,
        `Your one-time login code is: ${code}`,
      );

      return sendSuccess(res, genericSuccess);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      return sendError(res, 500, message, 'auth/otp-request-failed');
    }
  });

  app.post('/api/auth/otp/verify', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return sendError(res, 400, 'Email and code required', 'auth/missing-otp');
    }

    try {
      const normalizedEmail = normalizeAuthEmail(email);
      const otpRecord = await findValidOtpRecord(normalizedEmail, code);
      if (!otpRecord) {
        return sendError(res, 400, 'Invalid or expired code', 'auth/invalid-otp');
      }

      const user = await findPlatformUserByEmail(normalizedEmail);
      if (!user) {
        await deleteOtpRecord(otpRecord.id);
        return sendError(res, 400, 'Invalid or expired code', 'auth/invalid-otp');
      }

      await deleteOtpRecord(otpRecord.id);
      const refreshedUser = await recordPlatformUserLogin(user.id);
      const activeUser = refreshedUser || user;
      const publicUser = toPublicUser(activeUser);

      return sendSuccess(res, {
        token: signAuthToken({
          id: String(publicUser.id),
          email: String(publicUser.email),
          role: String(publicUser.role),
        }),
        user: {
          uid: publicUser.id,
          id: publicUser.id,
          email: publicUser.email,
          displayName: publicUser.name,
          emailVerified: true,
        },
        profile: publicUser,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      return sendError(res, 500, message, 'auth/otp-verify-failed');
    }
  });

  // -------------------------------------------------------------------------
  // Password reset (mirrors server.ts)
  // -------------------------------------------------------------------------
  app.post('/api/auth/request-password-reset', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
      const normalizedEmail = normalizeAuthEmail(email);
      const user = await findPlatformUserByEmail(normalizedEmail);

      // Avoid account enumeration: identical response either way.
      if (user) {
        const resetToken = jwt.sign(
          { purpose: 'password-reset', sub: String(user.id), uid: String(user.id) },
          jwtSecret(),
          { expiresIn: '1h' } as SignOptions,
        );
        await sendEmail(
          normalizedEmail,
          'Password reset request',
          `Reset token: ${resetToken}`,
        );
      }

      return res.json({
        success: true,
        message: 'If an account exists, reset instructions have been sent.',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send reset instructions';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return sendError(
        res,
        400,
        'Token and new password are required',
        'auth/missing-reset-fields',
      );
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters', 'auth/weak-password');
    }

    try {
      let decoded: { purpose?: string; sub?: string };
      try {
        decoded = jwt.verify(token, jwtSecret()) as { purpose?: string; sub?: string };
      } catch (verifyErr: unknown) {
        const name = (verifyErr as { name?: string }).name;
        const msg =
          name === 'TokenExpiredError'
            ? 'This reset link has expired. Please request a new one.'
            : 'Invalid or expired reset link.';
        return sendError(res, 401, msg, 'auth/invalid-reset-token');
      }

      if (decoded.purpose !== 'password-reset' || !decoded.sub) {
        return sendError(res, 401, 'Invalid or expired reset link.', 'auth/invalid-reset-token');
      }

      const targetUser = await findPlatformUserById(String(decoded.sub));
      if (!targetUser) {
        return sendError(res, 404, 'User not found', 'auth/user-not-found');
      }

      await updatePlatformUserPassword(String(targetUser.id), newPassword);

      return sendSuccess(res, {
        message: 'Your password has been updated. You can sign in with your new password.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      return sendError(res, 500, message, 'auth/reset-password-failed');
    }
  });

  app.post('/api/projects/:projectId/quick-assignment', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { questionId, recipientId, recipientType } = req.body;
      if (!questionId || !recipientId || !recipientType) {
        return res.status(400).json({
          success: false,
          error: 'questionId, recipientId ve recipientType gereklidir',
        });
      }
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const decoded = jwt.verify(token, jwtSecret()) as { uid?: string };
      if (!decoded?.uid) return res.status(401).json({ success: false, error: 'Invalid token' });

      const questionFound = await findQuestionForProject(projectId, questionId);
      if (!questionFound) {
        return res.status(400).json({
          success: false,
          error: 'Bu proje için geçerli bir soru değil',
        });
      }

      const existingOpen = await findOpenAssignmentConflict({
        projectId,
        recipientId,
        questionIds: [questionId],
      });
      if (existingOpen) {
        return res.status(400).json({
          success: false,
          error: 'Bu kişi için bu soruda zaten açık bir atama var',
        });
      }

      const assignment = await createAssignment({
        projectId,
        recipientId,
        recipientType,
        questionIds: [questionId],
        beginDate: new Date(),
        status: 'pending',
        message: 'Açık atama (email gönderilmedi)',
        assignedBy: decoded.uid,
        assignedByName: 'Admin',
      });

      return res.json({ success: true, assignmentId: assignment.id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Atama oluşturulamadı';
      return res.status(500).json({ success: false, error: message });
    }
  });

  app.patch('/api/projects/:projectId/quick-assignment/:assignmentId', async (req, res) => {
    try {
      const { projectId, assignmentId } = req.params;
      const { recipientId, recipientType } = req.body;
      if (!recipientId || !recipientType) {
        return res.status(400).json({
          success: false,
          error: 'recipientId ve recipientType gereklidir',
        });
      }
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const decoded = jwt.verify(token, jwtSecret()) as { uid?: string };
      if (!decoded?.uid) return res.status(401).json({ success: false, error: 'Invalid token' });

      const assignment = await findAssignmentForProject(projectId, assignmentId);
      if (!assignment) {
        return res.status(404).json({ success: false, error: 'Atama bulunamadı' });
      }
      if (!isOpenAssignmentRecord(assignment)) {
        return res.status(400).json({
          success: false,
          error: 'Sadece açık atamalar güncellenebilir',
        });
      }

      const questionIds = Array.isArray(assignment.questionIds)
        ? (assignment.questionIds as string[])
        : [];
      const duplicateOpen = await findOpenAssignmentConflict({
        projectId,
        recipientId,
        questionIds,
        excludeAssignmentId: assignmentId,
      });
      if (duplicateOpen) {
        return res.status(400).json({
          success: false,
          error: 'Bu kişi için bu sorularda zaten açık bir atama var',
        });
      }

      await updateAssignment(assignmentId, { recipientId, recipientType });
      return res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Atama güncellenemedi';
      return res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/projects/:projectId/merge-assignments', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { assignmentIds, beginDate, deadline, message } = req.body;
      if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
        return res.status(400).json({ success: false, error: 'assignmentIds gereklidir' });
      }
      if (!beginDate || !deadline) {
        return res.status(400).json({ success: false, error: 'beginDate ve deadline gereklidir' });
      }
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const decoded = jwt.verify(token, jwtSecret()) as { uid?: string };
      if (!decoded?.uid) return res.status(401).json({ success: false, error: 'Invalid token' });

      const assignmentDocs = await findAssignmentsByIds(assignmentIds);
      const allQuestionIds: string[] = [];
      let recipientId = '';
      let recipientType: 'contact' | 'user' = 'contact';

      assignmentDocs.forEach((doc) => {
        const ids = Array.isArray(doc.questionIds) ? (doc.questionIds as string[]) : [];
        allQuestionIds.push(...ids);
        if (!recipientId) {
          recipientId = String(doc.recipientId || '');
          recipientType = (doc.recipientType as 'contact' | 'user') || 'contact';
        }
      });

      const newAssignment = await createAssignment({
        projectId,
        recipientId,
        recipientType,
        questionIds: [...new Set(allQuestionIds)],
        beginDate: new Date(beginDate),
        deadline: new Date(deadline),
        sentAt: new Date(),
        status: 'pending',
        message: message || 'Birleştirilmiş atama',
        assignedBy: decoded.uid,
        assignedByName: 'Admin',
      });

      await deleteAssignmentsByIds(assignmentIds);

      const mergeActor = decoded?.uid
        ? await findPlatformUserByExternalId(String(decoded.uid))
        : null;

      return res.json({
        success: true,
        message: 'Atamalar birleştirildi',
        assignmentId: String(newAssignment.id),
        emailSent: false,
        mergeActorId: mergeActor?.id ?? null,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Atamalar birleştirilemedi';
      return res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/v1/customer/customers', async (req, res) => {
    if (!assertCustomerApiKey(req, res)) return;
    try {
      const customers = await listCustomersForPublicApi();
      res.json({ success: true, count: customers.length, customers });
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/v1/customer/projects', async (req, res) => {
    if (!assertCustomerApiKey(req, res)) return;
    const { customerId } = req.query;
    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      return res.status(400).json({ error: 'Missing customerId query parameter' });
    }
    try {
      const result = await getCustomerProjectsForPublicApi(String(customerId).trim());
      if (!result) return res.status(404).json({ error: 'Customer not found' });
      res.json({
        success: true,
        customer: result.customer,
        projectCount: result.projects.length,
        projects: result.projects,
      });
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/v1/customer/project-data', async (req, res) => {
    if (!assertCustomerApiKey(req, res)) return;
    const { projectName } = req.query;
    if (!projectName) {
      return res.status(400).json({ error: 'Missing projectName query parameter' });
    }
    try {
      const result = await getProjectSubmissionsByName(String(projectName));
      if (!result) return res.status(404).json({ error: 'Project not found' });
      res.json({
        success: true,
        project: result.project,
        dataCount: result.submissions.length,
        submissions: result.submissions,
      });
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  registerMongoApiRoutes(app, {
    jwtSecret: jwtSecret(),
    requireAuth: opts?.requireAuth ?? false,
  });
  registerMaterialitySurveyRoutes(app, { jwtSecret: jwtSecret() });
  registerOnBehalfResponseRoutes(app, { jwtSecret: jwtSecret() });
  registerLlmSettingsRoutes(app, { jwtSecret: jwtSecret() });
  return app;
}
