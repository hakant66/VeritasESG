/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { type Express, type Request } from 'express';
import { Resend } from 'resend';
import { applyResendWebhookEvent } from '../lib/emailDeliveryAuditLog.ts';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || '';
const RESEND_WEBHOOK_TOKEN = process.env.RESEND_WEBHOOK_TOKEN || '';

function isAuthorizedFallback(req: Request): boolean {
  if (!RESEND_WEBHOOK_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[RESEND WEBHOOK] RESEND_WEBHOOK_SECRET or RESEND_WEBHOOK_TOKEN required');
      return false;
    }
    console.warn('[RESEND WEBHOOK] Accepting unsigned webhook (dev only)');
    return true;
  }

  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader === `Bearer ${RESEND_WEBHOOK_TOKEN}`) return true;
  if (authHeader === RESEND_WEBHOOK_TOKEN) return true;

  const queryToken = String(req.query.token || '').trim();
  if (queryToken && queryToken === RESEND_WEBHOOK_TOKEN) return true;

  return false;
}

function verifyResendWebhookPayload(
  payload: string,
  req: Request,
): Record<string, unknown> | null {
  if (RESEND_WEBHOOK_SECRET && RESEND_API_KEY) {
    const resend = new Resend(RESEND_API_KEY);
    try {
      return resend.webhooks.verify({
        payload,
        headers: {
          id: String(req.headers['svix-id'] || ''),
          timestamp: String(req.headers['svix-timestamp'] || ''),
          signature: String(req.headers['svix-signature'] || ''),
        },
        webhookSecret: RESEND_WEBHOOK_SECRET,
      }) as Record<string, unknown>;
    } catch (err) {
      console.error('[RESEND WEBHOOK] Signature verification failed', err);
      return null;
    }
  }

  if (!isAuthorizedFallback(req)) return null;

  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function registerResendWebhookRoutes(app: Express) {
  app.get('/api/webhooks/resend', (_req, res) => {
    res.json({
      ok: true,
      message:
        'Resend webhook endpoint. Subscribe to email.sent, email.delivered, email.bounced, email.complained, email.delivery_delayed, email.failed.',
    });
  });

  app.post(
    '/api/webhooks/resend',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      try {
        const rawBody =
          req.body instanceof Buffer
            ? req.body.toString('utf8')
            : typeof req.body === 'string'
              ? req.body
              : '';

        if (!rawBody) {
          return res.status(400).json({ success: false, error: 'Empty webhook payload' });
        }

        const event = verifyResendWebhookPayload(rawBody, req);
        if (!event) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const result = await applyResendWebhookEvent(event);

        return res.json({
          success: true,
          processed: 1,
          matched: result.matched,
        });
      } catch (err: unknown) {
        console.error('[RESEND WEBHOOK ERROR]', err);
        return res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Webhook processing failed',
        });
      }
    },
  );
}
