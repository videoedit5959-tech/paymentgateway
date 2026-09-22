import mongoose, { Schema, Document } from 'mongoose';

// User Schema
export interface IUserDoc extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_ADMIN' | 'MERCHANT_FINANCE' | 'MERCHANT_SUPPORT' | 'MERCHANT_VIEWER' | 'MERCHANT_STAFF';
  merchantId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: [
        'SUPER_ADMIN',
        'ADMIN',
        'MERCHANT_OWNER',
        'MERCHANT_ADMIN',
        'MERCHANT_FINANCE',
        'MERCHANT_SUPPORT',
        'MERCHANT_VIEWER',
        'MERCHANT_STAFF',
      ],
      default: 'MERCHANT_OWNER',
    },
    merchantId: { type: String, index: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

// Merchant Schema
export interface IMerchantDoc extends Document {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  address?: string;
  website?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  webhookUrl?: string;
  webhookSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchantDoc>(
  {
    businessName: { type: String, required: true },
    ownerName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    businessType: { type: String, default: 'Ecommerce' },
    address: { type: String },
    website: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED'],
      default: 'ACTIVE',
    },
    webhookUrl: { type: String },
    webhookSecret: { type: String },
  },
  { timestamps: true }
);

// Wallet Schema
export interface IWalletDoc extends Document {
  merchantId: string;
  provider: 'BKASH' | 'NAGAD';
  walletNumber: string;
  walletType: 'PERSONAL' | 'AGENT' | 'MERCHANT';
  displayName: string;
  status: 'ACTIVE' | 'INACTIVE';
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  deviceId?: string;
  currentBalance?: number;
  lastBalanceUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWalletDoc>(
  {
    merchantId: { type: String, required: true, index: true },
    provider: { type: String, enum: ['BKASH', 'NAGAD'], required: true },
    walletNumber: { type: String, required: true },
    walletType: { type: String, enum: ['PERSONAL', 'AGENT', 'MERCHANT'], default: 'PERSONAL' },
    displayName: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    verificationStatus: { type: String, enum: ['VERIFIED', 'UNVERIFIED'], default: 'VERIFIED' },
    deviceId: { type: String },
    currentBalance: { type: Number, default: 0 },
    lastBalanceUpdate: { type: Date },
  },
  { timestamps: true }
);
WalletSchema.index({ merchantId: 1, provider: 1, walletNumber: 1 }, { unique: true });

// Device Schema
export interface IDeviceDoc extends Document {
  deviceId: string;
  deviceToken?: string;
  merchantId: string;
  walletId?: string;
  provider?: 'BKASH' | 'NAGAD';
  deviceName: string;
  status: 'ONLINE' | 'OFFLINE' | 'DISABLED' | 'PENDING_PAIRING' | 'UNPAIRED';
  lastSeenAt: Date;
  appVersion: string;
  androidVersion: string;
  batteryLevel: number;
  networkStatus: 'WIFI' | 'CELLULAR' | 'NONE';
  pairingToken?: string;
  pairingTokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDeviceDoc>(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    deviceToken: { type: String },
    merchantId: { type: String, required: true, index: true },
    walletId: { type: String },
    provider: { type: String, enum: ['BKASH', 'NAGAD'] },
    deviceName: { type: String, required: true },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'DISABLED', 'PENDING_PAIRING', 'UNPAIRED'],
      default: 'PENDING_PAIRING',
    },
    lastSeenAt: { type: Date, default: Date.now },
    appVersion: { type: String, default: '1.0.0' },
    androidVersion: { type: String, default: '14' },
    batteryLevel: { type: Number, default: 100 },
    networkStatus: { type: String, enum: ['WIFI', 'CELLULAR', 'NONE'], default: 'WIFI' },
    pairingToken: { type: String },
    pairingTokenExpiresAt: { type: Date },
  },
  { timestamps: true }
);

// Transaction Schema
export interface ITransactionDoc extends Document {
  merchantId: string;
  walletId: string;
  deviceId?: string;
  provider: 'BKASH' | 'NAGAD';
  transactionType: 'RECEIVED' | 'CASH_IN' | 'PAYMENT' | 'UNKNOWN';
  trxId: string;
  amount: number;
  balance?: number;
  fee?: number;
  reference?: string;
  sender?: string;
  receiver?: string;
  rawSms: string;
  messageHash: string;
  smsTimestamp: Date;
  status: 'UNVERIFIED' | 'VERIFIED' | 'USED' | 'SUSPICIOUS';
  used: boolean;
  usedForPaymentId?: string;
  verificationMetadata?: {
    verifiedAt?: Date;
    verifiedBy?: string;
    notes?: string;
    balanceCheckPassed?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransactionDoc>(
  {
    merchantId: { type: String, required: true, index: true },
    walletId: { type: String, required: true, index: true },
    deviceId: { type: String },
    provider: { type: String, enum: ['BKASH', 'NAGAD'], required: true },
    transactionType: {
      type: String,
      enum: ['RECEIVED', 'CASH_IN', 'PAYMENT', 'UNKNOWN'],
      default: 'RECEIVED',
    },
    trxId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    balance: { type: Number },
    fee: { type: Number },
    reference: { type: String, index: true },
    sender: { type: String },
    receiver: { type: String },
    rawSms: { type: String, required: true },
    messageHash: { type: String, required: true, index: true },
    smsTimestamp: { type: Date, required: true },
    status: {
      type: String,
      enum: ['UNVERIFIED', 'VERIFIED', 'USED', 'SUSPICIOUS'],
      default: 'UNVERIFIED',
    },
    used: { type: Boolean, default: false, index: true },
    usedForPaymentId: { type: String },
    verificationMetadata: {
      verifiedAt: { type: Date },
      verifiedBy: { type: String },
      notes: { type: String },
      balanceCheckPassed: { type: Boolean },
    },
  },
  { timestamps: true }
);
TransactionSchema.index({ provider: 1, walletId: 1, trxId: 1 }, { unique: true });
TransactionSchema.index({ messageHash: 1 }, { unique: true });
TransactionSchema.index({ merchantId: 1, createdAt: -1 });

// Payment Schema
export interface IPaymentDoc extends Document {
  merchantId: string;
  paymentId: string;
  amount: number;
  currency: string;
  invoiceId: string;
  orderId?: string;
  description?: string;
  metadata?: Record<string, any>;
  customer: {
    name?: string;
    phone?: string;
    email?: string;
  };
  provider?: 'BKASH' | 'NAGAD';
  walletId?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'MANUAL_REVIEW' | 'CANCELLED';
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  matchedTrxId?: string;
  matchedTransactionId?: string;
  expiresAt: Date;
  completedAt?: Date;
  mode: 'test' | 'live';
  platformFee?: number;
  merchantNetAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPaymentDoc>(
  {
    merchantId: { type: String, required: true, index: true },
    paymentId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'BDT' },
    invoiceId: { type: String, required: true, index: true },
    orderId: { type: String, index: true },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
    customer: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    provider: { type: String, enum: ['BKASH', 'NAGAD'] },
    walletId: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'MANUAL_REVIEW', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    successUrl: { type: String },
    cancelUrl: { type: String },
    webhookUrl: { type: String },
    matchedTrxId: { type: String },
    matchedTransactionId: { type: String },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date },
    mode: { type: String, enum: ['test', 'live'], default: 'live' },
    platformFee: { type: Number, default: 0 },
    merchantNetAmount: { type: Number },
  },
  { timestamps: true }
);

// ApiKey Schema
export interface IApiKeyDoc extends Document {
  merchantId: string;
  name: string;
  keyPrefix: string;
  secretHash: string;
  mode: 'test' | 'live';
  status: 'ACTIVE' | 'REVOKED';
  revokedAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
}

const ApiKeySchema = new Schema<IApiKeyDoc>(
  {
    merchantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    keyPrefix: { type: String, required: true, unique: true },
    secretHash: { type: String, required: true },
    mode: { type: String, enum: ['test', 'live'], default: 'live' },
    status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE' },
    revokedAt: { type: Date },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

// Webhook Log Schema
export interface IWebhookLogDoc extends Document {
  webhookId: string;
  merchantId: string;
  paymentId: string;
  event: string;
  endpoint: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  attempts: number;
  responseCode?: number;
  responseBody?: string;
  payload: Record<string, any>;
  signature: string;
  lastAttemptAt: Date;
  nextAttemptAt?: Date;
  createdAt: Date;
}

const WebhookLogSchema = new Schema<IWebhookLogDoc>(
  {
    webhookId: { type: String, required: true, unique: true },
    merchantId: { type: String, required: true, index: true },
    paymentId: { type: String, required: true },
    event: { type: String, required: true },
    endpoint: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'PENDING' },
    attempts: { type: Number, default: 0 },
    responseCode: { type: Number },
    responseBody: { type: String },
    payload: { type: Schema.Types.Mixed, required: true },
    signature: { type: String, required: true },
    lastAttemptAt: { type: Date, default: Date.now },
    nextAttemptAt: { type: Date },
  },
  { timestamps: true }
);

// Audit Log Schema
export interface IAuditLogDoc extends Document {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  merchantId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  requestId?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDoc>(
  {
    actorId: { type: String, required: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, required: true },
    merchantId: { type: String, index: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    requestId: { type: String, index: true },
  },
  { timestamps: true }
);
AuditLogSchema.index({ merchantId: 1, createdAt: -1 });

// Fraud Event Schema
export interface IFraudEventDoc extends Document {
  merchantId?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  type: string;
  details: string;
  ipAddress?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const FraudEventSchema = new Schema<IFraudEventDoc>(
  {
    merchantId: { type: String, index: true },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], required: true },
    type: { type: String, required: true },
    details: { type: String, required: true },
    ipAddress: { type: String },
    requestId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);
FraudEventSchema.index({ merchantId: 1, createdAt: -1 });

// Device Nonce Schema (Replay Attack Defense)
export interface IDeviceNonceDoc extends Document {
  deviceId: string;
  nonce: string;
  createdAt: Date;
}

const DeviceNonceSchema = new Schema<IDeviceNonceDoc>(
  {
    deviceId: { type: String, required: true, index: true },
    nonce: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 900 }, // TTL 15 minutes
  },
  { timestamps: false }
);
DeviceNonceSchema.index({ deviceId: 1, nonce: 1 }, { unique: true });

// Idempotency Schema
export interface IIdempotencyDoc extends Document {
  key: string;
  merchantId?: string;
  method: string;
  path: string;
  statusCode: number;
  responseBody: any;
  createdAt: Date;
}

const IdempotencySchema = new Schema<IIdempotencyDoc>(
  {
    key: { type: String, required: true },
    merchantId: { type: String, index: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    responseBody: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now, expires: 86400 }, // TTL 24 hours
  },
  { timestamps: false }
);
IdempotencySchema.index({ key: 1, merchantId: 1 }, { unique: true });

// Settings Schema
export interface ISystemSettingsDoc extends Document {
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  autoMatchingEnabled: boolean;
  balanceVerificationEnabled: boolean;
  minPaymentAmount: number;
  maxPaymentAmount: number;
  paymentExpirationMinutes: number;
  maxVerificationAttempts: number;
  webhookMaxRetries: number;
  maintenanceMode: boolean;
  trialEnabled?: boolean;
  trialDays?: number;
  gracePeriodDays?: number;
  platformName?: string;
  platformLogo?: string;
  supportEmail?: string;
  supportPhone?: string;
  defaultCurrency?: string;
  defaultTimezone?: string;
  platformFeePercentage?: number;
  platformFeeFixed?: number;
}

const SystemSettingsSchema = new Schema<ISystemSettingsDoc>(
  {
    bkashEnabled: { type: Boolean, default: true },
    nagadEnabled: { type: Boolean, default: true },
    autoMatchingEnabled: { type: Boolean, default: true },
    balanceVerificationEnabled: { type: Boolean, default: false },
    minPaymentAmount: { type: Number, default: 10 },
    maxPaymentAmount: { type: Number, default: 100000 },
    paymentExpirationMinutes: { type: Number, default: 30 },
    maxVerificationAttempts: { type: Number, default: 5 },
    webhookMaxRetries: { type: Number, default: 5 },
    maintenanceMode: { type: Boolean, default: false },
    trialEnabled: { type: Boolean, default: true },
    trialDays: { type: Number, default: 14 },
    gracePeriodDays: { type: Number, default: 3 },
    platformName: { type: String, default: 'PaySync MFS Gateway' },
    platformLogo: { type: String },
    supportEmail: { type: String, default: 'support@paysync.io' },
    supportPhone: { type: String, default: '+880 1700-000000' },
    defaultCurrency: { type: String, default: 'BDT' },
    defaultTimezone: { type: String, default: 'Asia/Dhaka' },
    platformFeePercentage: { type: Number, default: 1.0 },
    platformFeeFixed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ---------------------- PHASE 5 SAAS MONGOOSE SCHEMAS ----------------------

// 1. Subscription Plan Schema
export interface ISubscriptionPlanDoc extends Document {
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  limits: {
    monthlyVolumeLimit: number;
    monthlyApiRequestsLimit: number;
    deviceLimit: number;
    walletLimit: number;
    webhookLimit: number;
    teamMembersLimit: number;
  };
  features: string[];
  platformFee: {
    percentage: number;
    fixedFee: number;
  };
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlanDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    monthlyPrice: { type: Number, required: true, default: 0 },
    yearlyPrice: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'BDT' },
    limits: {
      monthlyVolumeLimit: { type: Number, default: 100000 },
      monthlyApiRequestsLimit: { type: Number, default: 5000 },
      deviceLimit: { type: Number, default: 2 },
      walletLimit: { type: Number, default: 3 },
      webhookLimit: { type: Number, default: 10000 },
      teamMembersLimit: { type: Number, default: 2 },
    },
    features: [{ type: String }],
    platformFee: {
      percentage: { type: Number, default: 1.0 },
      fixedFee: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 2. Merchant Subscription Schema
export interface IMerchantSubscriptionDoc extends Document {
  merchantId: string;
  planId: string;
  planSlug: string;
  planName: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  startDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: Date;
  gracePeriodEndsAt?: Date;
  pricePaid: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSubscriptionSchema = new Schema<IMerchantSubscriptionDoc>(
  {
    merchantId: { type: String, required: true, unique: true, index: true },
    planId: { type: String, required: true, index: true },
    planSlug: { type: String, required: true },
    planName: { type: String, required: true },
    billingCycle: { type: String, enum: ['MONTHLY', 'YEARLY'], default: 'MONTHLY' },
    status: {
      type: String,
      enum: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'EXPIRED'],
      default: 'TRIAL',
      index: true,
    },
    startDate: { type: Date, default: Date.now },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    trialEndsAt: { type: Date },
    gracePeriodEndsAt: { type: Date },
    pricePaid: { type: Number, default: 0 },
    currency: { type: String, default: 'BDT' },
  },
  { timestamps: true }
);

// 3. Billing Invoice Schema
export interface IBillingInvoiceDoc extends Document {
  invoiceNumber: string;
  merchantId: string;
  subscriptionId?: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: 'MANUAL_BKASH' | 'MANUAL_NAGAD' | 'MANUAL_BANK' | 'GATEWAY';
  transactionReference?: string;
  proofUrl?: string;
  reviewer?: string;
  reviewNotes?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BillingInvoiceSchema = new Schema<IBillingInvoiceDoc>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    merchantId: { type: String, required: true, index: true },
    subscriptionId: { type: String, index: true },
    planId: { type: String, required: true },
    planName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'BDT' },
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'],
      default: 'DRAFT',
      index: true,
    },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    paymentMethod: {
      type: String,
      enum: ['MANUAL_BKASH', 'MANUAL_NAGAD', 'MANUAL_BANK', 'GATEWAY'],
    },
    transactionReference: { type: String },
    proofUrl: { type: String },
    reviewer: { type: String },
    reviewNotes: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);
BillingInvoiceSchema.index({ merchantId: 1, createdAt: -1 });

// 4. Monthly Usage Rollup Record Schema
export interface IUsageRecordDoc extends Document {
  merchantId: string;
  yearMonth: string; // YYYY-MM
  paymentVolume: number;
  paymentCount: number;
  apiRequests: number;
  apiRequestsSuccessful: number;
  apiRequestsFailed: number;
  paymentsCreated: number;
  paymentsVerified: number;
  statusPolls: number;
  webhookDispatches: number;
  lastUpdated: Date;
}

const UsageRecordSchema = new Schema<IUsageRecordDoc>(
  {
    merchantId: { type: String, required: true, index: true },
    yearMonth: { type: String, required: true, index: true },
    paymentVolume: { type: Number, default: 0 },
    paymentCount: { type: Number, default: 0 },
    apiRequests: { type: Number, default: 0 },
    apiRequestsSuccessful: { type: Number, default: 0 },
    apiRequestsFailed: { type: Number, default: 0 },
    paymentsCreated: { type: Number, default: 0 },
    paymentsVerified: { type: Number, default: 0 },
    statusPolls: { type: Number, default: 0 },
    webhookDispatches: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
UsageRecordSchema.index({ merchantId: 1, yearMonth: 1 }, { unique: true });

// 5. Merchant Domain Schema
export interface IMerchantDomainDoc extends Document {
  merchantId: string;
  domain: string;
  verificationToken: string;
  verificationMethod: 'TXT' | 'CNAME';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  sslStatus: 'PENDING' | 'ACTIVE' | 'ERROR';
  verifiedAt?: Date;
  lastCheckAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantDomainSchema = new Schema<IMerchantDomainDoc>(
  {
    merchantId: { type: String, required: true, index: true },
    domain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    verificationToken: { type: String, required: true },
    verificationMethod: { type: String, enum: ['TXT', 'CNAME'], default: 'TXT' },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    sslStatus: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'ERROR'],
      default: 'PENDING',
    },
    verifiedAt: { type: Date },
    lastCheckAt: { type: Date },
  },
  { timestamps: true }
);

// 6. Merchant Branding Schema
export interface IMerchantBrandingDoc extends Document {
  merchantId: string;
  logoUrl?: string;
  businessName?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  customCss?: string;
  showWatermark: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantBrandingSchema = new Schema<IMerchantBrandingDoc>(
  {
    merchantId: { type: String, required: true, unique: true, index: true },
    logoUrl: { type: String },
    businessName: { type: String },
    faviconUrl: { type: String },
    primaryColor: { type: String, default: '#059669' },
    accentColor: { type: String, default: '#047857' },
    supportEmail: { type: String },
    supportPhone: { type: String },
    customCss: { type: String },
    showWatermark: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 7. Team Invitation Schema (with TTL)
export interface ITeamInvitationDoc extends Document {
  merchantId: string;
  email: string;
  role: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TeamInvitationSchema = new Schema<ITeamInvitationDoc>(
  {
    merchantId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: [
        'MERCHANT_OWNER',
        'MERCHANT_ADMIN',
        'MERCHANT_FINANCE',
        'MERCHANT_SUPPORT',
        'MERCHANT_VIEWER',
        'MERCHANT_STAFF',
      ],
      default: 'MERCHANT_STAFF',
    },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'],
      default: 'PENDING',
    },
    invitedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 604800 }, // Auto delete after 7 days
  },
  { timestamps: true }
);
TeamInvitationSchema.index({ merchantId: 1, email: 1 });

// 8. Support Ticket Schema
export interface ISupportTicketDoc extends Document {
  merchantId: string;
  ticketNumber: string;
  subject: string;
  category: 'BILLING' | 'TECHNICAL' | 'DEVICE' | 'PAYMENT' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    message: string;
    attachments?: string[];
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicketDoc>(
  {
    merchantId: { type: String, required: true, index: true },
    ticketNumber: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: ['BILLING', 'TECHNICAL', 'DEVICE', 'PAYMENT', 'OTHER'],
      default: 'TECHNICAL',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    messages: [
      {
        id: { type: String, required: true },
        senderId: { type: String, required: true },
        senderName: { type: String, required: true },
        senderRole: { type: String, required: true },
        message: { type: String, required: true },
        attachments: [{ type: String }],
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);
SupportTicketSchema.index({ merchantId: 1, createdAt: -1 });

// 9. Manual Refund Schema
export interface IManualRefundDoc extends Document {
  paymentId: string;
  merchantId: string;
  amount: number;
  currency: string;
  provider: 'BKASH' | 'NAGAD';
  customerPhone?: string;
  reason: string;
  status: 'REFUND_REQUESTED' | 'REFUND_APPROVED' | 'REFUND_REJECTED' | 'REFUND_COMPLETED';
  externalReference?: string;
  operator?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ManualRefundSchema = new Schema<IManualRefundDoc>(
  {
    paymentId: { type: String, required: true, index: true },
    merchantId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'BDT' },
    provider: { type: String, enum: ['BKASH', 'NAGAD'], required: true },
    customerPhone: { type: String },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUND_REJECTED', 'REFUND_COMPLETED'],
      default: 'REFUND_REQUESTED',
      index: true,
    },
    externalReference: { type: String },
    operator: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);
ManualRefundSchema.index({ merchantId: 1, createdAt: -1 });

// Export Mongoose Models
export const UserModel = mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);
export const MerchantModel = mongoose.models.Merchant || mongoose.model<IMerchantDoc>('Merchant', MerchantSchema);
export const WalletModel = mongoose.models.Wallet || mongoose.model<IWalletDoc>('Wallet', WalletSchema);
export const DeviceModel = mongoose.models.Device || mongoose.model<IDeviceDoc>('Device', DeviceSchema);
export const TransactionModel = mongoose.models.Transaction || mongoose.model<ITransactionDoc>('Transaction', TransactionSchema);
export const PaymentModel = mongoose.models.Payment || mongoose.model<IPaymentDoc>('Payment', PaymentSchema);
export const ApiKeyModel = mongoose.models.ApiKey || mongoose.model<IApiKeyDoc>('ApiKey', ApiKeySchema);
export const WebhookLogModel = mongoose.models.WebhookLog || mongoose.model<IWebhookLogDoc>('WebhookLog', WebhookLogSchema);
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLogDoc>('AuditLog', AuditLogSchema);
export const FraudEventModel = mongoose.models.FraudEvent || mongoose.model<IFraudEventDoc>('FraudEvent', FraudEventSchema);
export const SystemSettingsModel = mongoose.models.SystemSettings || mongoose.model<ISystemSettingsDoc>('SystemSettings', SystemSettingsSchema);
export const DeviceNonceModel = mongoose.models.DeviceNonce || mongoose.model<IDeviceNonceDoc>('DeviceNonce', DeviceNonceSchema);
export const IdempotencyModel = mongoose.models.Idempotency || mongoose.model<IIdempotencyDoc>('Idempotency', IdempotencySchema);

// Phase 5 Models
export const SubscriptionPlanModel = mongoose.models.SubscriptionPlan || mongoose.model<ISubscriptionPlanDoc>('SubscriptionPlan', SubscriptionPlanSchema);
export const MerchantSubscriptionModel = mongoose.models.MerchantSubscription || mongoose.model<IMerchantSubscriptionDoc>('MerchantSubscription', MerchantSubscriptionSchema);
export const BillingInvoiceModel = mongoose.models.BillingInvoice || mongoose.model<IBillingInvoiceDoc>('BillingInvoice', BillingInvoiceSchema);
export const UsageRecordModel = mongoose.models.UsageRecord || mongoose.model<IUsageRecordDoc>('UsageRecord', UsageRecordSchema);
export const MerchantDomainModel = mongoose.models.MerchantDomain || mongoose.model<IMerchantDomainDoc>('MerchantDomain', MerchantDomainSchema);
export const MerchantBrandingModel = mongoose.models.MerchantBranding || mongoose.model<IMerchantBrandingDoc>('MerchantBranding', MerchantBrandingSchema);
export const TeamInvitationModel = mongoose.models.TeamInvitation || mongoose.model<ITeamInvitationDoc>('TeamInvitation', TeamInvitationSchema);
export const SupportTicketModel = mongoose.models.SupportTicket || mongoose.model<ISupportTicketDoc>('SupportTicket', SupportTicketSchema);
export const ManualRefundModel = mongoose.models.ManualRefund || mongoose.model<IManualRefundDoc>('ManualRefund', ManualRefundSchema);
