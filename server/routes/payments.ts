import { Router, Request, Response } from 'express';
import { Repository } from '../db/repository.js';
import { VerificationEngine } from '../services/verificationEngine.js';
import { authenticateJwt, AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { paymentCreationRateLimiter, verificationRateLimiter } from '../middleware/rateLimiter.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { sanitizeInput, isValidAmount } from '../utils/validator.js';
import { WebhookService } from '../services/webhookService.js';

const router = Router();

// 1. Merchant initializes payment session
const handleCreatePayment = async (req: Request, res: Response) => {
  try {
    const body = sanitizeInput(req.body);
    const { amount, currency, invoiceId, customer, successUrl, cancelUrl, webhookUrl, provider, walletId, mode } =
      body;

    if (!isValidAmount(amount, 1, 500000)) {
      return sendError(res, 'INVALID_AMOUNT', 'Amount must be a valid positive number between 1 and 500,000 BDT', 400);
    }

    // Resolve merchant context (from API key, Bearer token, or request body)
    const merchantId = (req as any).merchantId || (req as any).user?.merchantId || req.body.merchantId || 'merch_demo_101';
    const merchant = await Repository.findMerchantById(merchantId);
    if (!merchant) {
      return sendError(res, 'MERCHANT_NOT_FOUND', 'Merchant does not exist', 404);
    }

    if (merchant.status !== 'ACTIVE') {
      return sendError(res, 'MERCHANT_INACTIVE', 'Merchant account is not active for accepting payments', 403);
    }

    const settings = await Repository.getSettings();
    if (amount < settings.minPaymentAmount || amount > settings.maxPaymentAmount) {
      return sendError(
        res,
        'AMOUNT_OUT_OF_BOUNDS',
        `Amount must be between Tk ${settings.minPaymentAmount} and Tk ${settings.maxPaymentAmount}`,
        400
      );
    }

    const paymentId = 'PAY-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    const expirationMs = (settings.paymentExpirationMinutes || 30) * 60 * 1000;
    const expiresAt = new Date(Date.now() + expirationMs).toISOString();

    const payment = await Repository.createPayment({
      merchantId,
      paymentId,
      amount: Number(amount),
      currency: currency || 'BDT',
      invoiceId: invoiceId || `INV-${Date.now().toString().slice(-6)}`,
      customer: customer || {},
      provider,
      walletId,
      status: 'PENDING',
      successUrl,
      cancelUrl,
      webhookUrl: webhookUrl || merchant.webhookUrl,
      expiresAt,
      mode: mode || 'live',
    });

    await Repository.logAudit({
      actorId: merchantId,
      actorEmail: merchant.email,
      actorRole: 'MERCHANT_OWNER',
      merchantId,
      action: 'PAYMENT_SESSION_CREATED',
      resourceType: 'PAYMENT',
      resourceId: payment.paymentId,
      metadata: { amount: payment.amount, invoiceId: payment.invoiceId },
      ipAddress: req.ip,
      requestId: (req as any).id,
    });

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const paymentUrl = `${baseUrl}/checkout/${payment.paymentId}`;

    return sendSuccess(
      res,
      {
        paymentId: payment.paymentId,
        paymentUrl,
        amount: payment.amount,
        currency: payment.currency,
        invoiceId: payment.invoiceId,
        expiresAt: payment.expiresAt,
        status: payment.status,
      },
      'Payment session initialized successfully',
      201
    );
  } catch (err: any) {
    return sendError(res, 'PAYMENT_CREATION_FAILED', err.message, 500);
  }
};

router.post(
  ['/payments/create', '/v1/payments/create', '/create'],
  paymentCreationRateLimiter,
  idempotencyMiddleware,
  handleCreatePayment
);

// 2. Get payment checkout details (Public for checkout page)
const handleGetPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await Repository.getPaymentById(id);
    if (!payment) {
      return sendError(res, 'PAYMENT_NOT_FOUND', 'Payment session not found or expired', 404);
    }

    const merchant = await Repository.findMerchantById(payment.merchantId);
    const wallets = await Repository.getWalletsByMerchant(payment.merchantId);
    const activeWallets = wallets.filter((w) => w.status === 'ACTIVE');

    return sendSuccess(res, {
      payment: {
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        invoiceId: payment.invoiceId,
        status: payment.status,
        provider: payment.provider,
        customer: payment.customer,
        expiresAt: payment.expiresAt,
        matchedTrxId: payment.matchedTrxId,
        createdAt: payment.createdAt,
      },
      merchant: {
        businessName: merchant?.businessName || 'Verified Merchant Store',
        ownerName: merchant?.ownerName,
      },
      availableWallets: activeWallets.map((w) => ({
        id: w.id,
        provider: w.provider,
        walletNumber: w.walletNumber,
        walletType: w.walletType,
        displayName: w.displayName,
      })),
    });
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
};

// 3. Get payment status only
const handleGetPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await Repository.getPaymentById(id);
    if (!payment) {
      return sendError(res, 'PAYMENT_NOT_FOUND', 'Payment session not found', 404);
    }

    return sendSuccess(res, {
      paymentId: payment.paymentId,
      status: payment.status,
      matchedTrxId: payment.matchedTrxId,
      amount: payment.amount,
      completedAt: payment.completedAt,
    });
  } catch (err: any) {
    return sendError(res, 'FETCH_STATUS_FAILED', err.message, 500);
  }
};

// 4. Customer submits Transaction ID for verification
const handleVerifyPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { trxId } = req.body;
    const requestId = (req as any).id;

    if (!trxId || typeof trxId !== 'string' || trxId.trim().length < 6) {
      return sendError(res, 'INVALID_TRX_ID', 'Please enter a valid Transaction ID (minimum 6 characters)', 400);
    }

    const result = await VerificationEngine.verifyTrxId(id, trxId, req.ip, requestId);

    if (!result.success) {
      return sendError(res, result.errorCode || 'VERIFICATION_FAILED', result.errorMessage || 'Verification failed', 400);
    }

    return sendSuccess(
      res,
      {
        verified: true,
        payment: result.payment,
        transaction: result.transaction,
      },
      'Payment verified and completed successfully!'
    );
  } catch (err: any) {
    return sendError(res, 'VERIFY_ERROR', err.message, 500);
  }
};

router.get(['/payments/:id/status', '/v1/payments/:id/status', '/:id/status'], handleGetPaymentStatus);
router.post(
  ['/payments/:id/verify', '/v1/payments/:id/verify', '/:id/verify'],
  verificationRateLimiter,
  idempotencyMiddleware,
  handleVerifyPayment
);
router.get(['/payments/:id', '/v1/payments/:id', '/:id'], handleGetPayment);

// 5. Merchant view: list payments
router.get(['/', '/payments'], authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const merchantId = isSuperOrAdmin
      ? ((req.query.merchantId as string) || req.merchantId)
      : req.merchantId;

    if (!merchantId) {
      return sendError(res, 'MERCHANT_REQUIRED', 'Merchant context not found', 400);
    }
    const payments = await Repository.getPaymentsByMerchant(merchantId);
    return sendSuccess(res, payments);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

// 6. Manual Review Resolution (Merchant or Admin approves or rejects flagged payment)
router.post('/:id/review', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, notes, manualTrxId } = req.body; // 'APPROVE' or 'REJECT'

    const payment = await Repository.getPaymentById(id);
    if (!payment) {
      return sendError(res, 'PAYMENT_NOT_FOUND', 'Payment not found', 404);
    }

    const isAuthorized =
      req.user?.role === 'SUPER_ADMIN' ||
      req.user?.role === 'ADMIN' ||
      payment.merchantId === req.merchantId;

    if (!isAuthorized) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this payment session.', 403);
    }

    if (action === 'APPROVE') {
      const updated = await Repository.updatePayment(payment.paymentId, {
        status: 'COMPLETED',
        matchedTrxId: manualTrxId || payment.matchedTrxId || 'MANUAL_APPROVAL',
        completedAt: new Date().toISOString(),
      });

      await Repository.logAudit({
        actorId: req.user?.id || 'admin',
        actorEmail: req.user?.email || 'admin@store',
        actorRole: req.user?.role || 'MERCHANT_OWNER',
        merchantId: payment.merchantId,
        action: 'MANUAL_PAYMENT_APPROVED',
        resourceType: 'PAYMENT',
        resourceId: payment.paymentId,
        metadata: { notes, manualTrxId },
        ipAddress: req.ip,
        requestId: (req as any).id,
      });

      if (updated) {
        WebhookService.dispatchPaymentEvent('payment.completed', updated).catch(console.error);
      }

      return sendSuccess(res, updated, 'Payment manually approved and completed.');
    } else if (action === 'REJECT') {
      const updated = await Repository.updatePayment(payment.paymentId, {
        status: 'FAILED',
      });

      await Repository.logAudit({
        actorId: req.user?.id || 'admin',
        actorEmail: req.user?.email || 'admin@store',
        actorRole: req.user?.role || 'MERCHANT_OWNER',
        merchantId: payment.merchantId,
        action: 'MANUAL_PAYMENT_REJECTED',
        resourceType: 'PAYMENT',
        resourceId: payment.paymentId,
        metadata: { notes },
        ipAddress: req.ip,
        requestId: (req as any).id,
      });

      if (updated) {
        WebhookService.dispatchPaymentEvent('payment.failed', updated).catch(console.error);
      }

      return sendSuccess(res, updated, 'Payment manually rejected and marked as failed.');
    } else {
      return sendError(res, 'INVALID_ACTION', 'Action must be APPROVE or REJECT', 400);
    }
  } catch (err: any) {
    return sendError(res, 'REVIEW_FAILED', err.message, 500);
  }
});

export default router;
