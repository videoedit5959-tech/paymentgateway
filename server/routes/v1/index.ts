import { Router, Response } from 'express';
import { Repository } from '../../db/repository.js';
import { VerificationEngine } from '../../services/verificationEngine.js';
import { WebhookService } from '../../services/webhookService.js';
import { BillingService } from '../../services/billingService.js';
import { authenticateApiKey, AuthRequest } from '../../middleware/auth.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { sanitizeInput, isValidEmail, isValidPhone } from '../../utils/validator.js';
import { paymentCreationRateLimiter } from '../../middleware/rateLimiter.js';
import { checkIdempotency, saveIdempotencyResponse } from '../../middleware/idempotency.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Public OpenAPI spec endpoint
router.get('/openapi.json', (_req, res) => {
  try {
    const specPath = path.join(process.cwd(), 'openapi', 'openapi.json');
    if (fs.existsSync(specPath)) {
      const content = fs.readFileSync(specPath, 'utf8');
      return res.type('application/json').send(content);
    }
    return res.status(404).json({ error: 'Spec not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Apply API Key Authentication to all /api/v1/ endpoints
router.use(authenticateApiKey);

// Middleware to track API Usage & enforce API request quotas
router.use(async (req: AuthRequest, res: Response, next) => {
  const merchantId = req.merchantId || 'merch_demo_101';
  const check = await BillingService.checkSubscriptionLimits(merchantId, 'API_REQUEST');
  if (!check.allowed) {
    return sendError(res, check.code || 'API_LIMIT_EXCEEDED', check.message || 'API request quota exceeded', 429, check.details);
  }
  // Record usage asynchronously
  BillingService.recordApiUsage(merchantId, true).catch(() => {});
  next();
});

/**
 * 1. POST /api/v1/payments/create
 * Creates a new merchant payment session with idempotency support
 */
router.post('/payments/create', paymentCreationRateLimiter, checkIdempotency, async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_demo_101';
    const body = sanitizeInput(req.body);

    const {
      amount,
      currency = 'BDT',
      orderId,
      customer,
      description,
      successUrl,
      cancelUrl,
      webhookUrl,
      metadata,
    } = body;

    // Check merchant subscription volume limit
    const volumeCheck = await BillingService.checkSubscriptionLimits(merchantId, 'CREATE_PAYMENT', Number(amount));
    if (!volumeCheck.allowed) {
      return sendError(res, volumeCheck.code || 'VOLUME_LIMIT_EXCEEDED', volumeCheck.message || 'Monthly payment volume limit exceeded', 403, volumeCheck.details);
    }

    // 1. Validation
    if (amount === undefined || amount === null || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return sendError(res, 'INVALID_REQUEST', 'Field "amount" must be a positive number.', 400);
    }

    if (amount > 500000) {
      return sendError(res, 'INVALID_REQUEST', 'Amount exceeds maximum allowable transaction limit (500,000 BDT).', 400);
    }

    if (currency !== 'BDT' && currency !== 'USD') {
      return sendError(res, 'INVALID_REQUEST', 'Currency must be BDT or USD.', 400);
    }

    if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
      return sendError(res, 'INVALID_REQUEST', 'Field "orderId" is required (string 1-100 characters).', 400);
    }

    if (orderId.length > 100) {
      return sendError(res, 'INVALID_REQUEST', 'Field "orderId" must not exceed 100 characters.', 400);
    }

    // URL validation if provided
    const validateUrl = (url?: string) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    if (successUrl && !validateUrl(successUrl)) {
      return sendError(res, 'INVALID_REQUEST', 'Field "successUrl" must be a valid HTTP or HTTPS URL.', 400);
    }
    if (cancelUrl && !validateUrl(cancelUrl)) {
      return sendError(res, 'INVALID_REQUEST', 'Field "cancelUrl" must be a valid HTTP or HTTPS URL.', 400);
    }
    if (webhookUrl && !validateUrl(webhookUrl)) {
      return sendError(res, 'INVALID_REQUEST', 'Field "webhookUrl" must be a valid HTTP or HTTPS URL.', 400);
    }

    // Customer validation
    const sanitizedCustomer: { name?: string; email?: string; phone?: string } = {};
    if (customer && typeof customer === 'object') {
      if (customer.name && typeof customer.name === 'string') {
        sanitizedCustomer.name = customer.name.slice(0, 100);
      }
      if (customer.email && typeof customer.email === 'string') {
        if (!isValidEmail(customer.email)) {
          return sendError(res, 'INVALID_REQUEST', 'Invalid customer email address format.', 400);
        }
        sanitizedCustomer.email = customer.email;
      }
      if (customer.phone && typeof customer.phone === 'string') {
        if (!isValidPhone(customer.phone)) {
          return sendError(res, 'INVALID_REQUEST', 'Invalid customer phone number format.', 400);
        }
        sanitizedCustomer.phone = customer.phone;
      }
    }

    // Metadata validation (max 10KB JSON)
    let sanitizedMetadata: Record<string, any> | undefined = undefined;
    if (metadata && typeof metadata === 'object') {
      const serialized = JSON.stringify(metadata);
      if (serialized.length > 10240) {
        return sendError(res, 'INVALID_REQUEST', 'Metadata payload exceeds maximum allowed size of 10KB.', 400);
      }
      sanitizedMetadata = metadata;
    }

    // 2. Check for duplicate pending payment with same orderId for this merchant
    const existingOrder = await Repository.getPaymentByOrderId(orderId, merchantId);
    if (existingOrder && (existingOrder.status === 'PENDING' || existingOrder.status === 'COMPLETED')) {
      const origin = `${req.protocol}://${req.get('host')}`;
      const checkoutUrl = `${origin}/checkout?id=${existingOrder.paymentId}`;

      const existingResponse = {
        paymentId: existingOrder.paymentId,
        orderId: existingOrder.orderId || existingOrder.invoiceId,
        amount: existingOrder.amount,
        currency: existingOrder.currency,
        status: existingOrder.status,
        checkoutUrl,
        expiresAt: existingOrder.expiresAt,
        createdAt: existingOrder.createdAt,
      };

      if (existingOrder.status === 'COMPLETED') {
        return sendError(res, 'PAYMENT_ALREADY_COMPLETED', 'An active order with this orderId has already been completed.', 409, {
          payment: existingResponse,
        });
      }

      // If existing payment is still pending, return it
      return sendSuccess(res, existingResponse, 'Existing active payment session returned.', 200);
    }

    // 3. Expiration calculation (default from env or settings or 15 mins)
    const settings = await Repository.getSettings();
    const expiryMinutes = parseInt(process.env.PAYMENT_EXPIRY_MINUTES || '', 10) || settings?.paymentExpirationMinutes || 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const paymentId = 'pay_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

    const isTestMode = req.apiKeyMode === 'test' || req.apiKey?.mode === 'test';

    const payment = await Repository.createPayment({
      paymentId,
      merchantId,
      amount,
      currency,
      invoiceId: orderId,
      orderId,
      description: description || `Payment for ${orderId}`,
      customer: sanitizedCustomer,
      metadata: {
        ...(sanitizedMetadata || {}),
        isTest: isTestMode,
        successUrl,
        cancelUrl,
        webhookUrl,
      },
      status: 'PENDING',
      expiresAt,
    });

    const origin = `${req.protocol}://${req.get('host')}`;
    const checkoutUrl = `${origin}/checkout?id=${payment.paymentId}`;

    const responsePayload = {
      paymentId: payment.paymentId,
      orderId: payment.orderId || payment.invoiceId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      checkoutUrl,
      expiresAt: payment.expiresAt,
      createdAt: payment.createdAt,
      ...(isTestMode ? { mode: 'test' } : {}),
    };

    const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;
    if (idempotencyKey) {
      await saveIdempotencyResponse(
        idempotencyKey,
        merchantId,
        req.method,
        req.originalUrl || req.url,
        201,
        responsePayload
      );
    }

    // Fire webhook event: payment.created
    WebhookService.dispatchPaymentEvent('payment.created', payment).catch(() => {});

    return sendSuccess(res, responsePayload, 'Payment session created successfully.', 201);
  } catch (err: any) {
    return sendError(res, 'PAYMENT_CREATION_FAILED', err.message, 500);
  }
});

/**
 * 2. GET /api/v1/payments/:paymentId
 * Retrieves full sanitized payment details
 */
router.get('/payments/:paymentId', async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const merchantId = req.merchantId;

    const payment = await Repository.getPaymentById(paymentId);
    if (!payment) {
      return sendError(res, 'PAYMENT_NOT_FOUND', `Payment with ID "${paymentId}" was not found.`, 404);
    }

    // Tenant Isolation
    if (merchantId && payment.merchantId !== merchantId && req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      return sendError(res, 'FORBIDDEN', 'Access denied to this payment resource.', 403);
    }

    const origin = `${req.protocol}://${req.get('host')}`;
    const checkoutUrl = `${origin}/checkout?id=${payment.paymentId}`;

    // Sanitized response
    const sanitized = {
      paymentId: payment.paymentId,
      orderId: payment.orderId || payment.invoiceId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      customer: payment.customer,
      checkoutUrl,
      transaction: payment.matchedTrxId
        ? {
            trxId: payment.matchedTrxId,
            matchedAt: payment.completedAt,
          }
        : undefined,
      metadata: payment.metadata,
      timestamps: {
        createdAt: payment.createdAt,
        expiresAt: payment.expiresAt,
        completedAt: payment.completedAt,
        updatedAt: payment.updatedAt,
      },
    };

    return sendSuccess(res, sanitized);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

/**
 * 3. GET /api/v1/payments/:paymentId/status
 * Lightweight endpoint for polling payment status
 */
router.get('/payments/:paymentId/status', async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const merchantId = req.merchantId;

    const payment = await Repository.getPaymentById(paymentId);
    if (!payment) {
      return sendError(res, 'PAYMENT_NOT_FOUND', `Payment with ID "${paymentId}" was not found.`, 404);
    }

    if (merchantId && payment.merchantId !== merchantId && req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      return sendError(res, 'FORBIDDEN', 'Access denied to this payment resource.', 403);
    }

    return sendSuccess(res, {
      paymentId: payment.paymentId,
      orderId: payment.orderId || payment.invoiceId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      timestamps: {
        createdAt: payment.createdAt,
        expiresAt: payment.expiresAt,
        completedAt: payment.completedAt,
      },
      transaction: payment.matchedTrxId
        ? {
            trxId: payment.matchedTrxId,
          }
        : undefined,
    });
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

/**
 * 4. POST /api/v1/payments/:paymentId/verify
 * Programmatically verifies a customer TrxID against a payment
 */
router.post('/payments/:paymentId/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { trxId } = sanitizeInput(req.body);
    const merchantId = req.merchantId;

    if (!trxId) {
      return sendError(res, 'INVALID_REQUEST', 'Field "trxId" is required.', 400);
    }

    const payment = await Repository.getPaymentById(paymentId);
    if (!payment) {
      return sendError(res, 'PAYMENT_NOT_FOUND', `Payment with ID "${paymentId}" was not found.`, 404);
    }

    if (merchantId && payment.merchantId !== merchantId && req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      return sendError(res, 'FORBIDDEN', 'Access denied to this payment resource.', 403);
    }

    // Sandbox test mode support
    const isTestMode = req.apiKeyMode === 'test' || payment.metadata?.isTest;
    if (isTestMode && trxId.toUpperCase().startsWith('TEST')) {
      const updated = await Repository.completePaymentAtomically(
        payment.paymentId,
        trxId.toUpperCase()
      );
      if (updated) {
        WebhookService.dispatchPaymentEvent('payment.completed', updated).catch(() => {});
        return sendSuccess(
          res,
          {
            paymentId: updated.paymentId,
            status: 'COMPLETED',
            transaction: { trxId: trxId.toUpperCase(), provider: 'BKASH' },
          },
          'Test payment verified successfully.'
        );
      }
    }

    const result = await VerificationEngine.verifyTrxId(
      payment.paymentId,
      trxId,
      req.ip,
      (req as any).id
    );

    if (!result.success) {
      return sendError(
        res,
        result.errorCode || 'VERIFICATION_FAILED',
        result.errorMessage || 'Transaction verification failed.',
        400
      );
    }

    return sendSuccess(
      res,
      {
        paymentId: result.payment?.paymentId || payment.paymentId,
        status: result.payment?.status || 'COMPLETED',
        transaction: result.transaction
          ? {
              trxId: result.transaction.trxId,
              provider: result.transaction.provider,
              amount: result.transaction.amount,
            }
          : undefined,
      },
      'Payment verified successfully.'
    );
  } catch (err: any) {
    return sendError(res, 'VERIFICATION_ERROR', err.message, 500);
  }
});

/**
 * 5. POST /api/v1/payments/:paymentId/cancel
 * Cancels a pending payment
 */
router.post('/payments/:paymentId/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const merchantId = req.merchantId;

    const result = await Repository.cancelPayment(paymentId, merchantId);
    if (!result.success) {
      return sendError(res, result.error || 'CANCEL_FAILED', `Unable to cancel payment: ${result.error}`, 400);
    }

    if (result.payment) {
      WebhookService.dispatchPaymentEvent('payment.failed', result.payment).catch(() => {});
    }

    return sendSuccess(
      res,
      {
        paymentId: result.payment?.paymentId || paymentId,
        status: 'CANCELLED',
      },
      'Payment session has been cancelled.'
    );
  } catch (err: any) {
    return sendError(res, 'CANCEL_ERROR', err.message, 500);
  }
});

/**
 * 6. GET /api/v1/transactions
 * Lists transactions for the authenticated merchant
 */
router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_demo_101';
    const transactions = await Repository.getTransactionsByMerchant(merchantId);

    const { limit = '50', provider, status } = req.query;
    let filtered = transactions;

    if (provider && typeof provider === 'string') {
      filtered = filtered.filter((t) => t.provider === provider.toUpperCase());
    }
    if (status && typeof status === 'string') {
      filtered = filtered.filter((t) => t.status === status.toUpperCase());
    }

    const maxLimit = Math.min(parseInt(limit as string, 10) || 50, 100);
    const paginated = filtered.slice(0, maxLimit);

    // Sanitized transactions (do not leak raw SMS body or internal device IDs)
    const sanitized = paginated.map((t) => ({
      transactionId: t.id,
      trxId: t.trxId,
      provider: t.provider,
      amount: t.amount,
      currency: 'BDT',
      status: t.status,
      used: t.used,
      usedForPaymentId: t.usedForPaymentId,
      timestamp: t.smsTimestamp,
      createdAt: t.createdAt,
    }));

    return sendSuccess(res, sanitized);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

/**
 * 7. GET /api/v1/transactions/:transactionId
 * Retrieves single transaction by ID or TrxID
 */
router.get('/transactions/:transactionId', async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const merchantId = req.merchantId || 'merch_demo_101';

    let trx = await Repository.getTransactionById(transactionId);
    if (!trx) {
      trx = await Repository.findTransactionByTrxId(transactionId);
    }

    if (!trx) {
      return sendError(res, 'TRANSACTION_NOT_FOUND', 'Transaction not found.', 404);
    }

    if (trx.merchantId !== merchantId && req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      return sendError(res, 'FORBIDDEN', 'Access denied to this transaction.', 403);
    }

    return sendSuccess(res, {
      transactionId: trx.id,
      trxId: trx.trxId,
      provider: trx.provider,
      amount: trx.amount,
      currency: 'BDT',
      status: trx.status,
      used: trx.used,
      usedForPaymentId: trx.usedForPaymentId,
      timestamp: trx.smsTimestamp,
      createdAt: trx.createdAt,
    });
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

/**
 * 8. GET /api/v1/merchant/profile
 * Returns authenticated merchant profile
 */
router.get('/merchant/profile', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_demo_101';
    const merchant = await Repository.findMerchantById(merchantId);

    if (!merchant) {
      return sendError(res, 'MERCHANT_NOT_FOUND', 'Merchant profile not found.', 404);
    }

    return sendSuccess(res, {
      merchantId: merchant.id,
      businessName: merchant.businessName,
      ownerName: merchant.ownerName,
      email: merchant.email,
      phone: merchant.phone,
      status: merchant.status,
      webhookUrl: merchant.webhookUrl,
      mode: req.apiKeyMode || 'live',
      createdAt: merchant.createdAt,
    });
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

/**
 * 9. GET /api/v1/merchant/wallets
 * Returns configured merchant wallets
 */
router.get('/merchant/wallets', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_demo_101';
    const wallets = await Repository.getWalletsByMerchant(merchantId);

    // Sanitize: do not leak raw device pairing tokens or secret fields
    const sanitized = wallets.map((w) => ({
      walletId: w.id,
      provider: w.provider,
      walletNumber: w.walletNumber,
      walletType: w.walletType,
      status: w.status,
      displayName: w.displayName,
    }));

    return sendSuccess(res, sanitized);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

/**
 * 10. GET /api/v1/webhooks
 * Returns webhook delivery logs for the merchant
 */
router.get('/webhooks', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_demo_101';
    const webhooks = await Repository.getWebhooksByMerchant(merchantId);

    const sanitized = webhooks.map((w: any) => ({
      id: w.id,
      paymentId: w.paymentId,
      event: w.event,
      endpoint: w.endpoint,
      status: w.status,
      attempts: w.attempts,
      responseCode: w.responseCode,
      nextAttemptAt: w.nextAttemptAt,
      createdAt: w.createdAt,
      lastAttemptAt: w.lastAttemptAt,
    }));

    return sendSuccess(res, sanitized);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message, 500);
  }
});

/**
 * 11. POST /api/v1/webhooks/test
 * Sends a test ping webhook to test merchant webhook listeners
 */
router.post('/webhooks/test', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_demo_101';
    const { testUrl } = req.body;

    const result = await WebhookService.sendTestWebhook(merchantId, testUrl);
    return sendSuccess(res, result, result.success ? 'Test webhook delivered successfully' : 'Test webhook delivery failed');
  } catch (err: any) {
    return sendError(res, 'TEST_WEBHOOK_FAILED', err.message, 500);
  }
});

export default router;
