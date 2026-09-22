import { Router } from 'express';
import { authenticateMerchant } from '../middleware/auth.js';
import { DomainService } from '../services/domainService.js';
import { Repository } from '../db/repository.js';
import { BillingService } from '../services/billingService.js';

const router = Router();

// GET /api/domains - List domains for merchant
router.get('/', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const domains = await Repository.getDomainsByMerchant(merchantId);
    res.json({ success: true, data: domains });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'DOMAINS_FETCH_FAILED', message: error.message } });
  }
});

// POST /api/domains - Add custom domain
router.post('/', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DOMAIN', message: 'Domain name is required' } });
    }

    // Check if plan allows custom domain
    const details = await BillingService.getMerchantSubscriptionDetails(merchantId);
    if (!details.plan.features.includes('CUSTOM_DOMAIN')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_IN_PLAN',
          message: 'Custom domain mapping requires Business Growth or Enterprise plan.',
        },
      });
    }

    const created = await DomainService.addDomain(merchantId, domain);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Custom domain registered. Add the TXT verification record to your DNS host.',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'DOMAIN_ADD_FAILED', message: error.message } });
  }
});

// POST /api/domains/:id/verify - Trigger DNS verification
router.post('/:id/verify', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const result = await DomainService.verifyDomain(req.params.id, merchantId);
    res.json({ success: result.verified, data: result.domain, message: result.message });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'VERIFICATION_FAILED', message: error.message } });
  }
});

// DELETE /api/domains/:id - Delete custom domain
router.delete('/:id', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const success = await Repository.deleteDomain(req.params.id, merchantId);
    if (!success) {
      return res.status(404).json({ success: false, error: { code: 'DOMAIN_NOT_FOUND', message: 'Domain not found' } });
    }
    res.json({ success: true, message: 'Custom domain removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'DELETE_FAILED', message: error.message } });
  }
});

export default router;
