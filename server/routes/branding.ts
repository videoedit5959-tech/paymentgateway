import { Router } from 'express';
import { authenticateMerchant } from '../middleware/auth.js';
import { Repository } from '../db/repository.js';
import { BillingService } from '../services/billingService.js';

const router = Router();

// GET /api/branding - Get merchant branding
router.get('/', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    let branding = await Repository.getBrandingByMerchant(merchantId);
    if (!branding) {
      const merchant = await Repository.getMerchantById(merchantId);
      branding = {
        id: `brand_${merchantId}`,
        merchantId,
        businessName: merchant?.businessName || '',
        primaryColor: '#059669',
        accentColor: '#047857',
        showWatermark: true,
        updatedAt: new Date().toISOString(),
      };
    }
    res.json({ success: true, data: branding });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'BRANDING_FETCH_FAILED', message: error.message } });
  }
});

// PUT /api/branding - Update branding
router.put('/', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { logoUrl, businessName, faviconUrl, primaryColor, accentColor, supportEmail, supportPhone, customCss, showWatermark } = req.body;

    const details = await BillingService.getMerchantSubscriptionDetails(merchantId);
    const hasWhiteLabel = details.plan.features.includes('WHITE_LABEL');

    const updated = await Repository.saveBranding(merchantId, {
      logoUrl,
      businessName,
      faviconUrl,
      primaryColor: primaryColor || '#059669',
      accentColor: accentColor || '#047857',
      supportEmail,
      supportPhone,
      customCss: hasWhiteLabel ? customCss : undefined,
      showWatermark: hasWhiteLabel ? (showWatermark !== undefined ? showWatermark : false) : true,
    });

    res.json({ success: true, data: updated, message: 'Branding settings updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'BRANDING_UPDATE_FAILED', message: error.message } });
  }
});

// GET /api/branding/public/:merchantId - Public branding endpoint for hosted checkout UI
router.get('/public/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const branding = await Repository.getBrandingByMerchant(merchantId);
    const merchant = await Repository.getMerchantById(merchantId);

    if (!merchant) {
      return res.status(404).json({ success: false, error: { code: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' } });
    }

    res.json({
      success: true,
      data: {
        businessName: branding?.businessName || merchant.businessName,
        logoUrl: branding?.logoUrl,
        faviconUrl: branding?.faviconUrl,
        primaryColor: branding?.primaryColor || '#059669',
        accentColor: branding?.accentColor || '#047857',
        supportEmail: branding?.supportEmail || merchant.email,
        supportPhone: branding?.supportPhone || merchant.phone,
        showWatermark: branding ? branding.showWatermark : true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'PUBLIC_BRANDING_FAILED', message: error.message } });
  }
});

export default router;
