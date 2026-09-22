import { Router, Response } from 'express';
import crypto from 'crypto';
import { WebhookService } from '../services/webhookService.js';
import { Repository } from '../db/repository.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const cronRouter = Router();

/**
 * Security helper to validate incoming Vercel Cron requests
 */
function verifyCronAuth(req: any): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = (req.headers['authorization'] as string) || (req.headers['x-cron-secret'] as string);

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
      return false; // Strict security: reject unauthenticated calls in prod/staging if secret not set
    }
    return true; // Allow local development testing if secret is omitted
  }

  if (!authHeader) return false;

  const providedToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const providedBuf = Buffer.from(providedToken, 'utf8');
    const secretBuf = Buffer.from(cronSecret, 'utf8');
    if (providedBuf.length !== secretBuf.length) return false;
    return crypto.timingSafeEqual(providedBuf, secretBuf);
  } catch {
    return false;
  }
}

/**
 * GET /api/cron/webhooks
 * Trigger pending webhook retry worker execution (Vercel Cron: every 1 minute)
 */
cronRouter.get('/webhooks', async (req, res: Response) => {
  if (!verifyCronAuth(req)) {
    return sendError(res, 'UNAUTHORIZED_CRON', 'Unauthorized cron invocation', 401);
  }

  try {
    const processedCount = await WebhookService.processPendingRetries();
    return sendSuccess(res, { processedCount, timestamp: new Date().toISOString() }, 'Webhook retries processed successfully');
  } catch (error: any) {
    return sendError(res, 'CRON_WEBHOOK_ERROR', error.message, 500);
  }
});

/**
 * GET /api/cron/devices
 * Trigger device health watchdog to mark stale collectors offline (Vercel Cron: every 1 minute)
 */
cronRouter.get('/devices', async (req, res: Response) => {
  if (!verifyCronAuth(req)) {
    return sendError(res, 'UNAUTHORIZED_CRON', 'Unauthorized cron invocation', 401);
  }

  try {
    const staleThreshold = new Date(Date.now() - 90 * 1000).toISOString();
    const updatedCount = await Repository.markStaleDevicesOffline(staleThreshold);
    return sendSuccess(res, { markedOfflineCount: updatedCount, staleThreshold, timestamp: new Date().toISOString() }, 'Device health watchdog executed successfully');
  } catch (error: any) {
    return sendError(res, 'CRON_DEVICE_ERROR', error.message, 500);
  }
});
