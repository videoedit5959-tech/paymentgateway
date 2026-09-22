import { Router, Response } from 'express';
import { Repository } from '../db/repository.js';
import { authenticateJwt, AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

router.get('/', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const merchantId = isSuperOrAdmin
      ? ((req.query.merchantId as string) || req.merchantId)
      : req.merchantId;

    if (!merchantId) {
      return sendError(res, 'MERCHANT_REQUIRED', 'Merchant context not found', 400);
    }
    const transactions = await Repository.getTransactionsByMerchant(merchantId);
    return sendSuccess(res, transactions);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message);
  }
});

router.get('/:id', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const trx = await Repository.findTransactionByTrxId(id);
    if (!trx) {
      return sendError(res, 'NOT_FOUND', 'Transaction not found', 404);
    }

    const isAuthorized =
      req.user?.role === 'SUPER_ADMIN' ||
      req.user?.role === 'ADMIN' ||
      trx.merchantId === req.merchantId;

    if (!isAuthorized) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this transaction resource.', 403);
    }

    return sendSuccess(res, trx);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message);
  }
});

export default router;
