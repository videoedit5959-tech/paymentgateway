import { Router, Response } from 'express';
import { Repository } from '../db/repository.js';
import { authenticateJwt, AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { BillingService } from '../services/billingService.js';

const router = Router();

// List wallets for current merchant
router.get('/', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const merchantId = isSuperOrAdmin
      ? ((req.query.merchantId as string) || req.merchantId)
      : req.merchantId;

    if (!merchantId) {
      return sendError(res, 'MERCHANT_REQUIRED', 'Merchant context not found', 400);
    }

    const wallets = await Repository.getWalletsByMerchant(merchantId);
    return sendSuccess(res, wallets);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message);
  }
});

// Create wallet
router.post('/', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const merchantId = isSuperOrAdmin ? (req.body.merchantId || req.merchantId) : req.merchantId;

    const { provider, walletNumber, walletType, displayName } = req.body;

    if (!provider || !walletNumber || !displayName) {
      return sendError(res, 'FIELDS_REQUIRED', 'Provider, walletNumber and displayName are required.');
    }

    // Enforce subscription plan wallet limit
    const limitCheck = await BillingService.checkSubscriptionLimits(merchantId, 'ADD_WALLET');
    if (!limitCheck.allowed) {
      return sendError(res, limitCheck.code || 'WALLET_LIMIT_REACHED', limitCheck.message || 'Wallet limit reached', 403);
    }

    const wallet = await Repository.createWallet({
      merchantId,
      provider,
      walletNumber,
      walletType: walletType || 'PERSONAL',
      displayName,
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
    });

    await Repository.logAudit({
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin',
      actorRole: req.user?.role || 'MERCHANT_OWNER',
      merchantId,
      action: 'WALLET_CREATED',
      resourceType: 'WALLET',
      resourceId: wallet.id,
      metadata: { provider, walletNumber },
      ipAddress: req.ip,
    });

    return sendSuccess(res, wallet, 'Wallet successfully added', 201);
  } catch (err: any) {
    return sendError(res, 'WALLET_CREATE_FAILED', err.message);
  }
});

// Update wallet
router.patch('/:id', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingWallet = await Repository.getWalletById(id);
    if (!existingWallet) {
      return sendError(res, 'NOT_FOUND', 'Wallet not found', 404);
    }

    const isAuthorized =
      req.user?.role === 'SUPER_ADMIN' ||
      req.user?.role === 'ADMIN' ||
      existingWallet.merchantId === req.merchantId;

    if (!isAuthorized) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this wallet resource.', 403);
    }

    const updates = req.body;
    const updated = await Repository.updateWallet(id, updates);
    return sendSuccess(res, updated, 'Wallet updated');
  } catch (err: any) {
    return sendError(res, 'UPDATE_FAILED', err.message);
  }
});

export default router;
