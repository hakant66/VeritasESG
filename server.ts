import express from 'express';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import jwt, { type SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import multer from 'multer';
import { registerMongoApiRoutes } from './server/routes/mongoApi.ts';
import { registerEmissionsRoutes } from './server/routes/emissionsRoute.ts';
import { registerMaterialityRoutes } from './server/routes/materialityRoute.ts';
import { registerMaterialitySurveyRoutes } from './server/routes/materialitySurveyRoute.ts';
import { registerGRIMaterialityRoutes } from './server/routes/griMaterialityRoute.ts';
import { registerGRIAssessmentRoutes } from './server/routes/griAssessmentRoute.ts';
import { registerESRSAssessmentRoutes } from './server/routes/esrsAssessmentRoute.ts';
import { registerISSBAssessmentRoutes } from './server/routes/issbAssessmentRoute.ts';
import { registerKbRagRoutes } from './server/routes/kbRagRoute.ts';
import { registerLlmSettingsRoutes } from './server/routes/llmSettingsRoute.ts';
import { registerDemoSeedRoutes } from './server/routes/demoSeedRoute.ts';
import { registerSchedulerRoutes } from './server/routes/schedulerRoute.ts';
import { startKbIngestWorker } from './server/lib/rag/kbIngestQueue.ts';
import { initScheduler } from './server/lib/schedulerService.ts';
import { startAssignmentDeadlineReminders } from './server/lib/assignmentReminderService.ts';
import { startSurveyReminders } from './server/lib/materialitySurveyReminderService.ts';
import complianceRoute from './server/routes/complianceRoute.ts';
import climateRoute from './server/routes/climateRoute.ts';
import { seedEmissionFactorsIfEmpty, seedMetricDefinitionsIfEmpty, correctLegacyEmissionFactors } from './server/lib/emissionFactorSeed.ts';
import { seedFrameworkRequirements } from './server/lib/frameworkRequirementSeed.ts';
import { seedFrameworkMappings } from './server/lib/frameworkMappingSeed.ts';
import { seedGFANZPathways } from './server/lib/climatePathwaySeed.ts';
import { seedTransitionLevers } from './server/lib/transitionLeverSeed.ts';
import { seedSectorClassificationCatalog } from './server/lib/sectorClassificationSeed.ts';
import { registerOnBehalfResponseRoutes } from './server/routes/onBehalfResponse.ts';
import { registerAssignmentManageRoutes } from './server/routes/assignmentManage.ts';
import { registerAuditReviewRoutes } from './server/routes/auditReview.ts';
import { registerResendWebhookRoutes } from './server/routes/resendWebhook.ts';
import {
  getS3ConfigOrThrow,
  isS3UploadConfigured,
  putObjectBuffer,
} from './server/lib/s3Storage.ts';
import { findQuestionForProject } from './server/lib/findProjectQuestion.ts';
import { findOpenAssignmentConflict, isOpenAssignmentRecord } from './server/lib/openAssignmentConflict.ts';
import {
  createAssignment,
  deleteAssignmentsByIds,
  findAssignmentForProject,
  findAssignmentsByIds,
  findPlatformUserByExternalId,
  updateAssignment,
} from './server/data/workflowDataAccess.ts';
import { registerStorageProxyRoutes } from './server/lib/storageProxy.ts';
import { resolvePlatformUserFromRequest } from './server/lib/requestAuth.ts';
import {
  deleteOtpForEmail,
  deleteOtpRecord,
  findPlatformUserByEmail,
  findPlatformUserByEmailWithPassword,
  findPlatformUserById,
  findValidOtpRecord,
  getUserForOtpRequest,
  recordPlatformUserLogin,
  toAuthPublicUser,
  updatePlatformUserPassword,
  upsertOtpCode,
  verifyPlatformUserPassword,
} from './server/data/platformAuth.ts';
import { checkSqlConnection } from './server/data/prismaClient.ts';
import {
  analyzeContactEmailConflicts,
  migrateContactEmailConflicts,
} from './server/data/adminOpsDataAccess.ts';
import {
  getCustomerProjectsForPublicApi,
  getProjectSubmissionsByName,
  listCustomersForPublicApi,
} from './server/data/customerApiDataAccess.ts';
import { detectBackupEngine, getDefaultBackupCommand } from './server/lib/backupCommand.ts';
import { startOtpCleanup } from './server/lib/otpCleanup.ts';
import { sendResendEmail } from './server/lib/resendEmail.ts';
import {
  sendAssignmentEmailPayload,
  sendAssignmentNotificationEmail,
} from './server/lib/assignmentNotificationEmail.ts';

dotenv.config();

// Normalize NODE_ENV casing so hosts that set e.g. "PRODUCTION" still trigger
// the production code paths (static dist serving, secret enforcement).
if (process.env.NODE_ENV) {
  process.env.NODE_ENV = process.env.NODE_ENV.trim().toLowerCase();
}

// Keep the process alive on transient async failures (e.g. a dropped DB
// connection surfacing as a Prisma error inside a route handler). Without these
// handlers Node terminates on an unhandled rejection, turning a momentary DB
// blip into a full outage (503) until the host restarts the app.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  console.warn('\n[SECURITY WARNING] JWT_SECRET is not set. Using an insecure fallback.\nSet JWT_SECRET in your .env file before deploying to production.\n');
}
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';
/** Platform user JWT (login / OTP verify). Examples: `1d`, `12h`, `3600` (seconds). */
const AUTH_TOKEN_EXPIRES_IN = process.env.AUTH_TOKEN_EXPIRES_IN || '1d';
/** Contact questionnaire response link JWT (`/api/auth/generate-token`). */
const CONTACT_RESPONSE_TOKEN_EXPIRES_IN =
  process.env.CONTACT_RESPONSE_TOKEN_EXPIRES_IN || '7d';
/** Email OTP code validity window (minutes), clamped 1–1440. */
const AUTH_OTP_CODE_EXPIRES_MINUTES = Math.min(
  1440,
  Math.max(1, parseInt(process.env.AUTH_OTP_CODE_EXPIRES_MINUTES || '10', 10) || 10),
);
const MASTER_ADMIN_EMAILS = ['20038437@student.stcg.ac.uk', 'dagdelen.uk@gmail.com', 'dagdelen@gmail.com'];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3010);
const PASSWORD_RESET_EXPIRES_IN = process.env.PASSWORD_RESET_EXPIRES_IN || '1h';

/** Map known staging / partner hostnames to the canonical app URL used in password-reset emails. */
const PASSWORD_RESET_ORIGIN_ALIASES: Record<string, string> = {
  'https://giq.g2m.partners': 'https://giq.impact-ai.co.uk',
};

function getRequestOriginFromHeaders(req: express.Request): string | null {
  const raw = req.headers.origin;
  if (typeof raw === 'string' && raw.trim()) return normalizeCorsOrigin(raw);
  const ref = req.headers.referer;
  if (typeof ref === 'string' && ref.trim()) {
    try {
      return normalizeCorsOrigin(new URL(ref).origin);
    } catch {
      return null;
    }
  }
  return null;
}

function resolvePasswordResetBaseUrl(req: express.Request): string {
  const dedicated = normalizeCorsOrigin(process.env.PASSWORD_RESET_PUBLIC_URL || '');
  if (dedicated) return dedicated;

  const allowed = buildCorsAllowedOriginSet(PORT);

  const mapOrAllow = (candidate: string | null | undefined): string | null => {
    if (!candidate) return null;
    const n = normalizeCorsOrigin(candidate);
    const mapped = PASSWORD_RESET_ORIGIN_ALIASES[n];
    if (mapped) return normalizeCorsOrigin(mapped);
    if (allowed.has(n)) return n;
    return null;
  };

  const fromBody =
    typeof req.body?.clientOrigin === 'string' ? mapOrAllow(req.body.clientOrigin) : null;
  if (fromBody) return fromBody;

  const fromHeaders = mapOrAllow(getRequestOriginFromHeaders(req));
  if (fromHeaders) return fromHeaders;

  const fromApp = normalizeCorsOrigin(process.env.APP_PUBLIC_URL || '');
  if (fromApp) return fromApp;
  return `http://localhost:${PORT}`;
}

function humanizeJwtExpires(expiresIn: string) {
  const m = /^(\d+)([hdms])$/i.exec(expiresIn.trim());
  if (!m) return expiresIn;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  if (u === 'h') return n === 1 ? '1 hour' : `${n} hours`;
  if (u === 'd') return n === 1 ? '1 day' : `${n} days`;
  if (u === 'm') return n === 1 ? '1 minute' : `${n} minutes`;
  if (u === 's') return n === 1 ? '1 second' : `${n} seconds`;
  return expiresIn;
}

function normalizeCorsOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '');
}

function buildCorsAllowedOriginSet(port: number) {
  const fromEnv = (process.env.CORS_ALLOWED_ORIGINS || process.env.DOMAIN_WHITELIST || '')
    .split(',')
    .map((s) => normalizeCorsOrigin(s))
    .filter(Boolean);
  const defaults = [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    'https://giq.impact-ai.co.uk',
    'https://giq.g2m.partners',
  ];
  return new Set([...defaults, ...fromEnv].map(normalizeCorsOrigin));
}

function createCorsMiddleware(allowedOrigins: Set<string>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawOrigin = req.headers.origin;
    const origin = typeof rawOrigin === 'string' ? normalizeCorsOrigin(rawOrigin) : '';

    if (req.method === 'OPTIONS') {
      if (!origin || !allowedOrigins.has(origin)) {
        return res.status(403).end();
      }
      res.setHeader('Access-Control-Allow-Origin', rawOrigin.trim());
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      const reqHdr = req.headers['access-control-request-headers'];
      res.setHeader(
        'Access-Control-Allow-Headers',
        typeof reqHdr === 'string' ? reqHdr : 'Content-Type, Authorization, X-Requested-With',
      );
      res.setHeader('Access-Control-Max-Age', '86400');
      res.append('Vary', 'Origin');
      return res.status(204).end();
    }

    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', rawOrigin.trim());
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.append('Vary', 'Origin');
    }

    next();
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toPublicUser(user: any) {
  return toAuthPublicUser(user);
}

function signAuthToken(user: any) {
  const publicUser = toPublicUser(user);

  return jwt.sign(
    {
      uid: publicUser.id,
      sub: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
    },
    JWT_SECRET as string,
    { expiresIn: AUTH_TOKEN_EXPIRES_IN } as SignOptions,
  );
}

function sendSuccess(res: express.Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res: express.Response, status: number, error: string, code?: string) {
  return res.status(status).json({ success: false, error, code });
}

function getBearerToken(req: express.Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;

  return header.slice('Bearer '.length);
}

async function getUserFromRequest(req: express.Request) {
  const resolved = await resolvePlatformUserFromRequest(req, JWT_SECRET);
  return resolved.user;
}

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PROFILE_INLINE_BYTES = 350 * 1024;
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROFILE_IMAGE_BYTES },
});
const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EVIDENCE_BYTES },
});

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '-').replace(/-+/g, '-').slice(-120);
}

function getExtensionFromMime(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  return 'webp';
}

function buildInlineProfileImageDataUrl(file: Express.Multer.File): string | null {
  if (!file.buffer || file.size <= 0 || file.size > MAX_PROFILE_INLINE_BYTES) return null;
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

function runProfileUpload(req: express.Request, res: express.Response): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function runEvidenceUpload(req: express.Request, res: express.Response): Promise<void> {
  return new Promise((resolve, reject) => {
    evidenceUpload.single('file')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper to create transport from settings (Keep for other providers)
function createTransport(settings: any) {
  if (settings.provider === 'smtp') {
    return nodemailer.createTransport({
      host: settings.smtpHost,
      port: parseInt(settings.smtpPort),
      secure: settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });
  } else if (settings.provider === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: settings.apiKey,
      },
    });
  } else if (settings.provider === 'postmark') {
    return nodemailer.createTransport({
      host: 'smtp.postmarkapp.com',
      port: 587,
      auth: {
        user: settings.apiKey,
        pass: settings.apiKey,
      },
    });
  }
  // Fallback or other providers would go here
  return null;
}

function runBootSeeds() {
  void correctLegacyEmissionFactors().catch((err) =>
    console.error('[MIGRATION] emission factor corrections:', err),
  );
  void seedEmissionFactorsIfEmpty().catch((err) =>
    console.error('[SEED] emission factors:', err),
  );
  void seedMetricDefinitionsIfEmpty().catch((err) =>
    console.error('[Seed] MetricDefinitions failed:', err?.message),
  );
  void seedFrameworkRequirements().catch((err) =>
    console.error('[SEED] framework requirements:', err),
  );
  void seedFrameworkMappings().catch((err) =>
    console.error('[SEED] framework mappings:', err),
  );
  void seedGFANZPathways().catch((err) =>
    console.error('[SEED] GFANZ pathways:', err),
  );
  void seedTransitionLevers().catch((err) =>
    console.error('[SEED] transition levers:', err),
  );
  void seedSectorClassificationCatalog().catch((err) =>
    console.error('[SEED] sector classification catalog:', err),
  );
}

async function bootstrapPersistence() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('[SQL] DATABASE_URL is required');
  }
  const sqlReady = await checkSqlConnection();
  if (!sqlReady) {
    throw new Error('[SQL] Could not connect to DATABASE_URL');
  }
  console.log('[SQL] Prisma core ready');
  runBootSeeds();
}

async function startServer() {
  try {
    try {
      await bootstrapPersistence();
    } catch (bootErr: any) {
      console.error('[SQL] Initial persistence bootstrap failed:', bootErr.message);
    }
    const app = express();
    const corsAllowedOrigins = buildCorsAllowedOriginSet(PORT);
    app.use(helmet({
      // Allow inline scripts/styles for the Vite-bundled React SPA
      contentSecurityPolicy: false,
      // crossOriginEmbedderPolicy breaks Vite in dev; disable until CSP is tuned
      crossOriginEmbedderPolicy: false,
    }));
    app.use(createCorsMiddleware(corsAllowedOrigins));
    registerResendWebhookRoutes(app);
    app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '32mb' }));

    // Health check for Cloud Run
    app.get('/api/health', async (_req, res) => {
      const sqlReady = await checkSqlConnection();

      res.json({
        status: sqlReady ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        dbDriver: 'sql',
        sqlReady,
      });
    });

  // API Routes
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
      const token = signAuthToken(activeUser);
      const publicUser = toPublicUser(activeUser);

      return sendSuccess(res, {
        token,
        user: {
          uid: publicUser.id,
          id: publicUser.id,
          email: publicUser.email,
          displayName: publicUser.name,
          emailVerified: true,
        },
        profile: publicUser,
      });
    } catch (err: any) {
      console.error('[AUTH LOGIN ERROR]', err);
      return sendError(res, 500, err.message || 'Login failed', 'auth/internal-error');
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
    } catch (err: any) {
      console.error('[AUTH ME ERROR]', err);
      return sendError(res, 401, 'Invalid or expired session', 'auth/invalid-token');
    }
  });

  app.post('/api/uploads/profile-image', async (req, res) => {
    try {
      await runProfileUpload(req, res);

      const user = await getUserFromRequest(req);
      if (!user) {
        return sendError(res, 401, 'Invalid or expired session', 'auth/invalid-token');
      }

      const file = req.file;
      if (!file) {
        return sendError(res, 400, 'File is required', 'upload/missing-file');
      }
      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        return sendError(res, 400, 'Only JPG, PNG, and WEBP are supported', 'upload/invalid-file-type');
      }
      if (!file.buffer || file.size <= 0) {
        return sendError(res, 400, 'Uploaded file is empty', 'upload/empty-file');
      }

      const inlineDataUrl = buildInlineProfileImageDataUrl(file);

      if (!isS3UploadConfigured()) {
        if (!inlineDataUrl) {
          return sendError(
            res,
            400,
            'Object storage (S3) is not configured. Use an image under 350KB, or set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY for larger files.',
            'upload/s3-not-configured',
          );
        }
        return sendSuccess(res, {
          url: inlineDataUrl,
          key: null,
          inline: true,
        });
      }

      const s3Config = getS3ConfigOrThrow();
      const safeName = sanitizeFilename(file.originalname || `avatar.${getExtensionFromMime(file.mimetype)}`);
      const timestamp = Date.now();
      const objectKey = `avatars/${user.id}/${timestamp}-${safeName}`;

      try {
        const url = await putObjectBuffer({
          config: s3Config,
          objectKey,
          body: file.buffer,
          contentType: file.mimetype,
          cacheControl: 'public, max-age=31536000, immutable',
        });

        return sendSuccess(res, {
          url,
          key: objectKey,
        });
      } catch (s3Err: any) {
        if (inlineDataUrl) {
          console.warn(
            '[PROFILE IMAGE UPLOAD] S3 upload failed; storing inline image instead:',
            s3Err?.message || s3Err,
          );
          return sendSuccess(res, {
            url: inlineDataUrl,
            key: null,
            inline: true,
            s3Fallback: true,
          });
        }
        throw s3Err;
      }
    } catch (err: any) {
      if (err?.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 400, 'Image exceeds 5MB limit', 'upload/file-too-large');
      }
      console.error('[PROFILE IMAGE UPLOAD ERROR]', err);
      return sendError(res, 500, err.message || 'Profile image upload failed', 'upload/failed');
    }
  });

  app.post('/api/uploads/evidence', async (req, res) => {
    try {
      await runEvidenceUpload(req, res);

      // Validate contact JWT from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return sendError(res, 401, 'Contact token required', 'auth/missing-token');
      }
      let contactPayload: { projectId: string; contactId: string };
      try {
        const decoded = jwt.verify(authHeader.slice('Bearer '.length), JWT_SECRET) as any;
        if (!decoded.projectId || !decoded.contactId) {
          return sendError(res, 401, 'Invalid contact token', 'auth/invalid-token');
        }
        contactPayload = decoded;
      } catch {
        return sendError(res, 401, 'Invalid or expired contact token', 'auth/invalid-token');
      }

      const file = req.file;
      if (!file) return sendError(res, 400, 'File is required', 'upload/missing-file');
      if (!file.buffer || file.size <= 0) return sendError(res, 400, 'Uploaded file is empty', 'upload/empty-file');

      if (!isS3UploadConfigured()) {
        const maxInline = 2 * 1024 * 1024;
        if (file.size > maxInline) {
          return sendError(
            res, 400,
            'Object storage (S3) is not configured. Maximum file size without S3 is 2MB.',
            'upload/s3-not-configured',
          );
        }
        const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        return sendSuccess(res, { url: dataUrl, key: null, inline: true, filename: file.originalname });
      }

      const s3Config = getS3ConfigOrThrow();
      const safeName = sanitizeFilename(file.originalname || 'evidence-file');
      const objectKey = `evidence/${contactPayload.projectId}/${contactPayload.contactId}/${Date.now()}-${safeName}`;

      const url = await putObjectBuffer({
        config: s3Config,
        objectKey,
        body: file.buffer,
        contentType: file.mimetype,
        cacheControl: 'private, max-age=31536000',
      });

      return sendSuccess(res, { url, key: objectKey, inline: false, filename: file.originalname });
    } catch (err: any) {
      if (err?.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 400, 'File exceeds 10MB limit', 'upload/file-too-large');
      }
      console.error('[EVIDENCE UPLOAD ERROR]', err);
      return sendError(res, 500, err.message || 'Evidence upload failed', 'upload/failed');
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    return sendSuccess(res, { ok: true });
  });

  // Quick Assignment endpoint (MUST be before registerMongoApiRoutes)
  app.post('/api/projects/:projectId/quick-assignment', async (req, res) => {
    console.log('[QUICK ASSIGNMENT] Request received:', {
      projectId: req.params.projectId,
      body: req.body,
      hasAuth: !!req.headers.authorization,
    });

    try {
      const { projectId } = req.params;
      const { questionId, recipientId, recipientType } = req.body;

      console.log('[QUICK ASSIGNMENT] Parsed data:', { projectId, questionId, recipientId, recipientType });

      if (!questionId || !recipientId || !recipientType) {
        console.log('[QUICK ASSIGNMENT] Missing required fields');
        return res.status(400).json({ 
          success: false, 
          error: 'questionId, recipientId ve recipientType gereklidir' 
        });
      }

      // Auth check
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        console.log('[QUICK ASSIGNMENT] No token provided');
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { uid?: string };
      if (!decoded?.uid) {
        console.log('[QUICK ASSIGNMENT] Invalid token');
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }

      console.log('[QUICK ASSIGNMENT] Auth successful, user:', decoded.uid);

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
        console.log('[QUICK ASSIGNMENT] Open assignment already exists');
        return res.status(400).json({
          success: false,
          error: 'Bu kişi için bu soruda zaten açık bir atama var',
        });
      }

      // Create quick assignment (no deadline, no email)
      console.log('[QUICK ASSIGNMENT] Creating assignment...');
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

      console.log(`[QUICK ASSIGNMENT] ✓ Created successfully:`, assignment.id);
      
      return res.json({ 
        success: true, 
        assignmentId: assignment.id,
      });
    } catch (error: any) {
      console.error('[QUICK ASSIGNMENT ERROR] Full error:', error);
      console.error('[QUICK ASSIGNMENT ERROR] Stack:', error.stack);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Atama oluşturulamadı' 
      });
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
      if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { uid?: string };
      if (!decoded?.uid) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }

      const assignment = await findAssignmentForProject(projectId, assignmentId);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Atama bulunamadı',
        });
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
    } catch (error: any) {
      console.error('[QUICK ASSIGNMENT UPDATE ERROR]', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Atama güncellenemedi',
      });
    }
  });

  // Merge Assignments endpoint (MUST be before registerMongoApiRoutes)
  app.post('/api/projects/:projectId/merge-assignments', async (req, res) => {
    try {
      const { projectId } = req.params;
      // Always merges into one new assignment. Optional `mode` from older clients is ignored.
      const { assignmentIds, beginDate, deadline, message, urgency, approverId, approverType, email: emailBody } = req.body;

      if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'assignmentIds gereklidir' 
        });
      }

      if (!beginDate || !deadline) {
        return res.status(400).json({ 
          success: false, 
          error: 'beginDate ve deadline gereklidir' 
        });
      }

      // Auth check
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { uid?: string };
      if (!decoded?.uid) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
      
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

      const uniqueQuestionIds = [...new Set(allQuestionIds)];

      const newAssignment = await createAssignment({
        projectId,
        recipientId,
        recipientType,
        questionIds: uniqueQuestionIds,
        beginDate: new Date(beginDate),
        deadline: new Date(deadline),
        urgency: String(urgency || '').toLowerCase() === 'urgent' ? 'urgent' : 'normal',
        ...(approverId
          ? {
              approverId: String(approverId),
              approverType:
                String(approverType || '').toLowerCase() === 'contact' ? 'contact' : 'user',
            }
          : {}),
        sentAt: new Date(),
        status: 'pending',
        message: message || 'Birleştirilmiş atama',
        assignedBy: decoded.uid,
        assignedByName: 'Admin',
      });

      await deleteAssignmentsByIds(assignmentIds);

      console.log(`[MERGE ASSIGNMENTS] Created new merged assignment for ${recipientId}`);

      let emailSent = false;
      let emailError: string | undefined;
      const newAssignmentId = String(newAssignment.id);

      const mergeActor = decoded?.uid
        ? await findPlatformUserByExternalId(String(decoded.uid))
        : null;
      const mergeTriggeredBy = mergeActor
        ? {
            userId: String(mergeActor.id || decoded.uid || ''),
            userName: String(mergeActor.name || 'User'),
            userEmail: String(mergeActor.email || ''),
          }
        : undefined;

      if (
        emailBody &&
        typeof emailBody === 'object' &&
        typeof emailBody.subject === 'string' &&
        (typeof emailBody.text === 'string' || typeof emailBody.html === 'string')
      ) {
        try {
          await sendAssignmentEmailPayload({
            email: String(emailBody.email || '').trim(),
            name: String(emailBody.name || '').trim(),
            subject: String(emailBody.subject).trim(),
            text: String(emailBody.text || '').trim(),
            html: String(emailBody.html || emailBody.text || '').trim(),
            cc: Array.isArray(emailBody.cc) ? emailBody.cc : undefined,
            projectId,
            assignmentId: newAssignmentId,
            triggeredBy: mergeTriggeredBy,
          });
          emailSent = true;
        } catch (err: unknown) {
          emailError =
            err instanceof Error ? err.message : 'E-posta gönderilemedi';
          console.error('[MERGE ASSIGNMENTS EMAIL ERROR]', err);
        }
      } else {
        try {
          await sendAssignmentNotificationEmail(projectId, newAssignmentId, {
            triggeredBy: mergeTriggeredBy,
          });
          emailSent = true;
        } catch (err: unknown) {
          emailError =
            err instanceof Error ? err.message : 'E-posta gönderilemedi';
          console.error('[MERGE ASSIGNMENTS EMAIL ERROR]', err);
        }
      }

      return res.json({
        success: true,
        message: emailSent
          ? 'Atamalar birleştirildi ve e-posta gönderildi'
          : 'Atamalar birleştirildi; e-posta gönderilemedi',
        assignmentId: newAssignmentId,
        emailSent,
        emailError,
      });
    } catch (error: any) {
      console.error('[MERGE ASSIGNMENTS ERROR]', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Atamalar birleştirilemedi' 
      });
    }
  });

  // Analyze contact-user email conflicts
  app.get('/api/admin/analyze-contact-conflicts', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { uid?: string };
      if (!decoded?.uid) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const conflicts = await analyzeContactEmailConflicts();

      console.log(`[CONFLICT ANALYSIS] Found ${conflicts.length} conflicts`);
      return res.json({
        success: true,
        conflicts,
        count: conflicts.length,
      });
    } catch (error: any) {
      console.error('[CONFLICT ANALYSIS ERROR]', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Migrate conflicting contacts to users
  app.post('/api/admin/migrate-contact-conflicts', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { uid?: string };
      if (!decoded?.uid) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const results = await migrateContactEmailConflicts();

      console.log('[MIGRATION] Results:', results);
      return res.json({
        success: true,
        results,
      });
    } catch (error: any) {
      console.error('[MIGRATION ERROR]', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  registerAssignmentManageRoutes(app, { jwtSecret: JWT_SECRET });
  registerAuditReviewRoutes(app, { jwtSecret: JWT_SECRET });

  registerMongoApiRoutes(app, { jwtSecret: JWT_SECRET, requireAuth: true });
  registerEmissionsRoutes(app, { jwtSecret: JWT_SECRET });
  registerMaterialityRoutes(app, { jwtSecret: JWT_SECRET });
  registerMaterialitySurveyRoutes(app, { jwtSecret: JWT_SECRET });
  registerGRIMaterialityRoutes(app, { jwtSecret: JWT_SECRET });
  registerGRIAssessmentRoutes(app, { jwtSecret: JWT_SECRET });
  registerESRSAssessmentRoutes(app, { jwtSecret: JWT_SECRET });
  registerISSBAssessmentRoutes(app, { jwtSecret: JWT_SECRET });
  registerKbRagRoutes(app, { jwtSecret: JWT_SECRET });
  registerLlmSettingsRoutes(app, { jwtSecret: JWT_SECRET });
  registerDemoSeedRoutes(app, { jwtSecret: JWT_SECRET });
  registerSchedulerRoutes(app, { jwtSecret: JWT_SECRET });
  startKbIngestWorker();
  registerOnBehalfResponseRoutes(app, { jwtSecret: JWT_SECRET });
  app.use('/api/compliance', complianceRoute);
  app.use('/api/climate', climateRoute);

  await initScheduler();
  startOtpCleanup();
  startAssignmentDeadlineReminders();
  startSurveyReminders();
  console.log(
    `[BACKUP] Default ${detectBackupEngine()} backup command: ${getDefaultBackupCommand()}`,
  );
  console.log('[AUTH] Platform auth using SQL (Prisma) for login, OTP, and session resolution');

  app.post('/api/auth/validate-token', (req, res) => {
    const { token } = req.body;
    console.log(`[AUTH] Validating token: ${token?.substring(0, 20)}...`);
    
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log(`[AUTH] Token valid for Project: ${decoded.projectId}`);
      res.json({ valid: true, decoded });
    } catch (err: any) {
      console.error(`[AUTH] Token validation failed: ${err.message}`);
      res.status(401).json({ 
        valid: false, 
        error: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token signature' 
      });
    }
  });

  app.post('/api/auth/generate-token', (req, res) => {
    const { projectId, contactId } = req.body;
    if (!projectId || !contactId) return res.status(400).json({ error: 'Missing data' });

    const token = jwt.sign(
      { projectId, contactId },
      JWT_SECRET as string,
      { expiresIn: CONTACT_RESPONSE_TOKEN_EXPIRES_IN } as SignOptions,
    );
    console.log(`[AUTH] Generated new token for contact ${contactId}`);
    res.json({ token });
  });

  app.post('/api/auth/request-password-reset', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
      const normalizedEmail = normalizeEmail(email);
      const user = await findPlatformUserByEmail(normalizedEmail);

      // Avoid account enumeration. Send the same response whether the user exists or not.
      if (user) {
        const resetToken = jwt.sign(
          { purpose: 'password-reset', sub: String(user.id), uid: String(user.id) },
          JWT_SECRET,
          { expiresIn: PASSWORD_RESET_EXPIRES_IN } as SignOptions,
        );
        const baseUrl = resolvePasswordResetBaseUrl(req);
        const resetUrl = `${baseUrl}/#/reset-password?token=${encodeURIComponent(resetToken)}`;
        const expiryPhrase = humanizeJwtExpires(PASSWORD_RESET_EXPIRES_IN);
        const htmlContent = `
        <div style="font-family: sans-serif; color: #334155; line-height: 1.6; max-width: 600px;">
          <p>Hello,</p>
          <p>We received a password reset request for your Impact AI Governance account.</p>
          <p>Click the button below to choose a new password. This link expires in <strong>${expiryPhrase}</strong>.</p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Set a new password</a>
          </div>
          <p style="font-size: 13px; color: #64748b;">If the button does not work, copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #0f172a; word-break: break-all;">${resetUrl}</a></p>
          <p>If you did not request this, you can ignore this email.</p>
          <p>Thanks,<br/>The Impact AI Governance team</p>
        </div>
      `;
        await sendResendEmail({
          to: normalizedEmail,
          name: (user.name as string) || normalizedEmail.split('@')[0],
          subject: 'Password reset request for Impact AI Governance',
          text: `Hello,\n\nWe received a password reset request for your Impact AI Governance account.\n\nUse this link to set a new password (expires in ${expiryPhrase}):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.\n\nThanks,\n\nThe Impact AI Governance team`,
          html: htmlContent,
          audit: {
            emailType: 'password_reset',
            recordId: String(user.id || ''),
            triggeredBy: {
              userId: String(user.id || ''),
              userName: String(user.name || 'User'),
              userEmail: normalizedEmail,
            },
          },
        });
      }

      return res.json({ success: true, message: 'If an account exists, reset instructions have been sent.' });
    } catch (err: any) {
      console.error('[AUTH RESET ERROR]', err);
      res.status(500).json({ error: err.message || 'Failed to send reset instructions' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return sendError(res, 400, 'Token and new password are required', 'auth/missing-reset-fields');
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters', 'auth/weak-password');
    }

    try {
      let decoded: { purpose?: string; sub?: string };
      try {
        decoded = jwt.verify(token, JWT_SECRET) as { purpose?: string; sub?: string };
      } catch (verifyErr: any) {
        const msg =
          verifyErr?.name === 'TokenExpiredError'
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

      await updatePlatformUserPassword(targetUser.id, newPassword);

      return sendSuccess(res, { message: 'Your password has been updated. You can sign in with your new password.' });
    } catch (err: any) {
      console.error('[AUTH RESET PASSWORD ERROR]', err);
      return sendError(res, 500, err.message || 'Failed to reset password', 'auth/reset-password-failed');
    }
  });

  app.post('/api/auth/otp/request', async (req, res) => {
    const { email } = req.body;
    if (!email) return sendError(res, 400, 'Email required', 'auth/missing-email');

    try {
      const normalizedEmail = normalizeEmail(email);
      const user = await getUserForOtpRequest(normalizedEmail);

      if (!user) {
        await deleteOtpForEmail(normalizedEmail);
        console.log(`[OTP] Ignored request for unknown email ${normalizedEmail}`);
        return sendSuccess(res, { message: 'If an account exists, a login code has been sent.' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(
        Date.now() + AUTH_OTP_CODE_EXPIRES_MINUTES * 60_000,
      );

      console.log(`[OTP] Requesting for ${normalizedEmail}`);
      await upsertOtpCode(normalizedEmail, code, expiresAt);

      await sendResendEmail({
        to: normalizedEmail,
        name: (user.name as string) || normalizedEmail.split('@')[0],
        subject: `Your Login Code: ${code}`,
        text: `Hello,\n\nYour one-time login code is: ${code}\n\nThis code will expire in ${AUTH_OTP_CODE_EXPIRES_MINUTES} minute${AUTH_OTP_CODE_EXPIRES_MINUTES === 1 ? '' : 's'}.\n\nThanks,\n\nThe Impact AI Governance team`,
        audit: {
          emailType: 'otp',
          recordId: String(user.id || ''),
          triggeredBy: {
            userId: String(user.id || ''),
            userName: String(user.name || 'User'),
            userEmail: normalizedEmail,
          },
        },
      });

      return sendSuccess(res, { message: 'If an account exists, a login code has been sent.' });
    } catch (err: any) {
      console.error('[OTP REQUEST ERROR]', err);
      return sendError(res, 500, err.message || 'Failed to send OTP', 'auth/otp-request-failed');
    }
  });

  app.post('/api/auth/otp/verify', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return sendError(res, 400, 'Email and code required', 'auth/missing-otp');

    try {
      const normalizedEmail = normalizeEmail(email);
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
      const token = signAuthToken(activeUser);
      const publicUser = toPublicUser(activeUser);

      return sendSuccess(res, {
        token,
        user: {
          uid: publicUser.id,
          id: publicUser.id,
          email: publicUser.email,
          displayName: publicUser.name,
          emailVerified: true,
        },
        profile: publicUser,
      });
    } catch (err: any) {
      console.error('[OTP VERIFY ERROR]', err);
      return sendError(res, 500, err.message || 'Verification failed', 'auth/otp-verify-failed');
    }
  });

  app.post('/api/email/send-assignment', async (req, res) => {
    const {
      email,
      name,
      magicLink,
      projectName,
      projectId: bodyProjectId,
      assignmentId: bodyAssignmentId,
      message,
      deadline,
      questionCount,
      subject: clientSubject,
      text: clientText,
      html: clientHtml,
      cc: clientCc,
    } = req.body;

    let triggeredBy:
      | { userId: string; userName: string; userEmail: string }
      | undefined;
    try {
      const auth = await resolvePlatformUserFromRequest(req, JWT_SECRET);
      if (auth.user) {
        triggeredBy = {
          userId: String(auth.user.id || ''),
          userName: String(auth.user.name || 'User'),
          userEmail: String(auth.user.email || ''),
        };
      }
    } catch {
      /* optional auth for audit actor */
    }

    const ccList: { email: string; name: string }[] = Array.isArray(clientCc)
      ? clientCc
          .map((entry: unknown) => {
            if (!entry || typeof entry !== 'object') return null;
            const e = entry as { email?: string; name?: string };
            const addr = String(e.email || '').trim().toLowerCase();
            if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return null;
            return {
              email: addr,
              name: String(e.name || '').trim() || addr.split('@')[0] || addr,
            };
          })
          .filter(Boolean) as { email: string; name: string }[]
      : [];

    const subjectOk = typeof clientSubject === 'string' && clientSubject.trim().length > 0;
    const textOk = typeof clientText === 'string' && clientText.trim().length > 0;
    const htmlOk = typeof clientHtml === 'string' && clientHtml.trim().length > 0;
    /** Prefer client-built localized mail; allow HTML-only body so we never fall back to English silently. */
    const hasClientBody = subjectOk && (textOk || htmlOk);

    function assignmentHtmlToPlainText(html: string): string {
      return String(html)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    console.log(`[EMAIL] To: ${name} <${email}> via Resend (${hasClientBody ? 'client-localized' : 'legacy-en'})`);
    if (!hasClientBody) {
      console.warn(
        '[EMAIL] Using legacy English template (missing localized body). subjectOk=%s textOk=%s htmlOk=%s',
        subjectOk,
        textOk,
        htmlOk,
      );
    }

    try {
      if (hasClientBody) {
        const subject = String(clientSubject).trim().slice(0, 200);
        const rawText = textOk ? String(clientText).trim() : assignmentHtmlToPlainText(String(clientHtml));
        const text = rawText.slice(0, 120_000);
        const html =
          htmlOk
            ? String(clientHtml).trim().slice(0, 200_000)
            : text.replace(/\n/g, '<br/>');

        await sendResendEmail({
          to: email,
          name: name || email.split('@')[0],
          subject,
          text,
          html,
          cc: ccList.length ? ccList : undefined,
          tags: ['veritasesg-assignment'],
          audit: {
            emailType: 'assignment',
            projectId: typeof bodyProjectId === 'string' ? bodyProjectId : undefined,
            recordId: typeof bodyAssignmentId === 'string' ? bodyAssignmentId : undefined,
            triggeredBy,
          },
        });
        return res.json({ success: true, message: 'Email sent successfully' });
      }

      const htmlContent = `
        <div style="font-family: sans-serif; color: #334155; line-height: 1.6; max-width: 600px;">
          <p>Hello ${name},</p>
          <p>You have been assigned to the project "<strong>${projectName || 'New Project'}</strong>".</p>
          ${message ? `<p style="font-style: italic; color: #475569; border-left: 2px solid #e2e8f0; padding-left: 16px; margin: 20px 0;">"${message}"</p>` : ''}
          <p>You can access your workspace here:</p>
          <div style="margin: 24px 0;">
            <a href="${magicLink}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Access Workspace</a>
          </div>
          <p>Regards,<br/>The Impact AI Governance Team</p>
        </div>
      `;

      await sendResendEmail({
        to: email,
        name: name || email.split('@')[0],
        subject: `Reporting Assignment: ${projectName || 'New Project'}`,
        text: `Hello ${name},\n\nYou have been assigned to the project "${projectName || 'New Project'}".\n\nYou can access your workspace here:\n${magicLink}\n\nRegards,\nThe Impact AI Governance Team`,
        html: htmlContent,
        tags: ['veritasesg-assignment'],
        audit: {
          emailType: 'assignment',
          projectId: typeof bodyProjectId === 'string' ? bodyProjectId : undefined,
          recordId: typeof bodyAssignmentId === 'string' ? bodyAssignmentId : undefined,
          triggeredBy,
        },
      });
      return res.json({ success: true, message: 'Email sent successfully' });
    } catch (err: any) {
      console.error('[RESEND API ERROR]', err);
      const msg = err.message || '';
      if (msg.includes('quota') || msg.includes('credits') || msg.includes('rate limit')) {
        return res.status(422).json({
          error: 'Email delivery failed: Resend quota or rate limit reached. Check your Resend dashboard.',
        });
      }
      return res.status(500).json({ error: `Failed to send email via Resend: ${msg}` });
    }
  });

  app.post('/api/email/send-reset', async (req, res) => {
    const { email, resetLink } = req.body;
    console.log(`[RESET EMAIL] To: ${email} via Resend`);
    
    try {
      await sendResendEmail({
        to: email,
        name: email.split('@')[0],
        subject: 'Reset your password for Impact AI Governance',
        text: `Hello,\n\nFollow this link to reset your password for your account:\n\n${resetLink}\n\nIf you didn't ask to reset your password, you can ignore this email.\n\nThanks,\n\nThe Impact AI Governance team`,
        audit: {
          emailType: 'password_reset',
          triggeredBy: {
            userId: 'system',
            userName: 'System',
            userEmail: String(email || '').trim().toLowerCase(),
          },
        },
      });
      return res.json({ success: true, message: 'Reset email sent successfully' });
    } catch (err: any) {
      console.error('[RESEND API RESET ERROR]', err);
      return res.status(500).json({ error: 'Failed to send reset email via Resend' });
    }

    res.status(400).json({ error: 'Email provider not configured correctly' });
  });
  
  app.post('/api/admin/set-password', async (req, res) => {
    const { token, targetUid, newPassword } = req.body;
    const authToken = token || getBearerToken(req);
    
    console.log(`[ADMIN-API] Password reset request for UID: ${targetUid}`);

    if (!authToken || !targetUid || !newPassword) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const decoded = jwt.verify(authToken, JWT_SECRET) as { uid?: string };
      if (!decoded?.uid) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      }

      const [requester, targetUser] = await Promise.all([
        findPlatformUserById(decoded.uid),
        findPlatformUserById(targetUid),
      ]);

      if (!requester) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      }

      const requesterData = toPublicUser(requester);
      const isAuthorized =
        MASTER_ADMIN_EMAILS.includes(requesterData.email as string) ||
        requesterData.role === 'platform_admin';

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Unauthorized. Platform Admin role required for this action.' });
      }

      if (!targetUser) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      }

      await updatePlatformUserPassword(targetUid, newPassword);

      return res.json({
        success: true,
        message: 'Şifre başarıyla güncellendi.',
      });
    } catch (err: any) {
      if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      }
      console.error('[ADMIN-API] Internal error:', err);
      res.status(500).json({ error: 'An unexpected internal error occurred during the password update process.' });
    }
  });

  function getPlatformApiKey(): string {
    if (!process.env.PLATFORM_API_KEY) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('PLATFORM_API_KEY environment variable must be set in production');
      }
      console.warn('[SECURITY WARNING] PLATFORM_API_KEY is not set. Using an insecure fallback. Set PLATFORM_API_KEY in your .env file.');
    }
    return process.env.PLATFORM_API_KEY || 'fallback-platform-key-dev-only';
  }

  app.get('/api/admin/platform-api-key', async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return sendError(res, 401, 'Unauthorized');
      }
      const publicUser = toPublicUser(user);
      if (publicUser.role !== 'platform_admin') {
        return sendError(res, 403, 'Platform Admin role required.');
      }
      return sendSuccess(res, { apiKey: getPlatformApiKey() });
    } catch (err: any) {
      console.error('[ADMIN-API] platform-api-key:', err);
      return sendError(res, 500, 'Failed to load platform API key');
    }
  });

  function assertCustomerApiKey(req: express.Request, res: express.Response): boolean {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = getPlatformApiKey();
    if (!apiKey || apiKey !== expectedKey) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid API Key' });
      return false;
    }
    return true;
  }

  /**
   * CUSTOMER FACING API — list customers (ids + core fields).
   * GET /api/v1/customer/customers
   */
  app.get('/api/v1/customer/customers', async (req, res) => {
    if (!assertCustomerApiKey(req, res)) return;

    try {
      const customers = await listCustomersForPublicApi();
      res.json({
        success: true,
        count: customers.length,
        customers,
      });
    } catch (error: any) {
      console.error('[CUSTOMER-API /customers]', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  /**
   * CUSTOMER FACING API — list projects for a customer.
   * GET /api/v1/customer/projects?customerId=<mongoId>
   */
  app.get('/api/v1/customer/projects', async (req, res) => {
    if (!assertCustomerApiKey(req, res)) return;

    const { customerId } = req.query;
    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      return res.status(400).json({ error: 'Missing customerId query parameter' });
    }

    try {
      const result = await getCustomerProjectsForPublicApi(String(customerId).trim());
      if (!result) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json({
        success: true,
        customer: result.customer,
        projectCount: result.projects.length,
        projects: result.projects,
      });
    } catch (error: any) {
      console.error('[CUSTOMER-API /projects]', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  /**
   * CUSTOMER FACING API
   * Endpoint: GET /api/v1/customer/project-data
   * Query: ?projectName=Project%20Name
   * Header: x-api-key: <PLATFORM_API_KEY>
   *
   * Provides questionnaire submissions and attachments for a given project.
   */
  app.get('/api/v1/customer/project-data', async (req, res) => {
    if (!assertCustomerApiKey(req, res)) return;

    const { projectName } = req.query;
    if (!projectName) {
      return res.status(400).json({ error: 'Missing projectName query parameter' });
    }

    try {
      console.log(`[CUSTOMER-API] Querying project by name: "${projectName}"`);
      const result = await getProjectSubmissionsByName(String(projectName));

      if (!result) {
        return res.status(404).json({ error: 'Project not found' });
      }

      console.log(`[CUSTOMER-API] Fetching answers for project ${result.project.id}`);
      res.json({
        success: true,
        project: result.project,
        dataCount: result.submissions.length,
        submissions: result.submissions,
      });
    } catch (error: any) {
      console.error('[CUSTOMER-API ERROR]', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

    // Vite Integration
    registerStorageProxyRoutes(app);

    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distDir = path.join(process.cwd(), 'dist');
      app.use(
        express.static(distDir, {
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html')) {
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
          },
        }),
      );
      app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${PORT}`);
    });
  } catch (err: any) {
    console.error('[FATAL SERVER ERROR]', err);
    // In production, we still want to listen if possible so the app doesn't just "fail" deployment
    // but instead gives us logs via the health check or error pages.
    const app = express();
    app.get('*', (req, res) => {
      res.status(500).send(`Server failed to start correctly: ${err.message}`);
    });
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Emergency fallback server running on port ${PORT}`);
    });
  }
}

startServer();
