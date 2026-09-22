import { Router, Response } from 'express';
import { Repository } from '../db/repository.js';
import { authenticateJwt, AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { apiKeyRateLimiter } from '../middleware/rateLimiter.js';
import { sanitizeInput } from '../utils/validator.js';

const router = Router();

router.get('/', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const merchantId = isSuperOrAdmin
      ? ((req.query.merchantId as string) || req.merchantId)
      : req.merchantId;

    if (!merchantId) return sendError(res, 'MERCHANT_REQUIRED', 'Merchant required', 400);

    const keys = await Repository.getApiKeysByMerchant(merchantId);
    return sendSuccess(res, keys);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

router.post('/', authenticateJwt, apiKeyRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = sanitizeInput(req.body);
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const merchantId = isSuperOrAdmin ? (body.merchantId || req.merchantId) : req.merchantId;

    const { name, mode } = body;

    if (!name) {
      return sendError(res, 'NAME_REQUIRED', 'Key name is required', 400);
    }

    const prefix = mode === 'test' ? `ps_test_${Math.random().toString(36).substring(2, 8)}` : `ps_live_${Math.random().toString(36).substring(2, 8)}`;
    const rawSecret = `ps_sec_${Math.random().toString(36).substring(2, 14)}_${Date.now().toString(36)}`;
    const apiKey = await Repository.createApiKey({
      merchantId,
      name,
      keyPrefix: prefix,
      secretHash: rawSecret,
      mode: mode || 'live',
    });

    await Repository.logAudit({
      actorId: req.user?.id || 'merchant',
      actorEmail: req.user?.email || 'merchant',
      actorRole: req.user?.role || 'MERCHANT_OWNER',
      merchantId,
      action: 'API_KEY_CREATED',
      resourceType: 'API_KEY',
      resourceId: apiKey.id,
      metadata: { prefix: apiKey.keyPrefix, mode: apiKey.mode },
      ipAddress: req.ip,
      requestId: (req as any).id,
    });

    return sendSuccess(
      res,
      {
        apiKey,
        secretKey: rawSecret,
      },
      'API Key created. Please save the secret key now; it will not be displayed again.',
      201
    );
  } catch (err: any) {
    return sendError(res, 'CREATE_KEY_FAILED', err.message, 500);
  }
});

// Revoke API Key
router.delete('/:id', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchantId || 'merch_demo_101';

    const revoked = await Repository.revokeApiKey(id, merchantId);
    if (!revoked) {
      return sendError(res, 'NOT_FOUND', 'API key not found or not owned by your merchant account.', 404);
    }

    await Repository.logAudit({
      actorId: req.user?.id || 'merchant',
      actorEmail: req.user?.email || 'merchant',
      actorRole: req.user?.role || 'MERCHANT_OWNER',
      merchantId,
      action: 'API_KEY_REVOKED',
      resourceType: 'API_KEY',
      resourceId: id,
      ipAddress: req.ip,
      requestId: (req as any).id,
    });

    return sendSuccess(res, { id, revoked: true }, 'API key has been revoked successfully.');
  } catch (err: any) {
    return sendError(res, 'REVOKE_KEY_FAILED', err.message, 500);
  }
});

// Rotate API Key Secret
router.post('/:id/rotate', authenticateJwt, apiKeyRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchantId || 'merch_demo_101';

    const result = await Repository.rotateApiKey(id, merchantId);
    if (!result) {
      return sendError(res, 'NOT_FOUND', 'API key not found or access denied.', 404);
    }

    await Repository.logAudit({
      actorId: req.user?.id || 'merchant',
      actorEmail: req.user?.email || 'merchant',
      actorRole: req.user?.role || 'MERCHANT_OWNER',
      merchantId,
      action: 'API_KEY_ROTATED',
      resourceType: 'API_KEY',
      resourceId: id,
      ipAddress: req.ip,
      requestId: (req as any).id,
    });

    return sendSuccess(
      res,
      {
        apiKey: result.apiKey,
        secretKey: result.rawSecret,
      },
      'API Key secret rotated successfully. Please save the new secret key now; it will not be displayed again.',
      200
    );
  } catch (err: any) {
    return sendError(res, 'ROTATE_KEY_FAILED', err.message, 500);
  }
});

// Toggle API Key Status (ACTIVE/REVOKED)
router.patch('/:id/status', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'REVOKED') {
      return sendError(res, 'INVALID_STATUS', 'Status must be ACTIVE or REVOKED', 400);
    }

    const keyDoc = await Repository.getApiKeyById(id);
    if (!keyDoc) {
      return sendError(res, 'NOT_FOUND', 'API key not found or access denied.', 404);
    }

    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    if (!isSuperOrAdmin && keyDoc.merchantId !== req.merchantId) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this API key resource.', 403);
    }

    const updated = await Repository.updateApiKey(id, { status });
    if (!updated) {
      return sendError(res, 'NOT_FOUND', 'API key not found or access denied.', 404);
    }

    await Repository.logAudit({
      actorId: req.user?.id || 'merchant',
      actorEmail: req.user?.email || 'merchant',
      actorRole: req.user?.role || 'MERCHANT_OWNER',
      merchantId: keyDoc.merchantId,
      action: `API_KEY_${status}`,
      resourceType: 'API_KEY',
      resourceId: id,
      ipAddress: req.ip,
      requestId: (req as any).id,
    });

    return sendSuccess(res, updated, `API key status updated to ${status}`);
  } catch (err: any) {
    return sendError(res, 'STATUS_UPDATE_FAILED', err.message, 500);
  }
});

export default router;
