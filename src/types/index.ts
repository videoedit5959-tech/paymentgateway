export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MERCHANT_OWNER'
  | 'MERCHANT_ADMIN'
  | 'MERCHANT_FINANCE'
  | 'MERCHANT_SUPPORT'
  | 'MERCHANT_VIEWER'
  | 'MERCHANT_STAFF'
  | 'DEVICE'
  | 'ANONYMOUS'
  | 'SYSTEM';

export type MerchantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';

export type MfsProvider = 'BKASH' | 'NAGAD';

export type WalletType = 'PERSONAL' | 'AGENT' | 'MERCHANT';

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'DISABLED' | 'PENDING_PAIRING' | 'UNPAIRED';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'MANUAL_REVIEW'
  | 'CANCELLED';

export type TransactionStatus = 'UNVERIFIED' | 'VERIFIED' | 'USED' | 'SUSPICIOUS';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';

export type BillingCycle = 'MONTHLY' | 'YEARLY';

export type InvoiceStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethodType =
  | 'MANUAL_BKASH'
  | 'MANUAL_NAGAD'
  | 'MANUAL_BANK'
  | 'GATEWAY';

export type PlanFeature =
  | 'API_ACCESS'
  | 'WEBHOOKS'
  | 'MULTIPLE_WALLETS'
  | 'MULTIPLE_DEVICES'
  | 'SANDBOX'
  | 'ADVANCED_ANALYTICS'
  | 'PRIORITY_SUPPORT'
  | 'CUSTOM_DOMAIN'
  | 'WHITE_LABEL'
  | 'TRANSACTION_EXPORT'
  | 'AUTOMATIC_MATCHING';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  merchantId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface IMerchant {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  address?: string;
  website?: string;
  status: MerchantStatus;
  webhookUrl?: string;
  webhookSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IWallet {
  id: string;
  merchantId: string;
  provider: MfsProvider;
  walletNumber: string;
  walletType: WalletType;
  displayName: string;
  status: 'ACTIVE' | 'INACTIVE';
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  deviceId?: string;
  currentBalance?: number;
  lastBalanceUpdate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDevice {
  id: string;
  deviceId: string;
  deviceToken?: string;
  merchantId: string;
  walletId?: string;
  provider?: MfsProvider;
  deviceName: string;
  status: DeviceStatus;
  appVersion: string;
  androidVersion: string;
  batteryLevel: number;
  networkStatus: 'WIFI' | 'CELLULAR' | 'NONE';
  lastSeenAt: string;
  pairingToken?: string;
  pairingTokenExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITransaction {
  id: string;
  merchantId: string;
  walletId: string;
  deviceId?: string;
  provider: MfsProvider;
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
  smsTimestamp: string;
  status: TransactionStatus;
  used: boolean;
  usedForPaymentId?: string;
  verificationMetadata?: {
    verifiedAt?: string;
    verifiedBy?: string;
    notes?: string;
    balanceCheckPassed?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IPayment {
  id: string;
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
  provider?: MfsProvider;
  walletId?: string;
  status: PaymentStatus;
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  matchedTrxId?: string;
  matchedTransactionId?: string;
  expiresAt: string;
  completedAt?: string;
  mode: 'test' | 'live';
  platformFee?: number;
  merchantNetAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IApiKey {
  id: string;
  merchantId: string;
  name: string;
  keyPrefix: string;
  secretHash: string;
  mode: 'test' | 'live';
  status?: 'ACTIVE' | 'REVOKED';
  revokedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface IWebhookLog {
  id: string;
  webhookId?: string;
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
  lastAttemptAt: string;
  nextAttemptAt?: string;
  createdAt: string;
}

export interface IFraudEvent {
  id: string;
  merchantId?: string;
  riskLevel: RiskLevel;
  type: string;
  details: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  requestId?: string;
  createdAt: string;
}

export interface IAuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole;
  merchantId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  requestId?: string;
  createdAt: string;
}

// ---------------------- PHASE 5 SAAS MODELS ----------------------

export interface IPlanLimits {
  monthlyVolumeLimit: number; // in BDT
  monthlyApiRequestsLimit: number;
  deviceLimit: number;
  walletLimit: number;
  webhookLimit: number;
  teamMembersLimit: number;
}

export interface ISubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  limits: IPlanLimits;
  features: PlanFeature[];
  platformFee: {
    percentage: number;
    fixedFee: number;
  };
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface IMerchantSubscription {
  id: string;
  merchantId: string;
  planId: string;
  planSlug: string;
  planName: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
  gracePeriodEndsAt?: string;
  pricePaid: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface IBillingInvoice {
  id: string;
  invoiceNumber: string;
  merchantId: string;
  subscriptionId?: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: PaymentMethodType;
  transactionReference?: string;
  proofUrl?: string;
  reviewer?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IUsageRecord {
  id: string;
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
  lastUpdated: string;
}

export interface IMerchantDomain {
  id: string;
  merchantId: string;
  domain: string;
  verificationToken: string;
  verificationMethod: 'TXT' | 'CNAME';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  sslStatus: 'PENDING' | 'ACTIVE' | 'ERROR';
  verifiedAt?: string;
  lastCheckAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMerchantBranding {
  id: string;
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
  createdAt?: string;
  updatedAt: string;
}

export interface ITeamInvitation {
  id: string;
  merchantId: string;
  email: string;
  role: UserRole;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISupportTicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  attachments?: string[];
  timestamp: string;
}

export interface ISupportTicket {
  id: string;
  merchantId: string;
  ticketNumber: string;
  subject: string;
  category: 'BILLING' | 'TECHNICAL' | 'DEVICE' | 'PAYMENT' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  messages: ISupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface IManualRefund {
  id: string;
  paymentId: string;
  merchantId: string;
  amount: number;
  currency: string;
  provider: MfsProvider;
  customerPhone?: string;
  reason: string;
  status: 'REFUND_REQUESTED' | 'REFUND_APPROVED' | 'REFUND_REJECTED' | 'REFUND_COMPLETED';
  externalReference?: string;
  operator?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAndroidRelease {
  id: string;
  version: string;
  versionCode: number;
  releaseDate: string;
  minimumAndroidVersion: string;
  targetAndroidVersion: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  sha256: string;
  releaseNotes: string;
  isPublished: boolean;
  isLatest: boolean;
  downloadCount: number;
  architecture: string;
  minSdk: number;
  targetSdk: number;
  permissions: string[];
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISystemSettings {
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
