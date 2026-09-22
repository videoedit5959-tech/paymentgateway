import { Router, Response } from 'express';
import { Repository } from '../db/repository.js';
import { WebhookService } from '../services/webhookService.js';
import { authenticateJwt, AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// 1. List webhooks for current merchant
router.get('/', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const merchantId = isSuperOrAdmin
      ? ((req.query.merchantId as string) || req.merchantId)
      : req.merchantId;

    if (!merchantId) {
      return sendError(res, 'MERCHANT_REQUIRED', 'Merchant context not found', 400);
    }

    const webhooks = await Repository.getWebhooksByMerchant(merchantId);
    return sendSuccess(res, webhooks);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

// 2. Get single webhook log
router.get('/:id', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const webhook = await Repository.getWebhookById(id);
    if (!webhook) {
      return sendError(res, 'NOT_FOUND', 'Webhook log not found', 404);
    }

    const isAuthorized =
      req.user?.role === 'SUPER_ADMIN' ||
      req.user?.role === 'ADMIN' ||
      webhook.merchantId === req.merchantId;

    if (!isAuthorized) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this webhook log.', 403);
    }

    return sendSuccess(res, webhook);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

// 3. Trigger test ping webhook
router.post('/test', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const merchantId = isSuperOrAdmin
      ? (req.body.merchantId || req.merchantId)
      : req.merchantId;

    if (!merchantId) {
      return sendError(res, 'MERCHANT_REQUIRED', 'Merchant context required', 400);
    }

    const { testUrl } = req.body;
    const result = await WebhookService.sendTestWebhook(merchantId, testUrl);

    await Repository.logAudit({
      actorId: req.user?.id || 'merchant',
      actorEmail: req.user?.email || 'merchant',
      actorRole: req.user?.role || 'MERCHANT_OWNER',
      merchantId,
      action: 'WEBHOOK_TEST_SENT',
      resourceType: 'WEBHOOK',
      resourceId: result.log.id,
      metadata: { targetUrl: testUrl, success: result.success },
      ipAddress: req.ip,
      requestId: (req as any).id,
    });

    return sendSuccess(res, result, result.success ? 'Test webhook delivered successfully' : 'Test webhook delivery failed');
  } catch (err: any) {
    return sendError(res, 'TEST_WEBHOOK_FAILED', err.message, 500);
  }
});

// 4. Trigger immediate manual retry of a failed webhook
router.post('/:id/retry', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const webhook = await Repository.getWebhookById(id);
    if (!webhook) {
      return sendError(res, 'NOT_FOUND', 'Webhook log not found', 404);
    }

    const isAuthorized =
      req.user?.role === 'SUPER_ADMIN' ||
      req.user?.role === 'ADMIN' ||
      webhook.merchantId === req.merchantId;

    if (!isAuthorized) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this webhook log.', 403);
    }

    // Force delivery attempt
    const merchant = await Repository.findMerchantById(webhook.merchantId);
    const secret = merchant?.webhookSecret || process.env.WEBHOOK_SIGNING_SECRET || 'paysync_default_webhook_secret';
    const signature = WebhookService.signPayload(webhook.payload, secret);

    const log = await (WebhookService as any).executeDelivery({
      merchantId: webhook.merchantId,
      paymentId: webhook.paymentId,
      endpoint: webhook.endpoint,
      event: webhook.event,
      payload: webhook.payload,
      signature,
      attemptNumber: (webhook.attempts || 1) + 1,
      logId: webhook.id,
    });

    return sendSuccess(res, log, 'Webhook retry executed');
  } catch (err: any) {
    return sendError(res, 'RETRY_FAILED', err.message, 500);
  }
});

export default router;
