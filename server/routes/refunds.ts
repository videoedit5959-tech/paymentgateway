import { Router } from 'express';
import { authenticateMerchant } from '../middleware/auth.js';
import { Repository } from '../db/repository.js';

const router = Router();

// GET /api/refunds - List merchant refunds
router.get('/', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const refunds = await Repository.getRefundsByMerchant(merchantId);
    res.json({ success: true, data: refunds });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'REFUNDS_FETCH_FAILED', message: error.message } });
  }
});

// POST /api/refunds - Request / Record a manual refund
router.post('/', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { paymentId, amount, provider, customerPhone, reason, externalReference, notes } = req.body;

    if (!paymentId || !amount || !reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'paymentId, amount, and reason are required' },
      });
    }

    const refund = await Repository.createRefund({
      merchantId,
      paymentId,
      amount: Number(amount),
      provider: provider || 'BKASH',
      customerPhone,
      reason,
      externalReference,
      operator: req.user.name || 'Merchant Staff',
      notes,
    });

    res.status(201).json({ success: true, data: refund, message: 'Refund record logged successfully.' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'REFUND_CREATE_FAILED', message: error.message } });
  }
});

export default router;
