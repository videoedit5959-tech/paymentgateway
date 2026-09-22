import { Router } from 'express';
import { authenticateMerchant } from '../middleware/auth.js';
import { BillingService } from '../services/billingService.js';
import { Repository } from '../db/repository.js';
import { BillingCycle } from '../../src/types/index.js';

const router = Router();

// GET /api/billing/subscription - Get merchant's current subscription, plan, and real-time usage vs limits
router.get('/subscription', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const details = await BillingService.getMerchantSubscriptionDetails(merchantId);
    res.json({ success: true, data: details });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'BILLING_FETCH_FAILED', message: error.message } });
  }
});

// GET /api/billing/plans - List public active subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await Repository.getPlans(false);
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'PLANS_FETCH_FAILED', message: error.message } });
  }
});

// POST /api/billing/subscribe - Select a plan / billing cycle and generate a billing invoice
router.post('/subscribe', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { planId, billingCycle } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_PLAN_ID', message: 'planId is required' } });
    }

    const invoice = await BillingService.createSubscriptionInvoice(
      merchantId,
      planId,
      (billingCycle as BillingCycle) || 'MONTHLY'
    );

    res.status(201).json({ success: true, data: invoice, message: 'Subscription invoice created successfully.' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'SUBSCRIPTION_ORDER_FAILED', message: error.message } });
  }
});

// GET /api/billing/invoices - List merchant invoices
router.get('/invoices', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const invoices = await Repository.getInvoicesByMerchant(merchantId);
    res.json({ success: true, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INVOICES_FETCH_FAILED', message: error.message } });
  }
});

// GET /api/billing/invoices/:id - Get single invoice
router.get('/invoices/:id', authenticateMerchant, async (req: any, res) => {
  try {
    const invoice = await Repository.getInvoiceById(req.params.id);
    if (!invoice || invoice.merchantId !== req.user.merchantId) {
      return res.status(404).json({ success: false, error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found' } });
    }
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INVOICE_FETCH_FAILED', message: error.message } });
  }
});

// POST /api/billing/invoices/:id/pay-manual - Submit manual payment reference & proof
router.post('/invoices/:id/pay-manual', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { paymentMethod, transactionReference, proofUrl } = req.body;

    if (!paymentMethod || !transactionReference) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PAYMENT_PROOF', message: 'paymentMethod and transactionReference are required' },
      });
    }

    const invoice = await BillingService.submitManualPayment(
      req.params.id,
      merchantId,
      paymentMethod,
      transactionReference,
      proofUrl
    );

    res.json({
      success: true,
      data: invoice,
      message: 'Payment submission received and queued for Super Admin review.',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'PAYMENT_SUBMIT_FAILED', message: error.message } });
  }
});

// POST /api/billing/subscription/cancel - Cancel auto-renew or cancel subscription
router.post('/subscription/cancel', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { immediate } = req.body;

    const sub = await Repository.getSubscriptionByMerchant(merchantId);
    if (!sub) {
      return res.status(404).json({ success: false, error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: 'No active subscription found' } });
    }

    const updated = await Repository.updateSubscription(sub.id, {
      cancelAtPeriodEnd: true,
      status: immediate ? 'CANCELLED' : sub.status,
    });

    res.json({
      success: true,
      data: updated,
      message: immediate
        ? 'Subscription cancelled immediately.'
        : 'Subscription will not auto-renew at the end of the current billing cycle.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'CANCEL_FAILED', message: error.message } });
  }
});

// GET /api/billing/usage - Monthly usage history
router.get('/usage', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const history = await Repository.getMerchantUsageHistory(merchantId, 12);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'USAGE_FETCH_FAILED', message: error.message } });
  }
});

export default router;
