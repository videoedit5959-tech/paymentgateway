import { Repository } from '../db/repository.js';
import {
  IMerchantSubscription,
  ISubscriptionPlan,
  IBillingInvoice,
  IUsageRecord,
  BillingCycle,
} from '../../src/types/index.js';

export class BillingService {
  /**
   * Helper to get current YYYY-MM
   */
  static getCurrentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get or initialize merchant subscription & live limits vs usage
   */
  static async getMerchantSubscriptionDetails(merchantId: string): Promise<{
    subscription: IMerchantSubscription;
    plan: ISubscriptionPlan;
    usage: IUsageRecord;
    limits: {
      volume: { current: number; limit: number; percentage: number; isExceeded: boolean };
      apiRequests: { current: number; limit: number; percentage: number; isExceeded: boolean };
      devices: { current: number; limit: number; percentage: number; isExceeded: boolean };
      wallets: { current: number; limit: number; percentage: number; isExceeded: boolean };
      teamMembers: { current: number; limit: number; percentage: number; isExceeded: boolean };
    };
    trialDaysRemaining?: number;
  }> {
    let subscription = await Repository.getSubscriptionByMerchant(merchantId);
    let plan: ISubscriptionPlan | null = null;

    if (!subscription) {
      // Auto-provision 14-day Starter trial for new merchants
      const defaultPlan = (await Repository.getPlanBySlug('starter')) || (await Repository.getPlans())[0];
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 14 * 86400000);

      subscription = await Repository.createSubscription({
        merchantId,
        planId: defaultPlan.id,
        planSlug: defaultPlan.slug,
        planName: defaultPlan.name,
        billingCycle: 'MONTHLY',
        status: 'TRIAL',
        startDate: now.toISOString(),
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: trialEndsAt.toISOString(),
        trialEndsAt: trialEndsAt.toISOString(),
        cancelAtPeriodEnd: false,
        pricePaid: 0,
        currency: 'BDT',
      });
      plan = defaultPlan;
    } else {
      plan = (await Repository.getPlanById(subscription.planId)) || (await Repository.getPlanBySlug(subscription.planSlug));
      if (!plan) {
        plan = (await Repository.getPlans())[0];
      }
    }

    const yearMonth = this.getCurrentYearMonth();
    let usage = await Repository.getUsageRecord(merchantId, yearMonth);
    if (!usage) {
      usage = {
        id: `usage_${merchantId}_${yearMonth}`,
        merchantId,
        yearMonth,
        paymentVolume: 0,
        paymentCount: 0,
        apiRequests: 0,
        apiRequestsSuccessful: 0,
        apiRequestsFailed: 0,
        paymentsCreated: 0,
        paymentsVerified: 0,
        statusPolls: 0,
        webhookDispatches: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Active resources count
    const [devices, wallets, teamMembers] = await Promise.all([
      Repository.getDevicesByMerchant(merchantId),
      Repository.getWalletsByMerchant(merchantId),
      Repository.getTeamMembers(merchantId),
    ]);

    const volumeLimit = plan.limits.monthlyVolumeLimit || 100000;
    const apiLimit = plan.limits.monthlyApiRequestsLimit || 5000;
    const devLimit = plan.limits.deviceLimit || 2;
    const walLimit = plan.limits.walletLimit || 2;
    const teamLimit = plan.limits.teamMembersLimit || 2;

    const volumePercentage = Math.min(100, Math.round(((usage.paymentVolume || 0) / volumeLimit) * 100));
    const apiPercentage = Math.min(100, Math.round(((usage.apiRequests || 0) / apiLimit) * 100));
    const devPercentage = Math.min(100, Math.round((devices.length / devLimit) * 100));
    const walPercentage = Math.min(100, Math.round((wallets.length / walLimit) * 100));
    const teamPercentage = Math.min(100, Math.round((teamMembers.length / teamLimit) * 100));

    let trialDaysRemaining: number | undefined;
    if (subscription.status === 'TRIAL' && subscription.trialEndsAt) {
      const diffMs = new Date(subscription.trialEndsAt).getTime() - Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / 86400000));
    }

    return {
      subscription,
      plan,
      usage,
      limits: {
        volume: {
          current: usage.paymentVolume || 0,
          limit: volumeLimit,
          percentage: volumePercentage,
          isExceeded: (usage.paymentVolume || 0) >= volumeLimit,
        },
        apiRequests: {
          current: usage.apiRequests || 0,
          limit: apiLimit,
          percentage: apiPercentage,
          isExceeded: (usage.apiRequests || 0) >= apiLimit,
        },
        devices: {
          current: devices.length,
          limit: devLimit,
          percentage: devPercentage,
          isExceeded: devices.length >= devLimit,
        },
        wallets: {
          current: wallets.length,
          limit: walLimit,
          percentage: walPercentage,
          isExceeded: wallets.length >= walLimit,
        },
        teamMembers: {
          current: teamMembers.length,
          limit: teamLimit,
          percentage: teamPercentage,
          isExceeded: teamMembers.length >= teamLimit,
        },
      },
      trialDaysRemaining,
    };
  }

  /**
   * Enforce Subscription & Resource Limits Server-Side
   */
  static async checkSubscriptionLimits(
    merchantId: string,
    action: 'CREATE_PAYMENT' | 'API_REQUEST' | 'ADD_DEVICE' | 'ADD_WALLET' | 'ADD_STAFF',
    additionalVolumeAmount: number = 0
  ): Promise<{ allowed: boolean; code?: string; message?: string; details?: any }> {
    const details = await this.getMerchantSubscriptionDetails(merchantId);
    const { subscription, plan, usage, limits } = details;

    // Subscription status validation
    if (subscription.status === 'SUSPENDED') {
      return {
        allowed: false,
        code: 'SUBSCRIPTION_SUSPENDED',
        message: 'Your merchant account subscription is currently suspended. Please renew your plan or contact support.',
      };
    }

    if (subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') {
      return {
        allowed: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Please select a plan to resume operations.',
      };
    }

    if (subscription.status === 'TRIAL' && details.trialDaysRemaining !== undefined && details.trialDaysRemaining <= 0) {
      return {
        allowed: false,
        code: 'TRIAL_EXPIRED',
        message: 'Your 14-day free trial has expired. Please subscribe to an active plan to continue.',
      };
    }

    // Action-specific limits
    if (action === 'CREATE_PAYMENT') {
      const prospectiveVolume = (usage.paymentVolume || 0) + additionalVolumeAmount;
      if (prospectiveVolume > plan.limits.monthlyVolumeLimit) {
        return {
          allowed: false,
          code: 'MONTHLY_VOLUME_LIMIT_EXCEEDED',
          message: `Monthly payment volume limit (${plan.limits.monthlyVolumeLimit.toLocaleString()} BDT) exceeded for ${plan.name} plan. Current: ${usage.paymentVolume.toLocaleString()} BDT. Please upgrade to a higher tier plan.`,
          details: {
            currentVolume: usage.paymentVolume,
            limit: plan.limits.monthlyVolumeLimit,
            attemptedAmount: additionalVolumeAmount,
          },
        };
      }
    } else if (action === 'API_REQUEST') {
      if ((usage.apiRequests || 0) >= plan.limits.monthlyApiRequestsLimit) {
        return {
          allowed: false,
          code: 'API_REQUEST_LIMIT_EXCEEDED',
          message: `Monthly API request quota (${plan.limits.monthlyApiRequestsLimit.toLocaleString()}) reached. Upgrade your plan for higher throughput.`,
          details: {
            currentRequests: usage.apiRequests,
            limit: plan.limits.monthlyApiRequestsLimit,
          },
        };
      }
    } else if (action === 'ADD_DEVICE') {
      if (limits.devices.current >= plan.limits.deviceLimit) {
        return {
          allowed: false,
          code: 'DEVICE_LIMIT_REACHED',
          message: `You have reached the maximum allowed devices (${plan.limits.deviceLimit}) for the ${plan.name} plan. Upgrade to connect more Android gateways.`,
        };
      }
    } else if (action === 'ADD_WALLET') {
      if (limits.wallets.current >= plan.limits.walletLimit) {
        return {
          allowed: false,
          code: 'WALLET_LIMIT_REACHED',
          message: `You have reached the maximum allowed wallets (${plan.limits.walletLimit}) for the ${plan.name} plan. Upgrade your subscription to add more numbers.`,
        };
      }
    } else if (action === 'ADD_STAFF') {
      if (limits.teamMembers.current >= plan.limits.teamMembersLimit) {
        return {
          allowed: false,
          code: 'TEAM_LIMIT_REACHED',
          message: `You have reached the maximum allowed team members (${plan.limits.teamMembersLimit}) for the ${plan.name} plan. Upgrade to invite more staff.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Increment API usage counter asynchronously
   */
  static async recordApiUsage(merchantId: string, isSuccess: boolean): Promise<void> {
    try {
      const yearMonth = this.getCurrentYearMonth();
      await Repository.incrementUsage(merchantId, yearMonth, {
        apiRequests: 1,
        apiRequestsSuccessful: isSuccess ? 1 : 0,
        apiRequestsFailed: isSuccess ? 0 : 1,
      });
    } catch (e) {
      console.error('Failed to record API usage:', e);
    }
  }

  /**
   * Increment volume counter upon payment completion
   */
  static async recordPaymentCompletion(merchantId: string, amount: number): Promise<void> {
    try {
      const yearMonth = this.getCurrentYearMonth();
      await Repository.incrementUsage(merchantId, yearMonth, {
        paymentVolume: amount,
        paymentCount: 1,
        paymentsVerified: 1,
      });
    } catch (e) {
      console.error('Failed to record payment volume:', e);
    }
  }

  /**
   * Calculate Platform Fee & Merchant Net
   */
  static calculatePlatformFee(
    plan: ISubscriptionPlan,
    amount: number
  ): { platformFee: number; merchantNetAmount: number; percentage: number } {
    const feeConfig = plan.platformFee || { percentage: 1.0, fixedFee: 0 };
    const percentage = feeConfig.percentage || 1.0;
    const fixedFee = feeConfig.fixedFee || 0;

    const platformFee = Math.round(((amount * percentage) / 100 + fixedFee) * 100) / 100;
    const merchantNetAmount = Math.max(0, Math.round((amount - platformFee) * 100) / 100);

    return { platformFee, merchantNetAmount, percentage };
  }

  /**
   * Generate Invoice for Plan Subscription or Upgrade
   */
  static async createSubscriptionInvoice(
    merchantId: string,
    planId: string,
    billingCycle: BillingCycle = 'MONTHLY'
  ): Promise<IBillingInvoice> {
    const plan = await Repository.getPlanById(planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    const amount = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
    const now = new Date();
    const durationDays = billingCycle === 'YEARLY' ? 365 : 30;
    const periodEnd = new Date(now.getTime() + durationDays * 86400000);
    const dueDate = new Date(now.getTime() + 7 * 86400000);

    const invoiceNumber = `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return await Repository.createInvoice({
      invoiceNumber,
      merchantId,
      planId: plan.id,
      planName: plan.name,
      amount,
      currency: plan.currency || 'BDT',
      billingPeriodStart: now.toISOString(),
      billingPeriodEnd: periodEnd.toISOString(),
      status: 'DRAFT',
      issueDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
    });
  }

  /**
   * Submit Manual Payment Proof for Invoice
   */
  static async submitManualPayment(
    invoiceId: string,
    merchantId: string,
    paymentMethod: 'MANUAL_BKASH' | 'MANUAL_NAGAD' | 'MANUAL_BANK',
    transactionReference: string,
    proofUrl?: string
  ): Promise<IBillingInvoice> {
    const invoice = await Repository.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    if (invoice.merchantId !== merchantId) {
      throw new Error('Unauthorized access to invoice');
    }
    if (invoice.status === 'PAID') {
      throw new Error('Invoice has already been paid and verified');
    }

    const updated = await Repository.updateInvoice(invoiceId, {
      status: 'PENDING',
      paymentMethod,
      transactionReference: transactionReference.trim().toUpperCase(),
      proofUrl,
    });

    return updated!;
  }
}
