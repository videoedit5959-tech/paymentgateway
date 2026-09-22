import { Router, Response } from 'express';
import { Repository, memoryDb } from '../db/repository.js';
import { authenticateJwt, requireRole, AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { WebhookService } from '../services/webhookService.js';
import { SupportService } from '../services/supportService.js';

const router = Router();

// Middleware: Admin or Super Admin only
router.use(authenticateJwt);
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

// 1. Admin System Overview & Metrics
router.get('/metrics', async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await Repository.getSystemOverviewMetrics();
    const merchants = await Repository.getAllMerchants();
    const settings = await Repository.getSystemSettings();

    return sendSuccess(res, {
      ...metrics,
      merchants,
      settings,
    });
  } catch (err: any) {
    return sendError(res, 'METRICS_FAILED', err.message);
  }
});

router.get('/overview', async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await Repository.getSystemOverviewMetrics();
    const settings = await Repository.getSystemSettings();

    return sendSuccess(res, {
      metrics,
      settings,
    });
  } catch (err: any) {
    return sendError(res, 'METRICS_FAILED', err.message);
  }
});

// 2. Operational Health & Live Queue Metrics
router.get('/operations', async (req: AuthRequest, res: Response) => {
  try {
    const [overview, devices, revenue, subscriptions] = await Promise.all([
      Repository.getSystemOverviewMetrics(),
      Repository.getAllDevices(),
      Repository.getRevenueMetrics(),
      Repository.getAllSubscriptions(),
    ]);

    const onlineDevices = devices.filter((d) => d.status === 'ONLINE').length;
    const offlineDevices = devices.length - onlineDevices;

    return sendSuccess(res, {
      systemOverview: overview,
      deviceHealth: {
        total: devices.length,
        online: onlineDevices,
        offline: offlineDevices,
        devices,
      },
      subscriptionHealth: {
        total: subscriptions.length,
        active: subscriptions.filter((s) => s.status === 'ACTIVE').length,
        trial: subscriptions.filter((s) => s.status === 'TRIAL').length,
        pastDue: subscriptions.filter((s) => s.status === 'PAST_DUE').length,
        suspended: subscriptions.filter((s) => s.status === 'SUSPENDED').length,
      },
      revenueSnapshot: revenue,
    });
  } catch (err: any) {
    return sendError(res, 'OPERATIONS_FETCH_FAILED', err.message);
  }
});

// 3. List & Manage Merchants
router.get('/merchants', async (req: AuthRequest, res: Response) => {
  try {
    const merchants = await Repository.getAllMerchants();
    return sendSuccess(res, merchants);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message);
  }
});

router.patch('/merchants/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const merchant = await Repository.getMerchantById(id);
    if (!merchant) return sendError(res, 'NOT_FOUND', 'Merchant not found', 404);

    const updated = await Repository.updateMerchant(id, { status });
    await Repository.createAuditLog({
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@paysync.local',
      actorRole: req.user?.role || 'SUPER_ADMIN',
      merchantId: merchant.id,
      action: `MERCHANT_STATUS_CHANGED_TO_${status}`,
      resourceType: 'MERCHANT',
      resourceId: merchant.id,
      ipAddress: req.ip,
    });

    return sendSuccess(res, updated, `Merchant status updated to ${status}`);
  } catch (err: any) {
    return sendError(res, 'UPDATE_FAILED', err.message);
  }
});

// 4. Payment Manual Review Queue
router.get('/review-queue', async (req: AuthRequest, res: Response) => {
  try {
    const payments = await Repository.getPaymentsForManualReview();
    return sendSuccess(res, payments);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message);
  }
});

router.post('/manual-review/:paymentId/decide', async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { action, notes } = req.body; // 'APPROVE' or 'REJECT'

    const payment = await Repository.getPaymentById(paymentId) || await Repository.getPaymentByPaymentId(paymentId);
    if (!payment) return sendError(res, 'NOT_FOUND', 'Payment not found', 404);

    if (action === 'APPROVE') {
      const updated = await Repository.updatePayment(payment.id, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      });

      await Repository.createAuditLog({
        actorId: req.user?.id || 'admin',
        actorEmail: req.user?.email || 'admin@paysync.local',
        actorRole: req.user?.role || 'SUPER_ADMIN',
        merchantId: payment.merchantId,
        action: 'MANUAL_PAYMENT_APPROVAL',
        resourceType: 'PAYMENT',
        resourceId: payment.paymentId,
        metadata: { notes },
        ipAddress: req.ip,
      });

      if (updated) {
        WebhookService.dispatchPaymentEvent('payment.completed', updated).catch(console.error);
      }

      return sendSuccess(res, updated, 'Payment manually approved and webhook sent');
    } else {
      const updated = await Repository.updatePayment(payment.id, {
        status: 'FAILED',
      });

      await Repository.createAuditLog({
        actorId: req.user?.id || 'admin',
        actorEmail: req.user?.email || 'admin@paysync.local',
        actorRole: req.user?.role || 'SUPER_ADMIN',
        merchantId: payment.merchantId,
        action: 'MANUAL_PAYMENT_REJECTION',
        resourceType: 'PAYMENT',
        resourceId: payment.paymentId,
        metadata: { notes },
        ipAddress: req.ip,
      });

      if (updated) {
        WebhookService.dispatchPaymentEvent('payment.failed', updated).catch(console.error);
      }

      return sendSuccess(res, updated, 'Payment manually rejected');
    }
  } catch (err: any) {
    return sendError(res, 'DECISION_FAILED', err.message);
  }
});

// 5. Subscription Plan Management (CRUD)
router.get('/plans', async (req: AuthRequest, res: Response) => {
  try {
    const plans = await Repository.getPlans(true);
    return sendSuccess(res, plans);
  } catch (err: any) {
    return sendError(res, 'PLANS_FETCH_FAILED', err.message);
  }
});

router.post('/plans', async (req: AuthRequest, res: Response) => {
  try {
    const plan = await Repository.createPlan(req.body);
    await Repository.createAuditLog({
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@paysync.local',
      actorRole: req.user?.role || 'SUPER_ADMIN',
      action: 'SUBSCRIPTION_PLAN_CREATED',
      resourceType: 'SUBSCRIPTION_PLAN',
      resourceId: plan.id,
      metadata: { planName: plan.name, slug: plan.slug },
      ipAddress: req.ip,
    });
    return sendSuccess(res, plan, 'Subscription plan created successfully');
  } catch (err: any) {
    return sendError(res, 'PLAN_CREATE_FAILED', err.message);
  }
});

router.put('/plans/:id', async (req: AuthRequest, res: Response) => {
  try {
    const updated = await Repository.updatePlan(req.params.id, req.body);
    if (!updated) return sendError(res, 'NOT_FOUND', 'Plan not found', 404);

    await Repository.createAuditLog({
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@paysync.local',
      actorRole: req.user?.role || 'SUPER_ADMIN',
      action: 'SUBSCRIPTION_PLAN_UPDATED',
      resourceType: 'SUBSCRIPTION_PLAN',
      resourceId: updated.id,
      metadata: req.body,
      ipAddress: req.ip,
    });

    return sendSuccess(res, updated, 'Subscription plan updated successfully');
  } catch (err: any) {
    return sendError(res, 'PLAN_UPDATE_FAILED', err.message);
  }
});

router.delete('/plans/:id', async (req: AuthRequest, res: Response) => {
  try {
    const success = await Repository.deletePlan(req.params.id);
    if (!success) return sendError(res, 'NOT_FOUND', 'Plan not found', 404);

    return sendSuccess(res, null, 'Subscription plan deleted');
  } catch (err: any) {
    return sendError(res, 'PLAN_DELETE_FAILED', err.message);
  }
});

// 6. Merchant Subscription Operations
router.get('/subscriptions', async (req: AuthRequest, res: Response) => {
  try {
    const subscriptions = await Repository.getAllSubscriptions();
    const merchants = await Repository.getAllMerchants();
    const plans = await Repository.getPlans(true);

    const enriched = subscriptions.map((sub) => {
      const merchant = merchants.find((m) => m.id === sub.merchantId);
      const plan = plans.find((p) => p.id === sub.planId || p.slug === sub.planSlug);
      return {
        ...sub,
        merchantName: merchant?.businessName || sub.merchantId,
        merchantEmail: merchant?.email,
        planTitle: plan?.name || sub.planName,
      };
    });

    return sendSuccess(res, enriched);
  } catch (err: any) {
    return sendError(res, 'SUBSCRIPTIONS_FETCH_FAILED', err.message);
  }
});

router.patch('/subscriptions/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const updated = await Repository.updateSubscription(req.params.id, { status });
    if (!updated) return sendError(res, 'NOT_FOUND', 'Subscription not found', 404);

    await Repository.createAuditLog({
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@paysync.local',
      actorRole: req.user?.role || 'SUPER_ADMIN',
      merchantId: updated.merchantId,
      action: `SUBSCRIPTION_STATUS_CHANGED_TO_${status}`,
      resourceType: 'MERCHANT_SUBSCRIPTION',
      resourceId: updated.id,
      ipAddress: req.ip,
    });

    return sendSuccess(res, updated, `Subscription status set to ${status}`);
  } catch (err: any) {
    return sendError(res, 'SUBSCRIPTION_UPDATE_FAILED', err.message);
  }
});

router.post('/subscriptions/:id/change-plan', async (req: AuthRequest, res: Response) => {
  try {
    const { planId, billingCycle } = req.body;
    const plan = await Repository.getPlanById(planId) || await Repository.getPlanBySlug(planId);
    if (!plan) return sendError(res, 'PLAN_NOT_FOUND', 'Plan not found', 404);

    const price = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
    const durationDays = billingCycle === 'YEARLY' ? 365 : 30;

    const updated = await Repository.updateSubscription(req.params.id, {
      planId: plan.id,
      planSlug: plan.slug,
      planName: plan.name,
      billingCycle: billingCycle || 'MONTHLY',
      status: 'ACTIVE',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + durationDays * 86400000).toISOString(),
      pricePaid: price,
    });

    return sendSuccess(res, updated, `Merchant migrated to ${plan.name} successfully.`);
  } catch (err: any) {
    return sendError(res, 'PLAN_CHANGE_FAILED', err.message);
  }
});

router.post('/subscriptions/:id/grant-trial', async (req: AuthRequest, res: Response) => {
  try {
    const { days = 14 } = req.body;
    const trialEndsAt = new Date(Date.now() + Number(days) * 86400000).toISOString();

    const updated = await Repository.updateSubscription(req.params.id, {
      status: 'TRIAL',
      trialEndsAt,
      currentPeriodEnd: trialEndsAt,
    });

    return sendSuccess(res, updated, `Granted ${days} days extended trial.`);
  } catch (err: any) {
    return sendError(res, 'GRANT_TRIAL_FAILED', err.message);
  }
});

// 7. Billing Invoices Queue & 1-Click Approval
router.get('/invoices', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const invoices = await Repository.getAllInvoices(status as string);
    const merchants = await Repository.getAllMerchants();

    const enriched = invoices.map((inv) => {
      const merchant = merchants.find((m) => m.id === inv.merchantId);
      return {
        ...inv,
        merchantName: merchant?.businessName || inv.merchantId,
        merchantEmail: merchant?.email,
      };
    });

    return sendSuccess(res, enriched);
  } catch (err: any) {
    return sendError(res, 'INVOICES_FETCH_FAILED', err.message);
  }
});

router.post('/invoices/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const reviewerId = req.user?.email || 'admin@paysync.local';

    const result = await Repository.approveManualInvoiceAtomically(req.params.id, reviewerId, notes);
    if (!result.success) {
      return sendError(res, result.error || 'APPROVE_FAILED', result.error || 'Failed to approve invoice', 400);
    }

    return sendSuccess(res, result, 'Manual invoice payment approved & subscription activated instantly.');
  } catch (err: any) {
    return sendError(res, 'INVOICE_APPROVAL_FAILED', err.message);
  }
});

router.post('/invoices/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const reviewerId = req.user?.email || 'admin@paysync.local';

    const updated = await Repository.updateInvoice(req.params.id, {
      status: 'CANCELLED',
      reviewer: reviewerId,
      reviewNotes: notes || 'Manual payment proof was rejected or invalid.',
      reviewedAt: new Date().toISOString(),
    });

    await Repository.createAuditLog({
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@paysync.local',
      actorRole: 'SUPER_ADMIN',
      merchantId: updated?.merchantId,
      action: 'REJECT_MANUAL_INVOICE',
      resourceType: 'BILLING_INVOICE',
      resourceId: req.params.id,
      metadata: { notes },
    });

    return sendSuccess(res, updated, 'Invoice marked as rejected.');
  } catch (err: any) {
    return sendError(res, 'REJECT_FAILED', err.message);
  }
});

// 8. Revenue & Financial Reconciliation
router.get('/revenue', async (req: AuthRequest, res: Response) => {
  try {
    const revenue = await Repository.getRevenueMetrics();
    return sendSuccess(res, revenue);
  } catch (err: any) {
    return sendError(res, 'REVENUE_FETCH_FAILED', err.message);
  }
});

router.get('/reconciliation', async (req: AuthRequest, res: Response) => {
  try {
    const reconciliation = await Repository.getReconciliationSummary();
    return sendSuccess(res, reconciliation);
  } catch (err: any) {
    return sendError(res, 'RECONCILIATION_FETCH_FAILED', err.message);
  }
});

// 9. Support Tickets (Super Admin Management)
router.get('/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await Repository.getAllTickets();
    const merchants = await Repository.getAllMerchants();

    const enriched = tickets.map((t) => {
      const merchant = merchants.find((m) => m.id === t.merchantId);
      return {
        ...t,
        merchantName: merchant?.businessName || t.merchantId,
        merchantEmail: merchant?.email,
      };
    });

    return sendSuccess(res, enriched);
  } catch (err: any) {
    return sendError(res, 'TICKETS_FETCH_FAILED', err.message);
  }
});

router.post('/tickets/:id/reply', async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) return sendError(res, 'MISSING_MESSAGE', 'Message content is required', 400);

    const updated = await SupportService.replyTicket(req.params.id, {
      senderId: req.user?.id || 'admin',
      senderName: 'PaySync Support Desk',
      senderRole: 'SUPER_ADMIN',
      message,
    });

    return sendSuccess(res, updated, 'Reply posted to ticket.');
  } catch (err: any) {
    return sendError(res, 'REPLY_FAILED', err.message);
  }
});

router.patch('/tickets/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const updated = await Repository.updateTicketStatus(req.params.id, status);
    return sendSuccess(res, updated, `Ticket marked as ${status}`);
  } catch (err: any) {
    return sendError(res, 'STATUS_UPDATE_FAILED', err.message);
  }
});

// 10. Fraud Events & Audit Logs
router.get('/fraud', async (req: AuthRequest, res: Response) => {
  try {
    const events = await Repository.getFraudEvents();
    return sendSuccess(res, events);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message);
  }
});

router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await Repository.getAuditLogs();
    return sendSuccess(res, logs);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message);
  }
});

// 11. Platform Settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await Repository.getSystemSettings();
    return sendSuccess(res, settings);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message);
  }
});

router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const updated = await Repository.updateSystemSettings(req.body);
    await Repository.createAuditLog({
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@paysync.local',
      actorRole: req.user?.role || 'SUPER_ADMIN',
      action: 'SYSTEM_SETTINGS_UPDATED',
      resourceType: 'SETTINGS',
      metadata: req.body,
      ipAddress: req.ip,
    });
    return sendSuccess(res, updated, 'System settings updated successfully');
  } catch (err: any) {
    return sendError(res, 'UPDATE_FAILED', err.message);
  }
});

export default router;
