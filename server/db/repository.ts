import {
  UserModel,
  MerchantModel,
  WalletModel,
  DeviceModel,
  TransactionModel,
  PaymentModel,
  ApiKeyModel,
  WebhookLogModel,
  AuditLogModel,
  FraudEventModel,
  SystemSettingsModel,
  DeviceNonceModel,
  IdempotencyModel,
  SubscriptionPlanModel,
  MerchantSubscriptionModel,
  BillingInvoiceModel,
  UsageRecordModel,
  MerchantDomainModel,
  MerchantBrandingModel,
  TeamInvitationModel,
  SupportTicketModel,
  ManualRefundModel,
  AndroidReleaseModel,
} from '../models/index.js';
import {
  IUser,
  IMerchant,
  IWallet,
  IDevice,
  ITransaction,
  IPayment,
  IApiKey,
  IWebhookLog,
  IAuditLog,
  IFraudEvent,
  ISystemSettings,
  ISubscriptionPlan,
  IMerchantSubscription,
  IBillingInvoice,
  IUsageRecord,
  IMerchantDomain,
  IMerchantBranding,
  ITeamInvitation,
  ISupportTicket,
  ISupportTicketMessage,
  IManualRefund,
  IAndroidRelease,
} from '../../src/types/index.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { isProductionStrictMode } from './connect.js';
import { AndroidReleaseService } from '../services/androidReleaseService.js';

function assertDatabaseOperational() {
  if (isProductionStrictMode() && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
    const err: any = new Error('Database service unavailable in production mode.');
    err.statusCode = 503;
    err.code = 'SERVICE_UNAVAILABLE';
    throw err;
  }
}

// In-Memory fallback store with seeded defaults
class MemoryStore {
  users: IUser[] = [];
  merchants: IMerchant[] = [];
  wallets: IWallet[] = [];
  devices: IDevice[] = [];
  transactions: ITransaction[] = [];
  payments: IPayment[] = [];
  apiKeys: IApiKey[] = [];
  webhooks: IWebhookLog[] = [];
  auditLogs: IAuditLog[] = [];
  fraudEvents: IFraudEvent[] = [];
  plans: ISubscriptionPlan[] = [];
  subscriptions: IMerchantSubscription[] = [];
  invoices: IBillingInvoice[] = [];
  usageRecords: IUsageRecord[] = [];
  domains: IMerchantDomain[] = [];
  brandings: IMerchantBranding[] = [];
  teamInvitations: ITeamInvitation[] = [];
  supportTickets: ISupportTicket[] = [];
  manualRefunds: IManualRefund[] = [];
  androidReleases: IAndroidRelease[] = [];
  settings: ISystemSettings = {
    bkashEnabled: true,
    nagadEnabled: true,
    autoMatchingEnabled: true,
    balanceVerificationEnabled: false,
    minPaymentAmount: 10,
    maxPaymentAmount: 100000,
    paymentExpirationMinutes: 30,
    maxVerificationAttempts: 5,
    webhookMaxRetries: 5,
    maintenanceMode: false,
    trialEnabled: true,
    trialDays: 14,
    gracePeriodDays: 3,
    platformName: 'PaySync MFS Gateway',
    supportEmail: 'support@paysync.io',
    supportPhone: '+880 1700-000000',
    defaultCurrency: 'BDT',
    defaultTimezone: 'Asia/Dhaka',
    platformFeePercentage: 1.0,
    platformFeeFixed: 0,
  };

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const passwordHash = bcrypt.hashSync('Admin@12345', 10);
    const merchantPasswordHash = bcrypt.hashSync('Merchant@12345', 10);

    // Default Super Admin
    this.users.push({
      id: 'usr_superadmin',
      name: 'System Super Admin',
      email: 'admin@paysync.local',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Default Merchant Owner
    const merchantId = 'merch_demo_101';
    this.merchants.push({
      id: merchantId,
      businessName: 'Dhaka Digital Commerce Ltd',
      ownerName: 'Tanvir Ahmed',
      email: 'tanvir@dhakadigital.com',
      phone: '01711000111',
      businessType: 'E-commerce & SaaS',
      address: 'Gulshan-2, Dhaka, Bangladesh',
      website: 'https://dhakadigital.com',
      status: 'ACTIVE',
      webhookUrl: 'https://webhook.site/demo-endpoint',
      webhookSecret: 'whsec_demo_secret_key_8829',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.users.push({
      id: 'usr_merchant_owner',
      name: 'Tanvir Ahmed',
      email: 'merchant@paysync.local',
      role: 'MERCHANT_OWNER',
      merchantId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.users.push({
      id: 'usr_demo_finance',
      name: 'Farhan Rahman',
      email: 'finance@dhakadigital.com',
      role: 'MERCHANT_FINANCE',
      merchantId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Wallets
    const bKashWalletId = 'wal_bkash_01';
    const nagadWalletId = 'wal_nagad_01';
    this.wallets.push(
      {
        id: bKashWalletId,
        merchantId,
        provider: 'BKASH',
        walletNumber: '01711998877',
        walletType: 'MERCHANT',
        displayName: 'bKash Primary Merchant',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        currentBalance: 42500,
        lastBalanceUpdate: new Date().toISOString(),
        deviceId: 'dev_galaxy_a54',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: nagadWalletId,
        merchantId,
        provider: 'NAGAD',
        walletNumber: '01822334455',
        walletType: 'PERSONAL',
        displayName: 'Nagad Backup Personal',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        currentBalance: 18200,
        lastBalanceUpdate: new Date().toISOString(),
        deviceId: 'dev_pixel_7',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    // Devices
    this.devices.push(
      {
        id: 'dev_galaxy_a54',
        deviceId: 'GALAXY-A54-BKASH',
        deviceToken: 'dtok_demo_simulation',
        merchantId,
        walletId: bKashWalletId,
        provider: 'BKASH',
        deviceName: 'Samsung Galaxy A54 (SIM 1 - bKash)',
        status: 'ONLINE',
        appVersion: '1.2.0',
        androidVersion: '14',
        batteryLevel: 94,
        networkStatus: 'WIFI',
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'dev_pixel_7',
        deviceId: 'PIXEL-7-NAGAD',
        deviceToken: 'dtok_demo_simulation',
        merchantId,
        walletId: nagadWalletId,
        provider: 'NAGAD',
        deviceName: 'Google Pixel 7 (SIM 2 - Nagad)',
        status: 'ONLINE',
        appVersion: '1.2.0',
        androidVersion: '14',
        batteryLevel: 88,
        networkStatus: 'CELLULAR',
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    // API Keys
    this.apiKeys.push({
      id: 'key_live_01',
      merchantId,
      name: 'Production Server Key',
      keyPrefix: 'ps_live_8f3d',
      secretHash: bcrypt.hashSync('ps_sec_live_99238472910398', 10),
      mode: 'live',
      status: 'ACTIVE',
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Sample Payments
    this.payments.push(
      {
        id: 'pay_demo_1001',
        merchantId,
        paymentId: 'PAY-1001-INV',
        amount: 850,
        currency: 'BDT',
        invoiceId: 'INV-2026-001',
        customer: {
          name: 'Rahim Chowdhury',
          phone: '01712345678',
          email: 'rahim@example.com',
        },
        provider: 'BKASH',
        walletId: bKashWalletId,
        status: 'COMPLETED',
        matchedTrxId: 'BKL94827X1',
        matchedTransactionId: 'trx_init_01',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        completedAt: new Date().toISOString(),
        mode: 'live',
        platformFee: 8.5,
        merchantNetAmount: 841.5,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'pay_demo_1002',
        merchantId,
        paymentId: 'PAY-1002-PENDING',
        amount: 1500,
        currency: 'BDT',
        invoiceId: 'INV-2026-002',
        customer: {
          name: 'Nusrat Jahan',
          phone: '01987654321',
          email: 'nusrat@example.com',
        },
        provider: 'BKASH',
        walletId: bKashWalletId,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        mode: 'live',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    // Sample Transactions
    this.transactions.push({
      id: 'trx_init_01',
      merchantId,
      walletId: bKashWalletId,
      deviceId: 'dev_galaxy_a54',
      provider: 'BKASH',
      transactionType: 'RECEIVED',
      trxId: 'BKL94827X1',
      amount: 850,
      balance: 42500,
      sender: '01712345678',
      receiver: '01711998877',
      rawSms: 'You have received Tk 850.00 from 01712345678. Ref: INV-2026-001. Fee Tk 0.00. Balance Tk 42,500.00. TrxID BKL94827X1 at 22/09/2026 10:15',
      messageHash: 'hash_bkl94827x1',
      smsTimestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'USED',
      used: true,
      usedForPaymentId: 'pay_demo_1001',
      verificationMetadata: {
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'AUTOMATIC_ENGINE',
        balanceCheckPassed: true,
      },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // ---------------- PHASE 5 SEEDED SAAS PLANS & DATA ----------------
    this.plans.push(
      {
        id: 'plan_starter',
        name: 'Starter',
        slug: 'starter',
        description: 'For rising stores and early-stage merchants starting with MFS payments.',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        currency: 'BDT',
        limits: {
          monthlyVolumeLimit: 100000,
          monthlyApiRequestsLimit: 5000,
          deviceLimit: 2,
          walletLimit: 2,
          webhookLimit: 10000,
          teamMembersLimit: 2,
        },
        features: [
          'API_ACCESS',
          'WEBHOOKS',
          'SANDBOX',
          'TRANSACTION_EXPORT',
          'AUTOMATIC_MATCHING',
        ],
        platformFee: {
          percentage: 1.5,
          fixedFee: 0,
        },
        isActive: true,
        isPublic: true,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'plan_business',
        name: 'Business Growth',
        slug: 'business',
        description: 'For growing e-commerce businesses requiring multi-device scaling & analytics.',
        monthlyPrice: 2499,
        yearlyPrice: 24990,
        currency: 'BDT',
        limits: {
          monthlyVolumeLimit: 500000,
          monthlyApiRequestsLimit: 25000,
          deviceLimit: 5,
          walletLimit: 6,
          webhookLimit: 50000,
          teamMembersLimit: 5,
        },
        features: [
          'API_ACCESS',
          'WEBHOOKS',
          'MULTIPLE_WALLETS',
          'MULTIPLE_DEVICES',
          'SANDBOX',
          'ADVANCED_ANALYTICS',
          'PRIORITY_SUPPORT',
          'CUSTOM_DOMAIN',
          'TRANSACTION_EXPORT',
          'AUTOMATIC_MATCHING',
        ],
        platformFee: {
          percentage: 1.0,
          fixedFee: 0,
        },
        isActive: true,
        isPublic: true,
        sortOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'plan_enterprise',
        name: 'Enterprise Scale',
        slug: 'enterprise',
        description: 'High-volume platforms requiring white-labeling, custom branding, and SLA.',
        monthlyPrice: 5999,
        yearlyPrice: 59990,
        currency: 'BDT',
        limits: {
          monthlyVolumeLimit: 2500000,
          monthlyApiRequestsLimit: 100000,
          deviceLimit: 15,
          walletLimit: 20,
          webhookLimit: 200000,
          teamMembersLimit: 15,
        },
        features: [
          'API_ACCESS',
          'WEBHOOKS',
          'MULTIPLE_WALLETS',
          'MULTIPLE_DEVICES',
          'SANDBOX',
          'ADVANCED_ANALYTICS',
          'PRIORITY_SUPPORT',
          'CUSTOM_DOMAIN',
          'WHITE_LABEL',
          'TRANSACTION_EXPORT',
          'AUTOMATIC_MATCHING',
        ],
        platformFee: {
          percentage: 0.5,
          fixedFee: 0,
        },
        isActive: true,
        isPublic: true,
        sortOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    // Seed Active Business Subscription for Demo Merchant
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    this.subscriptions.push({
      id: 'sub_demo_101',
      merchantId,
      planId: 'plan_business',
      planSlug: 'business',
      planName: 'Business Growth',
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      trialEndsAt: new Date(Date.now() - 16 * 86400000).toISOString(),
      pricePaid: 2499,
      currency: 'BDT',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed Sample Invoices
    this.invoices.push(
      {
        id: 'inv_demo_001',
        invoiceNumber: 'INV-2026-001',
        merchantId,
        subscriptionId: 'sub_demo_101',
        planId: 'plan_business',
        planName: 'Business Growth',
        amount: 2499,
        currency: 'BDT',
        billingPeriodStart: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        billingPeriodEnd: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString(),
        status: 'PAID',
        issueDate: new Date(Date.now() - 30 * 86400000).toISOString(),
        dueDate: new Date(Date.now() - 25 * 86400000).toISOString(),
        paidDate: new Date(Date.now() - 28 * 86400000).toISOString(),
        paymentMethod: 'MANUAL_BKASH',
        transactionReference: '8N65TR761A',
        proofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
        reviewer: 'admin@paysync.local',
        reviewNotes: 'Verified bKash merchant transaction receipt successfully.',
        reviewedAt: new Date(Date.now() - 28 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 28 * 86400000).toISOString(),
      },
      {
        id: 'inv_demo_002',
        invoiceNumber: 'INV-2026-002',
        merchantId,
        subscriptionId: 'sub_demo_101',
        planId: 'plan_business',
        planName: 'Business Growth',
        amount: 2499,
        currency: 'BDT',
        billingPeriodStart: periodStart.toISOString(),
        billingPeriodEnd: periodEnd.toISOString(),
        status: 'PAID',
        issueDate: periodStart.toISOString(),
        dueDate: new Date(periodStart.getTime() + 7 * 86400000).toISOString(),
        paidDate: new Date(periodStart.getTime() + 2 * 86400000).toISOString(),
        paymentMethod: 'MANUAL_BKASH',
        transactionReference: '9M44WQ120B',
        reviewer: 'admin@paysync.local',
        reviewNotes: 'Auto-renew approved via manual bKash statement check.',
        reviewedAt: new Date(periodStart.getTime() + 2 * 86400000).toISOString(),
        createdAt: periodStart.toISOString(),
        updatedAt: new Date(periodStart.getTime() + 2 * 86400000).toISOString(),
      }
    );

    // Current Month Usage Rollup
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.usageRecords.push({
      id: `usage_${merchantId}_${currentYearMonth}`,
      merchantId,
      yearMonth: currentYearMonth,
      paymentVolume: 42500,
      paymentCount: 18,
      apiRequests: 840,
      apiRequestsSuccessful: 835,
      apiRequestsFailed: 5,
      paymentsCreated: 24,
      paymentsVerified: 18,
      statusPolls: 320,
      webhookDispatches: 36,
      lastUpdated: new Date().toISOString(),
    });

    // Seed White-Label Branding
    this.brandings.push({
      id: `brand_${merchantId}`,
      merchantId,
      businessName: 'Dhaka Digital Commerce',
      logoUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=128&auto=format&fit=crop&q=80',
      primaryColor: '#059669',
      accentColor: '#047857',
      supportEmail: 'support@dhakadigital.com',
      supportPhone: '+880 1711-000111',
      showWatermark: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed Custom Domain
    this.domains.push({
      id: `dom_${merchantId}_01`,
      merchantId,
      domain: 'pay.dhakadigital.com',
      verificationToken: 'paysync-verify-dhaka789',
      verificationMethod: 'TXT',
      verificationStatus: 'VERIFIED',
      sslStatus: 'ACTIVE',
      verifiedAt: new Date().toISOString(),
      lastCheckAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed Team Invitation
    this.teamInvitations.push({
      id: `invit_${merchantId}_01`,
      merchantId,
      email: 'ops@dhakadigital.com',
      role: 'MERCHANT_SUPPORT',
      token: 'tok_invite_ops_883921',
      status: 'PENDING',
      invitedBy: 'Tanvir Ahmed',
      expiresAt: new Date(Date.now() + 6 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed Support Ticket
    this.supportTickets.push({
      id: `tick_${merchantId}_01`,
      merchantId,
      ticketNumber: 'TICK-1001',
      subject: 'Inquiry regarding additional bKash Agent wallet setup',
      category: 'DEVICE',
      priority: 'MEDIUM',
      status: 'OPEN',
      messages: [
        {
          id: 'msg_01',
          senderId: 'usr_merchant_owner',
          senderName: 'Tanvir Ahmed',
          senderRole: 'MERCHANT_OWNER',
          message: 'Hello PaySync Support, we are planning to connect 2 more bKash Agent SIMs. Do we need to upgrade to Enterprise plan?',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'msg_02',
          senderId: 'usr_superadmin',
          senderName: 'PaySync Support Desk',
          senderRole: 'SUPER_ADMIN',
          message: 'Hello Tanvir! Your current Business Growth plan supports up to 6 wallets and 5 devices, so you can pair both phones without upgrading!',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    });

    // Seed Real Production Android Collector Releases
    try {
      const artifacts = AndroidReleaseService.ensureReleaseArtifactsExist();

      // v1.2.0 (Latest Release)
      this.androidReleases.push({
        id: 'rel_v120_prod',
        version: '1.2.0',
        versionCode: 120,
        releaseDate: new Date('2026-09-22T00:00:00Z').toISOString(),
        minimumAndroidVersion: 'Android 8.0 (Oreo, API 26)',
        targetAndroidVersion: 'Android 14 (API 34)',
        fileName: artifacts.v120.fileName,
        fileSize: artifacts.v120.fileSize,
        downloadUrl: `/api/android/releases/rel_v120_prod/download`,
        sha256: artifacts.v120.sha256,
        releaseNotes: `### PaySync SMS Collector v1.2.0 Production Release
* **Ultra-Fast MFS Ingestion**: Redesigned background daemon with instant high-priority broadcast receiver.
* **Enhanced Battery Optimization Bypass**: Support for Android 14 foreground services and OEM power-saver whitelist.
* **Offline Queue Reliability**: Guaranteed WorkManager synchronization with cryptographic SHA-256 deduplication.
* **CameraX QR Pairing**: Sub-second device pairing with 256-bit AES ephemeral credentials.
* **Nagad & bKash Regex Precision**: Improved multiline statement and Bangla-numeral parsing compatibility.`,
        isPublished: true,
        isLatest: true,
        downloadCount: 428,
        architecture: 'Universal (arm64-v8a, armeabi-v7a, x86_64)',
        minSdk: 26,
        targetSdk: 34,
        permissions: [
          'android.permission.RECEIVE_SMS',
          'android.permission.READ_SMS',
          'android.permission.INTERNET',
          'android.permission.ACCESS_NETWORK_STATE',
          'android.permission.CAMERA',
          'android.permission.FOREGROUND_SERVICE',
          'android.permission.POST_NOTIFICATIONS',
        ],
        uploadedBy: 'System Release Engine',
        createdAt: new Date('2026-09-22T00:00:00Z').toISOString(),
        updatedAt: new Date('2026-09-22T00:00:00Z').toISOString(),
      });

      // v1.0.0 (Prior Stable Release)
      this.androidReleases.push({
        id: 'rel_v100_legacy',
        version: '1.0.0',
        versionCode: 100,
        releaseDate: new Date('2026-08-15T00:00:00Z').toISOString(),
        minimumAndroidVersion: 'Android 8.0 (API 26)',
        targetAndroidVersion: 'Android 13 (API 33)',
        fileName: artifacts.v100.fileName,
        fileSize: artifacts.v100.fileSize,
        downloadUrl: `/api/android/releases/rel_v100_legacy/download`,
        sha256: artifacts.v100.sha256,
        releaseNotes: `### PaySync SMS Collector v1.0.0 Initial Release
* Initial release of PaySync MFS Collector daemon.
* Basic bKash SMS receiver and HMAC pairing.`,
        isPublished: true,
        isLatest: false,
        downloadCount: 189,
        architecture: 'Universal (arm64-v8a, armeabi-v7a)',
        minSdk: 26,
        targetSdk: 33,
        permissions: [
          'android.permission.RECEIVE_SMS',
          'android.permission.READ_SMS',
          'android.permission.INTERNET',
          'android.permission.CAMERA',
        ],
        uploadedBy: 'System Release Engine',
        createdAt: new Date('2026-08-15T00:00:00Z').toISOString(),
        updatedAt: new Date('2026-08-15T00:00:00Z').toISOString(),
      });
    } catch (e) {
      console.warn('Could not auto-generate APK binaries during memoryDb init:', e);
    }
  }
}

export const memoryDb = new MemoryStore();

function isMongoActive() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

export const Repository = {
  async seedMongoIfEmpty() {
    if (!isMongoActive()) return;
    if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_DATA !== 'true') {
      console.log('🔒 Production mode: Demo data seeding skipped for security.');
      return;
    }
    try {
      const planCount = await SubscriptionPlanModel.countDocuments();
      if (planCount === 0) {
        console.log('🌱 Seeding initial SaaS plans to MongoDB...');
        for (const p of memoryDb.plans) {
          await SubscriptionPlanModel.findOneAndUpdate({ slug: p.slug }, { ...p }, { upsert: true });
        }
      }
      const merchantCount = await MerchantModel.countDocuments();
      if (merchantCount === 0) {
        console.log('🌱 Seeding initial demo merchants, users & subscriptions to MongoDB...');
        for (const m of memoryDb.merchants) {
          await MerchantModel.findOneAndUpdate({ email: m.email }, { ...m }, { upsert: true });
        }
        for (const u of memoryDb.users) {
          await UserModel.findOneAndUpdate({ email: u.email }, { ...u }, { upsert: true });
        }
        for (const w of memoryDb.wallets) {
          await WalletModel.findOneAndUpdate({ walletNumber: w.walletNumber }, { ...w }, { upsert: true });
        }
        for (const d of memoryDb.devices) {
          await DeviceModel.findOneAndUpdate({ deviceId: d.deviceId }, { ...d }, { upsert: true });
        }
        for (const s of memoryDb.subscriptions) {
          await MerchantSubscriptionModel.findOneAndUpdate({ merchantId: s.merchantId }, { ...s }, { upsert: true });
        }
        for (const inv of memoryDb.invoices) {
          await BillingInvoiceModel.findOneAndUpdate({ invoiceNumber: inv.invoiceNumber }, { ...inv }, { upsert: true });
        }
        for (const b of memoryDb.brandings) {
          await MerchantBrandingModel.findOneAndUpdate({ merchantId: b.merchantId }, { ...b }, { upsert: true });
        }
        for (const rel of memoryDb.androidReleases) {
          await AndroidReleaseModel.findOneAndUpdate({ version: rel.version }, { ...rel }, { upsert: true });
        }
      }
    } catch (e) {
      console.error('Seed error:', e);
    }
  },

  // ---------------- USER OPERATIONS ----------------
  async getUserByEmail(email: string): Promise<IUser | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IUser;
    }
    return memoryDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async getUserById(id: string): Promise<IUser | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await UserModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IUser;
    }
    return memoryDb.users.find((u) => u.id === id) || null;
  },

  async createUser(data: Partial<IUser> & { passwordHash: string }): Promise<IUser> {
    assertDatabaseOperational();
    const id = data.id || `usr_${Date.now()}`;
    if (isMongoActive()) {
      const doc = await UserModel.create({ ...data, _id: new mongoose.Types.ObjectId() });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IUser;
    }
    const user: IUser = {
      id,
      name: data.name!,
      email: data.email!,
      role: data.role || 'MERCHANT_OWNER',
      merchantId: data.merchantId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.users.push(user);
    return user;
  },

  async updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await UserModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IUser;
    }
    const idx = memoryDb.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    memoryDb.users[idx] = { ...memoryDb.users[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.users[idx];
  },

  // ---------------- MERCHANT OPERATIONS ----------------
  async getMerchantById(id: string): Promise<IMerchant | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await MerchantModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchant;
    }
    return memoryDb.merchants.find((m) => m.id === id) || null;
  },

  async getMerchantByEmail(email: string): Promise<IMerchant | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await MerchantModel.findOne({ email: email.toLowerCase() }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchant;
    }
    return memoryDb.merchants.find((m) => m.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async createMerchant(data: Partial<IMerchant>): Promise<IMerchant> {
    assertDatabaseOperational();
    const id = data.id || `merch_${Date.now()}`;
    if (isMongoActive()) {
      const doc = await MerchantModel.create({ ...data, _id: new mongoose.Types.ObjectId() });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IMerchant;
    }
    const merchant: IMerchant = {
      id,
      businessName: data.businessName!,
      ownerName: data.ownerName!,
      email: data.email!,
      phone: data.phone!,
      businessType: data.businessType || 'Ecommerce',
      address: data.address,
      website: data.website,
      status: 'ACTIVE',
      webhookUrl: data.webhookUrl,
      webhookSecret: data.webhookSecret,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.merchants.push(merchant);
    return merchant;
  },

  async updateMerchant(id: string, updates: Partial<IMerchant>): Promise<IMerchant | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await MerchantModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchant;
    }
    const idx = memoryDb.merchants.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    memoryDb.merchants[idx] = { ...memoryDb.merchants[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.merchants[idx];
  },

  async getAllMerchants(): Promise<IMerchant[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await MerchantModel.find().lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.merchants;
  },

  // ---------------- WALLET OPERATIONS ----------------
  async getWalletsByMerchant(merchantId: string): Promise<IWallet[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await WalletModel.find({ merchantId }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.wallets.filter((w) => w.merchantId === merchantId);
  },

  async getWalletById(id: string): Promise<IWallet | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await WalletModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IWallet;
    }
    return memoryDb.wallets.find((w) => w.id === id) || null;
  },

  async createWallet(data: Partial<IWallet>): Promise<IWallet> {
    assertDatabaseOperational();
    const id = data.id || `wal_${Date.now()}`;
    if (isMongoActive()) {
      const doc = await WalletModel.create({ ...data, _id: new mongoose.Types.ObjectId() });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IWallet;
    }
    const wallet: IWallet = {
      id,
      merchantId: data.merchantId!,
      provider: data.provider!,
      walletNumber: data.walletNumber!,
      walletType: data.walletType || 'PERSONAL',
      displayName: data.displayName || `${data.provider} Wallet`,
      status: data.status || 'ACTIVE',
      verificationStatus: data.verificationStatus || 'VERIFIED',
      deviceId: data.deviceId,
      currentBalance: data.currentBalance || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.wallets.push(wallet);
    return wallet;
  },

  async updateWallet(id: string, updates: Partial<IWallet>): Promise<IWallet | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await WalletModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IWallet;
    }
    const idx = memoryDb.wallets.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    memoryDb.wallets[idx] = { ...memoryDb.wallets[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.wallets[idx];
  },

  async deleteWallet(id: string, merchantId: string): Promise<boolean> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id)
        ? { $and: [{ $or: [{ _id: id }, { id }] }, { merchantId }] }
        : { id, merchantId };
      const res = await WalletModel.deleteOne(query);
      return res.deletedCount > 0;
    }
    const idx = memoryDb.wallets.findIndex((w) => w.id === id && w.merchantId === merchantId);
    if (idx === -1) return false;
    memoryDb.wallets.splice(idx, 1);
    return true;
  },

  // ---------------- DEVICE OPERATIONS ----------------
  async getDevicesByMerchant(merchantId: string): Promise<IDevice[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await DeviceModel.find({ merchantId }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.devices.filter((d) => d.merchantId === merchantId);
  },

  async getDeviceByDeviceId(deviceId: string): Promise<IDevice | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await DeviceModel.findOne({ deviceId }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IDevice;
    }
    return memoryDb.devices.find((d) => d.deviceId === deviceId) || null;
  },

  async getDeviceById(id: string): Promise<IDevice | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await DeviceModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IDevice;
    }
    return memoryDb.devices.find((d) => d.id === id) || null;
  },

  async createDevice(data: Partial<IDevice>): Promise<IDevice> {
    assertDatabaseOperational();
    const id = data.id || `dev_${Date.now()}`;
    if (isMongoActive()) {
      const doc = await DeviceModel.create({ ...data, _id: new mongoose.Types.ObjectId() });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IDevice;
    }
    const device: IDevice = {
      id,
      deviceId: data.deviceId!,
      deviceToken: data.deviceToken,
      merchantId: data.merchantId!,
      walletId: data.walletId,
      provider: data.provider,
      deviceName: data.deviceName || 'Android SMS Gateway Device',
      status: data.status || 'PENDING_PAIRING',
      appVersion: data.appVersion || '1.0.0',
      androidVersion: data.androidVersion || '14',
      batteryLevel: data.batteryLevel || 100,
      networkStatus: data.networkStatus || 'WIFI',
      lastSeenAt: new Date().toISOString(),
      pairingToken: data.pairingToken,
      pairingTokenExpiresAt: data.pairingTokenExpiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.devices.push(device);
    return device;
  },

  async updateDevice(id: string, updates: Partial<IDevice>): Promise<IDevice | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }, { deviceId: id }] } : { id };
      const doc = await DeviceModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IDevice;
    }
    const idx = memoryDb.devices.findIndex((d) => d.id === id || d.deviceId === id);
    if (idx === -1) return null;
    memoryDb.devices[idx] = { ...memoryDb.devices[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.devices[idx];
  },

  async deleteDevice(id: string, merchantId: string): Promise<boolean> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id)
        ? { $and: [{ $or: [{ _id: id }, { id }] }, { merchantId }] }
        : { id, merchantId };
      const res = await DeviceModel.deleteOne(query);
      return res.deletedCount > 0;
    }
    const idx = memoryDb.devices.findIndex((d) => d.id === id && d.merchantId === merchantId);
    if (idx === -1) return false;
    memoryDb.devices.splice(idx, 1);
    return true;
  },

  async getAllDevices(): Promise<IDevice[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await DeviceModel.find().lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.devices;
  },

  // ---------------- PAYMENT OPERATIONS ----------------
  async getPaymentsByMerchant(merchantId: string): Promise<IPayment[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await PaymentModel.find({ merchantId }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.payments.filter((p) => p.merchantId === merchantId);
  },

  async getPaymentById(id: string): Promise<IPayment | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await PaymentModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IPayment;
    }
    return memoryDb.payments.find((p) => p.id === id) || null;
  },

  async getPaymentByPaymentId(paymentId: string): Promise<IPayment | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await PaymentModel.findOne({ paymentId }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IPayment;
    }
    return memoryDb.payments.find((p) => p.paymentId === paymentId) || null;
  },

  async createPayment(data: Partial<IPayment>): Promise<IPayment> {
    assertDatabaseOperational();
    const id = data.id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    if (isMongoActive()) {
      const doc = await PaymentModel.create({ ...data, _id: new mongoose.Types.ObjectId() });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IPayment;
    }
    const payment: IPayment = {
      id,
      merchantId: data.merchantId!,
      paymentId: data.paymentId || `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: data.amount!,
      currency: data.currency || 'BDT',
      invoiceId: data.invoiceId!,
      orderId: data.orderId,
      description: data.description,
      metadata: data.metadata,
      customer: data.customer || {},
      provider: data.provider,
      walletId: data.walletId,
      status: data.status || 'PENDING',
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
      webhookUrl: data.webhookUrl,
      expiresAt: data.expiresAt || new Date(Date.now() + 1800000).toISOString(),
      mode: data.mode || 'live',
      platformFee: data.platformFee || 0,
      merchantNetAmount: data.merchantNetAmount || data.amount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.payments.push(payment);
    return payment;
  },

  async updatePayment(id: string, updates: Partial<IPayment>): Promise<IPayment | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }, { paymentId: id }] } : { id };
      const doc = await PaymentModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IPayment;
    }
    const idx = memoryDb.payments.findIndex((p) => p.id === id || p.paymentId === id);
    if (idx === -1) return null;
    memoryDb.payments[idx] = { ...memoryDb.payments[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.payments[idx];
  },

  async getAllPayments(): Promise<IPayment[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await PaymentModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.payments;
  },

  async getPaymentsForManualReview(): Promise<IPayment[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await PaymentModel.find({ status: 'MANUAL_REVIEW' }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.payments.filter((p) => p.status === 'MANUAL_REVIEW');
  },

  // Atomic Transaction Claim for Payment Verification
  async claimPaymentTransactionAtomically(
    paymentId: string,
    trxId: string,
    provider: string,
    amount: number,
    merchantId: string
  ): Promise<{ success: boolean; payment?: IPayment; transaction?: ITransaction; reason?: string }> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      // Find matching un-used transaction
      const matchedTrx = await TransactionModel.findOneAndUpdate(
        {
          trxId: trxId.toUpperCase().trim(),
          provider,
          amount,
          merchantId,
          used: false,
        },
        {
          used: true,
          status: 'USED',
          usedForPaymentId: paymentId,
        },
        { new: true }
      );

      if (!matchedTrx) {
        return { success: false, reason: 'TRANSACTION_NOT_FOUND_OR_ALREADY_CLAIMED' };
      }

      // Complete the payment
      const updatedPayment = await PaymentModel.findOneAndUpdate(
        { paymentId, status: { $in: ['PENDING', 'PROCESSING', 'MANUAL_REVIEW'] } },
        {
          status: 'COMPLETED',
          matchedTrxId: matchedTrx.trxId,
          matchedTransactionId: matchedTrx._id.toString(),
          completedAt: new Date(),
        },
        { new: true }
      ).lean();

      if (!updatedPayment) {
        // Rollback transaction claim
        await TransactionModel.findByIdAndUpdate(matchedTrx._id, { used: false, status: 'UNVERIFIED', usedForPaymentId: undefined });
        return { success: false, reason: 'PAYMENT_STATE_INVALID_OR_ALREADY_COMPLETED' };
      }

      return {
        success: true,
        payment: { ...updatedPayment, id: (updatedPayment as any)._id.toString() } as unknown as IPayment,
        transaction: { ...matchedTrx.toObject(), id: matchedTrx._id.toString() } as unknown as ITransaction,
      };
    }

    // In-memory atomic fallback
    const trxIdx = memoryDb.transactions.findIndex(
      (t) =>
        t.trxId.toUpperCase().trim() === trxId.toUpperCase().trim() &&
        t.provider === provider &&
        t.amount === amount &&
        t.merchantId === merchantId &&
        !t.used
    );

    if (trxIdx === -1) {
      return { success: false, reason: 'TRANSACTION_NOT_FOUND_OR_ALREADY_CLAIMED' };
    }

    const payIdx = memoryDb.payments.findIndex(
      (p) => p.paymentId === paymentId && ['PENDING', 'PROCESSING', 'MANUAL_REVIEW'].includes(p.status)
    );

    if (payIdx === -1) {
      return { success: false, reason: 'PAYMENT_STATE_INVALID_OR_ALREADY_COMPLETED' };
    }

    memoryDb.transactions[trxIdx].used = true;
    memoryDb.transactions[trxIdx].status = 'USED';
    memoryDb.transactions[trxIdx].usedForPaymentId = paymentId;

    memoryDb.payments[payIdx].status = 'COMPLETED';
    memoryDb.payments[payIdx].matchedTrxId = memoryDb.transactions[trxIdx].trxId;
    memoryDb.payments[payIdx].matchedTransactionId = memoryDb.transactions[trxIdx].id;
    memoryDb.payments[payIdx].completedAt = new Date().toISOString();
    memoryDb.payments[payIdx].updatedAt = new Date().toISOString();

    return {
      success: true,
      payment: memoryDb.payments[payIdx],
      transaction: memoryDb.transactions[trxIdx],
    };
  },

  // ---------------- TRANSACTION OPERATIONS ----------------
  async getTransactionsByMerchant(merchantId: string): Promise<ITransaction[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await TransactionModel.find({ merchantId }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.transactions.filter((t) => t.merchantId === merchantId);
  },

  async getTransactionById(id: string): Promise<ITransaction | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await TransactionModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as ITransaction;
    }
    return memoryDb.transactions.find((t) => t.id === id) || null;
  },

  async getTransactionByTrxId(trxId: string, provider?: string): Promise<ITransaction | null> {
    assertDatabaseOperational();
    const query: any = { trxId: trxId.toUpperCase().trim() };
    if (provider) query.provider = provider;
    if (isMongoActive()) {
      const doc = await TransactionModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as ITransaction;
    }
    return (
      memoryDb.transactions.find(
        (t) => t.trxId.toUpperCase().trim() === trxId.toUpperCase().trim() && (!provider || t.provider === provider)
      ) || null
    );
  },

  async getTransactionByHash(messageHash: string): Promise<ITransaction | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await TransactionModel.findOne({ messageHash }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as ITransaction;
    }
    return memoryDb.transactions.find((t) => t.messageHash === messageHash) || null;
  },

  async createTransaction(data: Partial<ITransaction>): Promise<ITransaction> {
    assertDatabaseOperational();
    const id = data.id || `trx_${Date.now()}`;
    if (isMongoActive()) {
      const doc = await TransactionModel.create({ ...data, _id: new mongoose.Types.ObjectId() });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as ITransaction;
    }
    const transaction: ITransaction = {
      id,
      merchantId: data.merchantId!,
      walletId: data.walletId!,
      deviceId: data.deviceId,
      provider: data.provider!,
      transactionType: data.transactionType || 'RECEIVED',
      trxId: data.trxId!,
      amount: data.amount!,
      balance: data.balance,
      fee: data.fee || 0,
      reference: data.reference,
      sender: data.sender,
      receiver: data.receiver,
      rawSms: data.rawSms!,
      messageHash: data.messageHash!,
      smsTimestamp: data.smsTimestamp || new Date().toISOString(),
      status: data.status || 'UNVERIFIED',
      used: data.used || false,
      usedForPaymentId: data.usedForPaymentId,
      verificationMetadata: data.verificationMetadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.transactions.push(transaction);
    return transaction;
  },

  async updateTransaction(id: string, updates: Partial<ITransaction>): Promise<ITransaction | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await TransactionModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as ITransaction;
    }
    const idx = memoryDb.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    memoryDb.transactions[idx] = { ...memoryDb.transactions[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.transactions[idx];
  },

  async getAllTransactions(): Promise<ITransaction[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await TransactionModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.transactions;
  },

  // ---------------- API KEY OPERATIONS ----------------
  async getApiKeysByMerchant(merchantId: string): Promise<IApiKey[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await ApiKeyModel.find({ merchantId }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.apiKeys.filter((k) => k.merchantId === merchantId);
  },

  async getApiKeyByKeyPrefix(keyPrefix: string): Promise<IApiKey | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await ApiKeyModel.findOne({ keyPrefix }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IApiKey;
    }
    return memoryDb.apiKeys.find((k) => k.keyPrefix === keyPrefix) || null;
  },

  async createApiKey(data: Partial<IApiKey>): Promise<IApiKey> {
    assertDatabaseOperational();
    const id = data.id || `key_${Date.now()}`;
    if (isMongoActive()) {
      const doc = await ApiKeyModel.create({ ...data, _id: new mongoose.Types.ObjectId() });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IApiKey;
    }
    const key: IApiKey = {
      id,
      merchantId: data.merchantId!,
      name: data.name!,
      keyPrefix: data.keyPrefix!,
      secretHash: data.secretHash!,
      mode: data.mode || 'live',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    memoryDb.apiKeys.push(key);
    return key;
  },

  async getApiKeyById(id: string): Promise<IApiKey | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await ApiKeyModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IApiKey;
    }
    return memoryDb.apiKeys.find((k) => k.id === id) || null;
  },

  async updateApiKey(id: string, updates: Partial<IApiKey>): Promise<IApiKey | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await ApiKeyModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IApiKey;
    }
    const idx = memoryDb.apiKeys.findIndex((k) => k.id === id);
    if (idx === -1) return null;
    memoryDb.apiKeys[idx] = { ...memoryDb.apiKeys[idx], ...updates };
    return memoryDb.apiKeys[idx];
  },

  async revokeApiKey(id: string, merchantId: string): Promise<boolean> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id)
        ? { $and: [{ $or: [{ _id: id }, { id }] }, { merchantId }] }
        : { id, merchantId };
      const res = await ApiKeyModel.updateOne(query, { status: 'REVOKED', revokedAt: new Date() });
      return res.modifiedCount > 0;
    }
    const key = memoryDb.apiKeys.find((k) => k.id === id && k.merchantId === merchantId);
    if (!key) return false;
    key.status = 'REVOKED';
    key.revokedAt = new Date().toISOString();
    return true;
  },

  async updateApiKeyLastUsed(keyPrefix: string): Promise<void> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      await ApiKeyModel.updateOne({ keyPrefix }, { lastUsedAt: new Date() });
      return;
    }
    const k = memoryDb.apiKeys.find((item) => item.keyPrefix === keyPrefix);
    if (k) k.lastUsedAt = new Date().toISOString();
  },

  // ---------------- WEBHOOK LOGS ----------------
  async getWebhookLogsByMerchant(merchantId: string): Promise<IWebhookLog[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await WebhookLogModel.find({ merchantId }).sort({ createdAt: -1 }).limit(100).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.webhooks.filter((w) => w.merchantId === merchantId);
  },

  async createWebhookLog(data: Partial<IWebhookLog>): Promise<IWebhookLog> {
    assertDatabaseOperational();
    const id = data.id || `wh_${Date.now()}`;
    if (isMongoActive()) {
      const doc = await WebhookLogModel.create({
        ...data,
        webhookId: data.webhookId || id,
        _id: new mongoose.Types.ObjectId(),
      });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IWebhookLog;
    }
    const log: IWebhookLog = {
      id,
      merchantId: data.merchantId!,
      paymentId: data.paymentId!,
      event: data.event!,
      endpoint: data.endpoint!,
      status: data.status || 'PENDING',
      attempts: data.attempts || 0,
      responseCode: data.responseCode,
      responseBody: data.responseBody,
      payload: data.payload || {},
      signature: data.signature || '',
      lastAttemptAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    memoryDb.webhooks.push(log);
    return log;
  },

  async getPendingWebhooks(limit: number = 20): Promise<any[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      return await WebhookLogModel.find({
        status: 'FAILED',
        attempts: { $lt: 5 },
        nextAttemptAt: { $lte: new Date() },
      })
        .sort({ nextAttemptAt: 1 })
        .limit(limit)
        .lean();
    }
    return memoryDb.webhooks
      .filter((w) => w.status === 'FAILED' && w.attempts < 5 && w.nextAttemptAt && new Date(w.nextAttemptAt).getTime() <= Date.now())
      .slice(0, limit);
  },

  async updateWebhookLog(id: string, updates: Partial<IWebhookLog>): Promise<void> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      await WebhookLogModel.findOneAndUpdate(query, updates);
      return;
    }
    const idx = memoryDb.webhooks.findIndex((w) => w.id === id);
    if (idx !== -1) {
      memoryDb.webhooks[idx] = { ...memoryDb.webhooks[idx], ...updates };
    }
  },

  async getAllWebhookLogs(limit: number = 200): Promise<IWebhookLog[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await WebhookLogModel.find().sort({ createdAt: -1 }).limit(limit).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return [...memoryDb.webhooks].reverse().slice(0, limit);
  },

  // ---------------- AUDIT & FRAUD LOGS ----------------
  async createAuditLog(data: Partial<IAuditLog>): Promise<void> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      await AuditLogModel.create(data);
      return;
    }
    memoryDb.auditLogs.push({
      id: `aud_${Date.now()}`,
      actorId: data.actorId || 'system',
      actorEmail: data.actorEmail || 'system@paysync.local',
      actorRole: data.actorRole || 'SYSTEM',
      merchantId: data.merchantId,
      action: data.action!,
      resourceType: data.resourceType!,
      resourceId: data.resourceId,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      requestId: data.requestId,
      createdAt: new Date().toISOString(),
    });
  },

  async getAuditLogs(limit: number = 100): Promise<IAuditLog[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(limit).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return [...memoryDb.auditLogs].reverse().slice(0, limit);
  },

  async getRecentAuditLogs(limit: number = 100): Promise<IAuditLog[]> {
    return this.getAuditLogs(limit);
  },

  async getAuditLogsByMerchant(merchantId: string, limit: number = 100): Promise<IAuditLog[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await AuditLogModel.find({ merchantId }).sort({ createdAt: -1 }).limit(limit).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.auditLogs.filter((l) => l.merchantId === merchantId).reverse().slice(0, limit);
  },

  async createFraudEvent(data: Partial<IFraudEvent>): Promise<void> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      await FraudEventModel.create(data);
      return;
    }
    memoryDb.fraudEvents.push({
      id: `fraud_${Date.now()}`,
      merchantId: data.merchantId,
      riskLevel: data.riskLevel || 'MEDIUM',
      type: data.type!,
      details: data.details!,
      ipAddress: data.ipAddress,
      metadata: data.metadata,
      requestId: data.requestId,
      createdAt: new Date().toISOString(),
    });
  },

  async getFraudEvents(limit: number = 100): Promise<IFraudEvent[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await FraudEventModel.find().sort({ createdAt: -1 }).limit(limit).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return [...memoryDb.fraudEvents].reverse().slice(0, limit);
  },

  async getRecentFraudLogs(limit: number = 100): Promise<IFraudEvent[]> {
    return this.getFraudEvents(limit);
  },

  async getFraudEventsByMerchant(merchantId: string, limit: number = 100): Promise<IFraudEvent[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await FraudEventModel.find({ merchantId }).sort({ createdAt: -1 }).limit(limit).lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.fraudEvents.filter((f) => f.merchantId === merchantId).reverse().slice(0, limit);
  },

  // ---------------- SYSTEM SETTINGS ----------------
  async getSystemSettings(): Promise<ISystemSettings> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await SystemSettingsModel.findOne().lean();
      if (doc) return doc as unknown as ISystemSettings;
    }
    return memoryDb.settings;
  },

  async updateSystemSettings(updates: Partial<ISystemSettings>): Promise<ISystemSettings> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await SystemSettingsModel.findOneAndUpdate({}, updates, { upsert: true, new: true }).lean();
      return doc as unknown as ISystemSettings;
    }
    memoryDb.settings = { ...memoryDb.settings, ...updates };
    return memoryDb.settings;
  },

  // ---------------- REPLAY PROTECTION & IDEMPOTENCY ----------------
  async checkDeviceNonce(deviceId: string, nonce: string): Promise<boolean> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const existing = await DeviceNonceModel.findOne({ deviceId, nonce });
      return !!existing;
    }
    const key = `${deviceId}:${nonce}`;
    if (!(memoryDb as any).nonces) (memoryDb as any).nonces = new Set<string>();
    return (memoryDb as any).nonces.has(key);
  },

  async saveDeviceNonce(deviceId: string, nonce: string): Promise<boolean> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      try {
        await DeviceNonceModel.create({ deviceId, nonce });
        return true;
      } catch {
        return false;
      }
    }
    const key = `${deviceId}:${nonce}`;
    if (!(memoryDb as any).nonces) (memoryDb as any).nonces = new Set<string>();
    if ((memoryDb as any).nonces.has(key)) {
      return false;
    }
    (memoryDb as any).nonces.add(key);
    return true;
  },

  async getIdempotentResponse(key: string, merchantId?: string): Promise<any | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await IdempotencyModel.findOne({ key, merchantId: merchantId || 'global' }).lean();
      return doc ? doc.responseBody : null;
    }
    if (!(memoryDb as any).idempotencyMap) (memoryDb as any).idempotencyMap = new Map<string, any>();
    const entry = (memoryDb as any).idempotencyMap.get(`${merchantId || 'global'}:${key}`);
    return entry ? entry.responseBody : null;
  },

  async saveIdempotentResponse(
    key: string,
    merchantId: string | undefined,
    method: string,
    path: string,
    statusCode: number,
    responseBody: any
  ): Promise<void> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      await IdempotencyModel.findOneAndUpdate(
        { key, merchantId: merchantId || 'global' },
        { key, merchantId: merchantId || 'global', method, path, statusCode, responseBody },
        { upsert: true }
      );
      return;
    }
    if (!(memoryDb as any).idempotencyMap) (memoryDb as any).idempotencyMap = new Map<string, any>();
    (memoryDb as any).idempotencyMap.set(`${merchantId || 'global'}:${key}`, {
      key,
      merchantId,
      method,
      path,
      statusCode,
      responseBody,
      createdAt: new Date(),
    });
  },

  // ---------------- PHASE 5 SAAS: SUBSCRIPTION PLANS ----------------
  async getPlans(includePrivate: boolean = false): Promise<ISubscriptionPlan[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = includePrivate ? {} : { isActive: true, isPublic: true };
      const docs = await SubscriptionPlanModel.find(query).sort({ sortOrder: 1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.plans
      .filter((p) => (includePrivate ? true : p.isActive && p.isPublic))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getPlanById(id: string): Promise<ISubscriptionPlan | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await SubscriptionPlanModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as ISubscriptionPlan;
    }
    return memoryDb.plans.find((p) => p.id === id) || null;
  },

  async getPlanBySlug(slug: string): Promise<ISubscriptionPlan | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await SubscriptionPlanModel.findOne({ slug: slug.toLowerCase().trim() }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as ISubscriptionPlan;
    }
    return memoryDb.plans.find((p) => p.slug.toLowerCase().trim() === slug.toLowerCase().trim()) || null;
  },

  async createPlan(data: Partial<ISubscriptionPlan>): Promise<ISubscriptionPlan> {
    assertDatabaseOperational();
    const id = data.id || `plan_${Date.now()}`;
    if (isMongoActive()) {
      const doc = await SubscriptionPlanModel.create({ ...data, _id: new mongoose.Types.ObjectId() });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as ISubscriptionPlan;
    }
    const plan: ISubscriptionPlan = {
      id,
      name: data.name!,
      slug: data.slug || data.name!.toLowerCase().replace(/\s+/g, '-'),
      description: data.description || '',
      monthlyPrice: data.monthlyPrice || 0,
      yearlyPrice: data.yearlyPrice || 0,
      currency: data.currency || 'BDT',
      limits: data.limits || {
        monthlyVolumeLimit: 100000,
        monthlyApiRequestsLimit: 5000,
        deviceLimit: 2,
        walletLimit: 2,
        webhookLimit: 10000,
        teamMembersLimit: 2,
      },
      features: data.features || ['API_ACCESS', 'WEBHOOKS', 'SANDBOX', 'AUTOMATIC_MATCHING'],
      platformFee: data.platformFee || { percentage: 1.0, fixedFee: 0 },
      isActive: data.isActive !== undefined ? data.isActive : true,
      isPublic: data.isPublic !== undefined ? data.isPublic : true,
      sortOrder: data.sortOrder || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.plans.push(plan);
    return plan;
  },

  async updatePlan(id: string, updates: Partial<ISubscriptionPlan>): Promise<ISubscriptionPlan | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await SubscriptionPlanModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as ISubscriptionPlan;
    }
    const idx = memoryDb.plans.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    memoryDb.plans[idx] = { ...memoryDb.plans[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.plans[idx];
  },

  async deletePlan(id: string): Promise<boolean> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const res = await SubscriptionPlanModel.deleteOne(query);
      return res.deletedCount > 0;
    }
    const idx = memoryDb.plans.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    memoryDb.plans.splice(idx, 1);
    return true;
  },

  // ---------------- PHASE 5 SAAS: MERCHANT SUBSCRIPTIONS ----------------
  async getSubscriptionByMerchant(merchantId: string): Promise<IMerchantSubscription | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await MerchantSubscriptionModel.findOne({ merchantId }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchantSubscription;
    }
    return memoryDb.subscriptions.find((s) => s.merchantId === merchantId) || null;
  },

  async createSubscription(data: Partial<IMerchantSubscription>): Promise<IMerchantSubscription> {
    assertDatabaseOperational();
    const id = data.id || `sub_${Date.now()}`;
    if (isMongoActive()) {
      const doc = await MerchantSubscriptionModel.findOneAndUpdate(
        { merchantId: data.merchantId },
        { ...data, _id: new mongoose.Types.ObjectId() },
        { upsert: true, new: true }
      ).lean();
      return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchantSubscription;
    }
    const existingIdx = memoryDb.subscriptions.findIndex((s) => s.merchantId === data.merchantId);
    const sub: IMerchantSubscription = {
      id,
      merchantId: data.merchantId!,
      planId: data.planId!,
      planSlug: data.planSlug!,
      planName: data.planName!,
      billingCycle: data.billingCycle || 'MONTHLY',
      status: data.status || 'TRIAL',
      startDate: data.startDate || new Date().toISOString(),
      currentPeriodStart: data.currentPeriodStart || new Date().toISOString(),
      currentPeriodEnd: data.currentPeriodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
      trialEndsAt: data.trialEndsAt,
      gracePeriodEndsAt: data.gracePeriodEndsAt,
      pricePaid: data.pricePaid || 0,
      currency: data.currency || 'BDT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existingIdx !== -1) {
      memoryDb.subscriptions[existingIdx] = sub;
    } else {
      memoryDb.subscriptions.push(sub);
    }
    return sub;
  },

  async updateSubscription(id: string, updates: Partial<IMerchantSubscription>): Promise<IMerchantSubscription | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id)
        ? { $or: [{ _id: id }, { id }, { merchantId: id }] }
        : { $or: [{ id }, { merchantId: id }] };
      const doc = await MerchantSubscriptionModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchantSubscription;
    }
    const idx = memoryDb.subscriptions.findIndex((s) => s.id === id || s.merchantId === id);
    if (idx === -1) return null;
    memoryDb.subscriptions[idx] = { ...memoryDb.subscriptions[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.subscriptions[idx];
  },

  async getAllSubscriptions(): Promise<IMerchantSubscription[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await MerchantSubscriptionModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.subscriptions;
  },

  // ---------------- PHASE 5 SAAS: BILLING INVOICES ----------------
  async getInvoicesByMerchant(merchantId: string): Promise<IBillingInvoice[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await BillingInvoiceModel.find({ merchantId }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.invoices.filter((i) => i.merchantId === merchantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getInvoiceById(id: string): Promise<IBillingInvoice | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await BillingInvoiceModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IBillingInvoice;
    }
    return memoryDb.invoices.find((i) => i.id === id) || null;
  },

  async getInvoiceByNumber(invoiceNumber: string): Promise<IBillingInvoice | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await BillingInvoiceModel.findOne({ invoiceNumber }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IBillingInvoice;
    }
    return memoryDb.invoices.find((i) => i.invoiceNumber === invoiceNumber) || null;
  },

  async createInvoice(data: Partial<IBillingInvoice>): Promise<IBillingInvoice> {
    assertDatabaseOperational();
    const id = data.id || `inv_${Date.now()}`;
    const invoiceNumber = data.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    if (isMongoActive()) {
      const doc = await BillingInvoiceModel.create({
        ...data,
        invoiceNumber,
        _id: new mongoose.Types.ObjectId(),
      });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IBillingInvoice;
    }
    const inv: IBillingInvoice = {
      id,
      invoiceNumber,
      merchantId: data.merchantId!,
      subscriptionId: data.subscriptionId,
      planId: data.planId!,
      planName: data.planName!,
      amount: data.amount!,
      currency: data.currency || 'BDT',
      billingPeriodStart: data.billingPeriodStart || new Date().toISOString(),
      billingPeriodEnd: data.billingPeriodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
      status: data.status || 'DRAFT',
      issueDate: data.issueDate || new Date().toISOString(),
      dueDate: data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
      paidDate: data.paidDate,
      paymentMethod: data.paymentMethod,
      transactionReference: data.transactionReference,
      proofUrl: data.proofUrl,
      reviewer: data.reviewer,
      reviewNotes: data.reviewNotes,
      reviewedAt: data.reviewedAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.invoices.push(inv);
    return inv;
  },

  async updateInvoice(id: string, updates: Partial<IBillingInvoice>): Promise<IBillingInvoice | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await BillingInvoiceModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IBillingInvoice;
    }
    const idx = memoryDb.invoices.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    memoryDb.invoices[idx] = { ...memoryDb.invoices[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.invoices[idx];
  },

  async getAllInvoices(status?: string): Promise<IBillingInvoice[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = status ? { status } : {};
      const docs = await BillingInvoiceModel.find(query).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return status ? memoryDb.invoices.filter((i) => i.status === status) : memoryDb.invoices;
  },

  // 1-Click Atomic Approval of Manual Invoice & Instant Subscription Activation/Renewal
  async approveManualInvoiceAtomically(
    invoiceId: string,
    reviewerId: string,
    notes?: string
  ): Promise<{ success: boolean; invoice?: IBillingInvoice; subscription?: IMerchantSubscription; error?: string }> {
    assertDatabaseOperational();
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) return { success: false, error: 'INVOICE_NOT_FOUND' };
    if (invoice.status === 'PAID') return { success: false, error: 'INVOICE_ALREADY_PAID' };

    const plan = await this.getPlanById(invoice.planId);
    if (!plan) return { success: false, error: 'PLAN_NOT_FOUND' };

    const paidDate = new Date().toISOString();
    const isYearly = invoice.amount >= plan.yearlyPrice * 0.9;
    const durationDays = isYearly ? 365 : 30;

    const newPeriodStart = new Date().toISOString();
    const newPeriodEnd = new Date(Date.now() + durationDays * 86400000).toISOString();

    const updatedInvoice = await this.updateInvoice(invoiceId, {
      status: 'PAID',
      paidDate,
      reviewer: reviewerId,
      reviewNotes: notes || 'Manual payment approved by administrator.',
      reviewedAt: paidDate,
    });

    const updatedSubscription = await this.createSubscription({
      merchantId: invoice.merchantId,
      planId: plan.id,
      planSlug: plan.slug,
      planName: plan.name,
      billingCycle: isYearly ? 'YEARLY' : 'MONTHLY',
      status: 'ACTIVE',
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      cancelAtPeriodEnd: false,
      pricePaid: invoice.amount,
      currency: invoice.currency,
    });

    await this.createAuditLog({
      actorId: reviewerId,
      actorEmail: reviewerId,
      actorRole: 'SUPER_ADMIN',
      merchantId: invoice.merchantId,
      action: 'APPROVE_MANUAL_INVOICE',
      resourceType: 'BILLING_INVOICE',
      resourceId: invoiceId,
      metadata: { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount, planName: plan.name },
    });

    return {
      success: true,
      invoice: updatedInvoice || invoice,
      subscription: updatedSubscription,
    };
  },

  // ---------------- PHASE 5 SAAS: USAGE RECORDS & ROLLUPS ----------------
  async getUsageRecord(merchantId: string, yearMonth: string): Promise<IUsageRecord | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await UsageRecordModel.findOne({ merchantId, yearMonth }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IUsageRecord;
    }
    return memoryDb.usageRecords.find((u) => u.merchantId === merchantId && u.yearMonth === yearMonth) || null;
  },

  async incrementUsage(
    merchantId: string,
    yearMonth: string,
    fields: { [key in keyof IUsageRecord]?: number }
  ): Promise<IUsageRecord> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const incUpdate: any = {};
      for (const [key, val] of Object.entries(fields)) {
        if (typeof val === 'number') incUpdate[key] = val;
      }
      const doc = await UsageRecordModel.findOneAndUpdate(
        { merchantId, yearMonth },
        {
          $inc: incUpdate,
          $set: { lastUpdated: new Date() },
        },
        { upsert: true, new: true }
      ).lean();
      return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IUsageRecord;
    }

    let record = memoryDb.usageRecords.find((u) => u.merchantId === merchantId && u.yearMonth === yearMonth);
    if (!record) {
      record = {
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
      memoryDb.usageRecords.push(record);
    }

    for (const [key, val] of Object.entries(fields)) {
      if (typeof val === 'number' && (record as any)[key] !== undefined) {
        (record as any)[key] += val;
      }
    }
    record.lastUpdated = new Date().toISOString();
    return record;
  },

  async getMerchantUsageHistory(merchantId: string, limit: number = 12): Promise<IUsageRecord[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await UsageRecordModel.find({ merchantId }).sort({ yearMonth: -1 }).limit(limit).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.usageRecords
      .filter((u) => u.merchantId === merchantId)
      .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
      .slice(0, limit);
  },

  // ---------------- PHASE 5 SAAS: CUSTOM DOMAINS ----------------
  async getDomainsByMerchant(merchantId: string): Promise<IMerchantDomain[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await MerchantDomainModel.find({ merchantId }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.domains.filter((d) => d.merchantId === merchantId);
  },

  async getDomainById(id: string): Promise<IMerchantDomain | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await MerchantDomainModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchantDomain;
    }
    return memoryDb.domains.find((d) => d.id === id) || null;
  },

  async findDomainByName(domain: string): Promise<IMerchantDomain | null> {
    assertDatabaseOperational();
    const cleanDomain = domain.toLowerCase().trim();
    if (isMongoActive()) {
      const doc = await MerchantDomainModel.findOne({ domain: cleanDomain }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchantDomain;
    }
    return memoryDb.domains.find((d) => d.domain.toLowerCase().trim() === cleanDomain) || null;
  },

  async createDomain(data: Partial<IMerchantDomain>): Promise<IMerchantDomain> {
    assertDatabaseOperational();
    const id = data.id || `dom_${Date.now()}`;
    const token = data.verificationToken || `paysync-verify-${Math.random().toString(36).substring(2, 10)}`;
    if (isMongoActive()) {
      const doc = await MerchantDomainModel.create({
        ...data,
        verificationToken: token,
        _id: new mongoose.Types.ObjectId(),
      });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IMerchantDomain;
    }
    const dom: IMerchantDomain = {
      id,
      merchantId: data.merchantId!,
      domain: data.domain!.toLowerCase().trim(),
      verificationToken: token,
      verificationMethod: data.verificationMethod || 'TXT',
      verificationStatus: data.verificationStatus || 'PENDING',
      sslStatus: data.sslStatus || 'PENDING',
      verifiedAt: data.verifiedAt,
      lastCheckAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.domains.push(dom);
    return dom;
  },

  async updateDomain(id: string, updates: Partial<IMerchantDomain>): Promise<IMerchantDomain | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await MerchantDomainModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchantDomain;
    }
    const idx = memoryDb.domains.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    memoryDb.domains[idx] = { ...memoryDb.domains[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.domains[idx];
  },

  async deleteDomain(id: string, merchantId: string): Promise<boolean> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id)
        ? { $and: [{ $or: [{ _id: id }, { id }] }, { merchantId }] }
        : { id, merchantId };
      const res = await MerchantDomainModel.deleteOne(query);
      return res.deletedCount > 0;
    }
    const idx = memoryDb.domains.findIndex((d) => d.id === id && d.merchantId === merchantId);
    if (idx === -1) return false;
    memoryDb.domains.splice(idx, 1);
    return true;
  },

  // ---------------- PHASE 5 SAAS: WHITE-LABEL BRANDING ----------------
  async getBrandingByMerchant(merchantId: string): Promise<IMerchantBranding | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await MerchantBrandingModel.findOne({ merchantId }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchantBranding;
    }
    return memoryDb.brandings.find((b) => b.merchantId === merchantId) || null;
  },

  async saveBranding(merchantId: string, data: Partial<IMerchantBranding>): Promise<IMerchantBranding> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await MerchantBrandingModel.findOneAndUpdate(
        { merchantId },
        { ...data, merchantId, updatedAt: new Date() },
        { upsert: true, new: true }
      ).lean();
      return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IMerchantBranding;
    }
    const idx = memoryDb.brandings.findIndex((b) => b.merchantId === merchantId);
    const branding: IMerchantBranding = {
      id: idx !== -1 ? memoryDb.brandings[idx].id : `brand_${merchantId}`,
      merchantId,
      logoUrl: data.logoUrl,
      businessName: data.businessName,
      faviconUrl: data.faviconUrl,
      primaryColor: data.primaryColor || '#059669',
      accentColor: data.accentColor || '#047857',
      supportEmail: data.supportEmail,
      supportPhone: data.supportPhone,
      customCss: data.customCss,
      showWatermark: data.showWatermark !== undefined ? data.showWatermark : true,
      updatedAt: new Date().toISOString(),
    };
    if (idx !== -1) {
      memoryDb.brandings[idx] = branding;
    } else {
      memoryDb.brandings.push(branding);
    }
    return branding;
  },

  // ---------------- PHASE 5 SAAS: TEAM & INVITATIONS ----------------
  async getTeamMembers(merchantId: string): Promise<IUser[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await UserModel.find({ merchantId }).select('-passwordHash').lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    return memoryDb.users.filter((u) => u.merchantId === merchantId);
  },

  async getInvitationsByMerchant(merchantId: string): Promise<ITeamInvitation[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await TeamInvitationModel.find({ merchantId, status: 'PENDING' }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.teamInvitations.filter((i) => i.merchantId === merchantId && i.status === 'PENDING');
  },

  async createTeamInvitation(data: Partial<ITeamInvitation>): Promise<ITeamInvitation> {
    assertDatabaseOperational();
    const id = data.id || `invit_${Date.now()}`;
    const token = data.token || `tok_invite_${Math.random().toString(36).substring(2, 12)}`;
    const expiresAt = data.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString();
    if (isMongoActive()) {
      const doc = await TeamInvitationModel.create({
        ...data,
        token,
        expiresAt,
        _id: new mongoose.Types.ObjectId(),
      });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as ITeamInvitation;
    }
    const invitation: ITeamInvitation = {
      id,
      merchantId: data.merchantId!,
      email: data.email!.toLowerCase().trim(),
      role: data.role || 'MERCHANT_STAFF',
      token,
      status: 'PENDING',
      invitedBy: data.invitedBy || 'Merchant Admin',
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.teamInvitations.push(invitation);
    return invitation;
  },

  async findInvitationByToken(token: string): Promise<ITeamInvitation | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await TeamInvitationModel.findOne({ token }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as ITeamInvitation;
    }
    return memoryDb.teamInvitations.find((i) => i.token === token) || null;
  },

  async updateInvitation(id: string, updates: Partial<ITeamInvitation>): Promise<ITeamInvitation | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await TeamInvitationModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as ITeamInvitation;
    }
    const idx = memoryDb.teamInvitations.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    memoryDb.teamInvitations[idx] = { ...memoryDb.teamInvitations[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.teamInvitations[idx];
  },

  // ---------------- PHASE 5 SAAS: SUPPORT TICKETS ----------------
  async getTicketsByMerchant(merchantId: string): Promise<ISupportTicket[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await SupportTicketModel.find({ merchantId }).sort({ updatedAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.supportTickets
      .filter((t) => t.merchantId === merchantId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async getAllTickets(): Promise<ISupportTicket[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await SupportTicketModel.find().sort({ updatedAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return [...memoryDb.supportTickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async getTicketById(id: string): Promise<ISupportTicket | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await SupportTicketModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as ISupportTicket;
    }
    return memoryDb.supportTickets.find((t) => t.id === id) || null;
  },

  async createTicket(data: Partial<ISupportTicket>): Promise<ISupportTicket> {
    assertDatabaseOperational();
    const id = data.id || `tick_${Date.now()}`;
    const ticketNumber = data.ticketNumber || `TICK-${Math.floor(1000 + Math.random() * 9000)}`;
    if (isMongoActive()) {
      const doc = await SupportTicketModel.create({
        ...data,
        ticketNumber,
        _id: new mongoose.Types.ObjectId(),
      });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as ISupportTicket;
    }
    const ticket: ISupportTicket = {
      id,
      merchantId: data.merchantId!,
      ticketNumber,
      subject: data.subject!,
      category: data.category || 'TECHNICAL',
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      messages: data.messages || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.supportTickets.push(ticket);
    return ticket;
  },

  async addTicketMessage(ticketId: string, message: ISupportTicketMessage): Promise<ISupportTicket | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(ticketId) ? { $or: [{ _id: ticketId }, { id: ticketId }] } : { id: ticketId };
      const doc = await SupportTicketModel.findOneAndUpdate(
        query,
        {
          $push: { messages: message },
          $set: { updatedAt: new Date() },
        },
        { new: true }
      ).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as ISupportTicket;
    }
    const ticket = memoryDb.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) return null;
    ticket.messages.push(message);
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  },

  async updateTicketStatus(ticketId: string, status: string): Promise<ISupportTicket | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(ticketId) ? { $or: [{ _id: ticketId }, { id: ticketId }] } : { id: ticketId };
      const doc = await SupportTicketModel.findOneAndUpdate(query, { status, updatedAt: new Date() }, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as ISupportTicket;
    }
    const ticket = memoryDb.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) return null;
    ticket.status = status as any;
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  },

  // ---------------- PHASE 5 SAAS: MANUAL REFUNDS ----------------
  async getRefundsByMerchant(merchantId: string): Promise<IManualRefund[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await ManualRefundModel.find({ merchantId }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.manualRefunds.filter((r) => r.merchantId === merchantId);
  },

  async getAllRefunds(): Promise<IManualRefund[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await ManualRefundModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.manualRefunds;
  },

  async getRefundById(id: string): Promise<IManualRefund | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await ManualRefundModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IManualRefund;
    }
    return memoryDb.manualRefunds.find((r) => r.id === id) || null;
  },

  async createRefund(data: Partial<IManualRefund>): Promise<IManualRefund> {
    assertDatabaseOperational();
    const id = data.id || `ref_${Date.now()}`;
    if (isMongoActive()) {
      const doc = await ManualRefundModel.create({ ...data, _id: new mongoose.Types.ObjectId() });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IManualRefund;
    }
    const refund: IManualRefund = {
      id,
      paymentId: data.paymentId!,
      merchantId: data.merchantId!,
      amount: data.amount!,
      currency: data.currency || 'BDT',
      provider: data.provider || 'BKASH',
      customerPhone: data.customerPhone,
      reason: data.reason || 'Customer refund request',
      status: data.status || 'REFUND_REQUESTED',
      externalReference: data.externalReference,
      operator: data.operator,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.manualRefunds.push(refund);
    return refund;
  },

  async updateRefund(id: string, updates: Partial<IManualRefund>): Promise<IManualRefund | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await ManualRefundModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IManualRefund;
    }
    const idx = memoryDb.manualRefunds.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    memoryDb.manualRefunds[idx] = { ...memoryDb.manualRefunds[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.manualRefunds[idx];
  },

  // ---------------- PHASE 5 SAAS: REVENUE, RECONCILIATION & OPERATIONS ----------------
  async getRevenueMetrics(): Promise<any> {
    assertDatabaseOperational();
    const allInvoices = await this.getAllInvoices();
    const paidInvoices = allInvoices.filter((i) => i.status === 'PAID');
    const totalSubscriptionRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

    const subscriptions = await this.getAllSubscriptions();
    const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
    const trialSubs = subscriptions.filter((s) => s.status === 'TRIAL');

    // Monthly Recurring Revenue (MRR) calculation
    let mrr = 0;
    for (const sub of activeSubs) {
      if (sub.billingCycle === 'YEARLY') {
        mrr += Math.round((sub.pricePaid || 0) / 12);
      } else {
        mrr += sub.pricePaid || 0;
      }
    }
    const arr = mrr * 12;

    // Platform Fee Revenue (from completed payments)
    const payments = await this.getAllPayments();
    const completedPayments = payments.filter((p) => p.status === 'COMPLETED');
    const totalPlatformFeeRevenue = completedPayments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
    const totalProcessedVolume = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalMerchantNetPayout = completedPayments.reduce((sum, p) => sum + (p.merchantNetAmount || p.amount), 0);

    // Churn Rate estimation
    const totalTrackedSubs = subscriptions.length || 1;
    const cancelledSubs = subscriptions.filter((s) => s.status === 'CANCELLED' || s.status === 'EXPIRED').length;
    const churnRate = Math.round((cancelledSubs / totalTrackedSubs) * 100);

    return {
      mrr,
      arr,
      totalSubscriptionRevenue,
      totalPlatformFeeRevenue,
      totalProcessedVolume,
      totalMerchantNetPayout,
      activeSubscriptions: activeSubs.length,
      trialSubscriptions: trialSubs.length,
      paidInvoicesCount: paidInvoices.length,
      churnRate,
      currency: 'BDT',
    };
  },

  async getReconciliationSummary(): Promise<any> {
    assertDatabaseOperational();
    const payments = await this.getAllPayments();
    const completedPayments = payments.filter((p) => p.status === 'COMPLETED');

    const byProvider = {
      BKASH: { volume: 0, count: 0, fees: 0, net: 0 },
      NAGAD: { volume: 0, count: 0, fees: 0, net: 0 },
    };

    for (const p of completedPayments) {
      const prov = p.provider === 'NAGAD' ? 'NAGAD' : 'BKASH';
      byProvider[prov].volume += p.amount;
      byProvider[prov].count += 1;
      byProvider[prov].fees += p.platformFee || 0;
      byProvider[prov].net += p.merchantNetAmount || p.amount;
    }

    return {
      totalVolume: completedPayments.reduce((sum, p) => sum + p.amount, 0),
      totalFeeCollected: completedPayments.reduce((sum, p) => sum + (p.platformFee || 0), 0),
      totalMerchantPayable: completedPayments.reduce((sum, p) => sum + (p.merchantNetAmount || p.amount), 0),
      completedCount: completedPayments.length,
      byProvider,
    };
  },

  // Real System Overview Metrics (Combined Phases 1–5)
  async getSystemOverviewMetrics(): Promise<any> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const [
        totalMerchants,
        activeMerchants,
        totalPayments,
        successfulPayments,
        pendingPayments,
        manualReviews,
        activeDevices,
        offlineDevices,
        totalTransactions,
        totalFraudEvents,
        activeSubscriptions,
        pendingInvoices,
        volumeAgg,
      ] = await Promise.all([
        MerchantModel.countDocuments(),
        MerchantModel.countDocuments({ status: 'ACTIVE' }),
        PaymentModel.countDocuments(),
        PaymentModel.countDocuments({ status: 'COMPLETED' }),
        PaymentModel.countDocuments({ status: 'PENDING' }),
        PaymentModel.countDocuments({ status: 'MANUAL_REVIEW' }),
        DeviceModel.countDocuments({ status: 'ONLINE' }),
        DeviceModel.countDocuments({ status: { $in: ['OFFLINE', 'PENDING_PAIRING'] } }),
        TransactionModel.countDocuments(),
        FraudEventModel.countDocuments(),
        MerchantSubscriptionModel.countDocuments({ status: 'ACTIVE' }),
        BillingInvoiceModel.countDocuments({ status: 'PENDING' }),
        PaymentModel.aggregate([
          { $match: { status: 'COMPLETED' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      return {
        totalMerchants,
        activeMerchants,
        totalPayments,
        successfulPayments,
        pendingPayments,
        manualReviews,
        totalVolume: volumeAgg[0]?.total || 0,
        activeDevices,
        offlineDevices,
        totalTransactions,
        totalFraudEvents,
        activeSubscriptions,
        pendingInvoices,
      };
    }

    const payments = memoryDb.payments;
    const totalVolume = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalMerchants: memoryDb.merchants.length,
      activeMerchants: memoryDb.merchants.filter((m) => m.status === 'ACTIVE').length,
      totalPayments: payments.length,
      successfulPayments: payments.filter((p) => p.status === 'COMPLETED').length,
      pendingPayments: payments.filter((p) => p.status === 'PENDING').length,
      manualReviews: payments.filter((p) => p.status === 'MANUAL_REVIEW').length,
      totalVolume,
      activeDevices: memoryDb.devices.filter((d) => d.status === 'ONLINE').length,
      offlineDevices: memoryDb.devices.filter((d) => d.status === 'OFFLINE' || d.status === 'PENDING_PAIRING').length,
      totalTransactions: memoryDb.transactions.length,
      totalFraudEvents: memoryDb.fraudEvents.length,
      activeSubscriptions: memoryDb.subscriptions.filter((s) => s.status === 'ACTIVE').length,
      pendingInvoices: memoryDb.invoices.filter((i) => i.status === 'PENDING').length,
    };
  },

  // ---------------- BACKWARD COMPATIBILITY ALIASES & HELPERS ----------------
  async logAudit(data: Partial<IAuditLog>): Promise<void> {
    return this.createAuditLog(data);
  },

  async logFraud(data: Partial<IFraudEvent>): Promise<void> {
    return this.createFraudEvent(data);
  },

  async logWebhook(data: Partial<IWebhookLog>): Promise<IWebhookLog> {
    return this.createWebhookLog(data);
  },

  async getSettings(): Promise<ISystemSettings> {
    return this.getSystemSettings();
  },

  async updateSettings(data: Partial<ISystemSettings>): Promise<ISystemSettings> {
    return this.updateSystemSettings(data);
  },

  async findMerchantById(id: string): Promise<IMerchant | null> {
    return this.getMerchantById(id);
  },

  async listMerchants(): Promise<IMerchant[]> {
    return this.getAllMerchants();
  },

  async findTransactionByTrxId(trxId: string, provider?: string): Promise<ITransaction | null> {
    return this.getTransactionByTrxId(trxId, provider);
  },

  async getWebhooksByMerchant(merchantId: string): Promise<IWebhookLog[]> {
    return this.getWebhookLogsByMerchant(merchantId);
  },

  async getWebhookById(id: string): Promise<IWebhookLog | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }, { webhookId: id }] } : { id };
      const doc = await WebhookLogModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IWebhookLog;
    }
    return memoryDb.webhooks.find((w) => w.id === id || w.webhookId === id) || null;
  },

  async claimTransactionForPayment(
    transactionId: string,
    paymentId: string,
    metadata?: any
  ): Promise<ITransaction | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(transactionId)
        ? { _id: transactionId, used: false }
        : { id: transactionId, used: false };

      const doc = await TransactionModel.findOneAndUpdate(
        query,
        {
          used: true,
          status: 'USED',
          usedForPaymentId: paymentId,
          verificationMetadata: metadata,
        },
        { new: true }
      ).lean();

      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as ITransaction;
      return null;
    }

    const trx = memoryDb.transactions.find((t) => (t.id === transactionId || (t as any)._id === transactionId) && !t.used);
    if (!trx) return null;

    trx.used = true;
    trx.status = 'USED';
    trx.usedForPaymentId = paymentId;
    trx.verificationMetadata = metadata;
    return trx;
  },

  async completePaymentAtomically(
    paymentId: string,
    matchData: {
      matchedTrxId: string;
      matchedTransactionId: string;
      provider?: string;
      walletId?: string;
    }
  ): Promise<IPayment | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await PaymentModel.findOneAndUpdate(
        { paymentId, status: { $in: ['PENDING', 'PROCESSING', 'MANUAL_REVIEW'] } },
        {
          status: 'COMPLETED',
          matchedTrxId: matchData.matchedTrxId,
          matchedTransactionId: matchData.matchedTransactionId,
          provider: matchData.provider,
          walletId: matchData.walletId,
          completedAt: new Date(),
        },
        { new: true }
      ).lean();

      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IPayment;
      return null;
    }

    const pay = memoryDb.payments.find(
      (p) => (p.paymentId === paymentId || p.id === paymentId) && ['PENDING', 'PROCESSING', 'MANUAL_REVIEW'].includes(p.status)
    );
    if (!pay) return null;

    pay.status = 'COMPLETED';
    pay.matchedTrxId = matchData.matchedTrxId;
    pay.matchedTransactionId = matchData.matchedTransactionId;
    if (matchData.provider) pay.provider = matchData.provider as any;
    if (matchData.walletId) pay.walletId = matchData.walletId;
    pay.completedAt = new Date().toISOString();
    pay.updatedAt = new Date().toISOString();
    return pay;
  },

  async releaseClaimedTransaction(transactionId: string): Promise<boolean> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(transactionId) ? { _id: transactionId } : { id: transactionId };
      await TransactionModel.findOneAndUpdate(query, {
        used: false,
        status: 'UNVERIFIED',
        usedForPaymentId: undefined,
      });
      return true;
    }

    const trx = memoryDb.transactions.find((t) => t.id === transactionId || (t as any)._id === transactionId);
    if (trx) {
      trx.used = false;
      trx.status = 'UNVERIFIED';
      trx.usedForPaymentId = undefined;
      return true;
    }
    return false;
  },

  async markStaleDevicesOffline(staleThreshold: string): Promise<number> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const res = await DeviceModel.updateMany(
        { status: 'ONLINE', lastSeenAt: { $lt: new Date(staleThreshold) } },
        { status: 'OFFLINE' }
      );
      return res.modifiedCount;
    }
    let count = 0;
    for (const d of memoryDb.devices) {
      if (d.status === 'ONLINE' && d.lastSeenAt && new Date(d.lastSeenAt).getTime() < new Date(staleThreshold).getTime()) {
        d.status = 'OFFLINE';
        d.updatedAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  },

  async getIdempotencyRecord(key: string, merchantId?: string): Promise<any | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await IdempotencyModel.findOne({ key, merchantId: merchantId || 'global' }).lean();
      return doc ? { statusCode: doc.statusCode, responseBody: doc.responseBody } : null;
    }
    if (!(memoryDb as any).idempotencyMap) (memoryDb as any).idempotencyMap = new Map<string, any>();
    const entry = (memoryDb as any).idempotencyMap.get(`${merchantId || 'global'}:${key}`);
    return entry ? { statusCode: entry.statusCode, responseBody: entry.responseBody } : null;
  },

  async saveIdempotencyRecord(
    key: string,
    merchantId: string,
    method: string,
    path: string,
    statusCode: number,
    responseBody: any
  ): Promise<void> {
    return this.saveIdempotentResponse(key, merchantId, method, path, statusCode, responseBody);
  },

  async findUserByEmail(email: string): Promise<IUser | null> {
    return this.getUserByEmail(email);
  },

  async findUserById(id: string): Promise<IUser | null> {
    return this.getUserById(id);
  },

  async findDeviceByPairingToken(token: string): Promise<IDevice | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await DeviceModel.findOne({ pairingToken: token }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IDevice;
    }
    return memoryDb.devices.find((d) => d.pairingToken === token) || null;
  },

  async findTransactionByHash(hash: string): Promise<ITransaction | null> {
    return this.getTransactionByHash(hash);
  },

  async getPaymentByOrderId(orderId: string, merchantId: string): Promise<IPayment | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await PaymentModel.findOne({
        $or: [{ orderId }, { invoiceId: orderId }],
        merchantId,
      }).lean();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as IPayment;
    }
    return (
      memoryDb.payments.find(
        (p) => (p.orderId === orderId || p.invoiceId === orderId) && p.merchantId === merchantId
      ) || null
    );
  },

  async cancelPayment(
    paymentId: string,
    merchantId?: string
  ): Promise<{ success: boolean; payment?: IPayment; error?: string }> {
    assertDatabaseOperational();
    const payment = await this.getPaymentByPaymentId(paymentId) || await this.getPaymentById(paymentId);
    if (!payment) {
      return { success: false, error: 'PAYMENT_NOT_FOUND' };
    }
    if (merchantId && payment.merchantId !== merchantId) {
      return { success: false, error: 'UNAUTHORIZED_ACCESS' };
    }
    if (payment.status === 'COMPLETED') {
      return { success: false, error: 'CANNOT_CANCEL_COMPLETED_PAYMENT' };
    }
    if (payment.status === 'CANCELLED') {
      return { success: true, payment };
    }
    const updated = await this.updatePayment(payment.id, { status: 'CANCELLED' });
    return { success: true, payment: updated || undefined };
  },

  async rotateApiKey(id: string, merchantId: string): Promise<{ apiKey: IApiKey; rawSecret: string } | null> {
    assertDatabaseOperational();
    const rawSecret = `ps_sec_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
    const secretHash = rawSecret; // bcrypt or direct hash in repo

    const updated = await this.updateApiKey(id, { secretHash });
    if (!updated) return null;
    return { apiKey: updated, rawSecret };
  },

  async toggleApiKeyStatus(id: string, merchantId: string): Promise<IApiKey | null> {
    assertDatabaseOperational();
    const key = await this.getApiKeyById(id);
    if (!key || key.merchantId !== merchantId) return null;
    const newStatus = key.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
    return this.updateApiKey(id, { status: newStatus as any });
  },

  // ---------------- ANDROID RELEASE OPERATIONS ----------------
  async getLatestPublishedRelease(): Promise<IAndroidRelease | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await AndroidReleaseModel.findOne({ isPublished: true, isLatest: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IAndroidRelease;
      
      // Fallback: newest published by versionCode
      const fallback = await AndroidReleaseModel.findOne({ isPublished: true }).sort({ versionCode: -1 }).lean();
      if (fallback) return { ...fallback, id: (fallback as any)._id?.toString() || (fallback as any).id } as unknown as IAndroidRelease;
    }
    const latest = memoryDb.androidReleases.find((r) => r.isPublished && r.isLatest);
    if (latest) return latest;
    const published = memoryDb.androidReleases.filter((r) => r.isPublished).sort((a, b) => b.versionCode - a.versionCode);
    return published[0] || null;
  },

  async getPublishedReleases(): Promise<IAndroidRelease[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await AndroidReleaseModel.find({ isPublished: true }).sort({ versionCode: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return memoryDb.androidReleases.filter((r) => r.isPublished).sort((a, b) => b.versionCode - a.versionCode);
  },

  async getAllAndroidReleases(): Promise<IAndroidRelease[]> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const docs = await AndroidReleaseModel.find().sort({ versionCode: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d._id?.toString() || d.id }));
    }
    return [...memoryDb.androidReleases].sort((a, b) => b.versionCode - a.versionCode);
  },

  async getAndroidReleaseById(id: string): Promise<IAndroidRelease | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await AndroidReleaseModel.findOne(query).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IAndroidRelease;
    }
    return memoryDb.androidReleases.find((r) => r.id === id) || null;
  },

  async getAndroidReleaseByVersion(version: string): Promise<IAndroidRelease | null> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const doc = await AndroidReleaseModel.findOne({ version: version.trim() }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IAndroidRelease;
    }
    return memoryDb.androidReleases.find((r) => r.version.trim() === version.trim()) || null;
  },

  async createAndroidRelease(data: Partial<IAndroidRelease>): Promise<IAndroidRelease> {
    assertDatabaseOperational();
    const id = data.id || `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // If setting as latest, unset other latest flags
    if (data.isLatest && data.isPublished) {
      if (isMongoActive()) {
        await AndroidReleaseModel.updateMany({ isLatest: true }, { $set: { isLatest: false } });
      } else {
        memoryDb.androidReleases.forEach((r) => { r.isLatest = false; });
      }
    }

    if (isMongoActive()) {
      const doc = await AndroidReleaseModel.create({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        downloadCount: data.downloadCount || 0,
      });
      return { ...doc.toObject(), id: doc._id.toString() } as unknown as IAndroidRelease;
    }

    const release: IAndroidRelease = {
      id,
      version: data.version!,
      versionCode: data.versionCode!,
      releaseDate: data.releaseDate || new Date().toISOString(),
      minimumAndroidVersion: data.minimumAndroidVersion || 'Android 8.0 (API 26)',
      targetAndroidVersion: data.targetAndroidVersion || 'Android 14 (API 34)',
      fileName: data.fileName!,
      fileSize: data.fileSize!,
      downloadUrl: data.downloadUrl || `/api/android/releases/${id}/download`,
      sha256: data.sha256!,
      releaseNotes: data.releaseNotes || '',
      isPublished: data.isPublished || false,
      isLatest: data.isLatest || false,
      downloadCount: data.downloadCount || 0,
      architecture: data.architecture || 'Universal (arm64-v8a, armeabi-v7a, x86_64)',
      minSdk: data.minSdk || 26,
      targetSdk: data.targetSdk || 34,
      permissions: data.permissions || [
        'android.permission.RECEIVE_SMS',
        'android.permission.READ_SMS',
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.CAMERA',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.POST_NOTIFICATIONS',
      ],
      uploadedBy: data.uploadedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.androidReleases.push(release);
    return release;
  },

  async updateAndroidRelease(id: string, updates: Partial<IAndroidRelease>): Promise<IAndroidRelease | null> {
    assertDatabaseOperational();
    // If setting as latest, unset on others
    if (updates.isLatest && (updates.isPublished ?? true)) {
      if (isMongoActive()) {
        const queryNotId = mongoose.isValidObjectId(id) ? { _id: { $ne: id } } : { id: { $ne: id } };
        await AndroidReleaseModel.updateMany(queryNotId, { $set: { isLatest: false } });
      } else {
        memoryDb.androidReleases.forEach((r) => {
          if (r.id !== id) r.isLatest = false;
        });
      }
    }

    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const doc = await AndroidReleaseModel.findOneAndUpdate(query, { ...updates, updatedAt: new Date() }, { new: true }).lean();
      if (doc) return { ...doc, id: (doc as any)._id?.toString() || (doc as any).id } as unknown as IAndroidRelease;
    }

    const idx = memoryDb.androidReleases.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    memoryDb.androidReleases[idx] = { ...memoryDb.androidReleases[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryDb.androidReleases[idx];
  },

  async setLatestAndroidRelease(id: string): Promise<IAndroidRelease | null> {
    assertDatabaseOperational();
    const release = await this.getAndroidReleaseById(id);
    if (!release) return null;
    if (!release.isPublished) {
      // Must publish to make latest
      return this.updateAndroidRelease(id, { isPublished: true, isLatest: true });
    }
    return this.updateAndroidRelease(id, { isLatest: true });
  },

  async deleteAndroidRelease(id: string): Promise<boolean> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      const res = await AndroidReleaseModel.deleteOne(query);
      return res.deletedCount > 0;
    }
    const idx = memoryDb.androidReleases.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    memoryDb.androidReleases.splice(idx, 1);
    return true;
  },

  async incrementAndroidReleaseDownloadCount(id: string): Promise<void> {
    assertDatabaseOperational();
    if (isMongoActive()) {
      const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
      await AndroidReleaseModel.updateOne(query, { $inc: { downloadCount: 1 } });
      return;
    }
    const release = memoryDb.androidReleases.find((r) => r.id === id);
    if (release) {
      release.downloadCount = (release.downloadCount || 0) + 1;
    }
  },
};
