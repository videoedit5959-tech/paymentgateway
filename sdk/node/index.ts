/**
 * PaySync Node.js / TypeScript SDK
 * Official client library for integrating MFS payment processing (bKash, Nagad, Rocket, Upay)
 */
import crypto from 'crypto';

export interface PaySyncConfig {
  apiKey: string;
  apiSecret?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface CreatePaymentParams {
  amount: number;
  currency?: 'BDT' | 'USD';
  orderId: string;
  description?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'MANUAL_REVIEW';
  checkoutUrl: string;
  expiresAt: string;
  createdAt: string;
}

export interface VerifyPaymentParams {
  trxId: string;
}

export class PaySyncClient {
  private apiKey: string;
  private apiSecret?: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: PaySyncConfig) {
    if (!config.apiKey) {
      throw new Error('PaySync SDK: apiKey is required');
    }
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = (config.baseUrl || 'https://api.paysync.io').replace(/\/+$/, '');
    this.timeout = config.timeout || 15000;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...(this.apiSecret ? { 'X-API-Secret': this.apiSecret } : {}),
      ...(headers || {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const json = (await res.json()) as any;
      if (!res.ok || json.success === false) {
        const error = new Error(json.error?.message || json.message || `HTTP ${res.status}`);
        (error as any).code = json.error?.code || 'API_ERROR';
        (error as any).statusCode = res.status;
        (error as any).requestId = json.requestId;
        throw error;
      }

      return json.data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Creates a new payment session
   */
  public async createPayment(params: CreatePaymentParams, idempotencyKey?: string): Promise<PaymentResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return this.request<PaymentResponse>('POST', '/payments/create', params, headers);
  }

  /**
   * Retrieves a payment by payment ID
   */
  public async getPayment(paymentId: string): Promise<any> {
    return this.request<any>('GET', `/payments/${paymentId}`);
  }

  /**
   * Retrieves status for a payment
   */
  public async getPaymentStatus(paymentId: string): Promise<any> {
    return this.request<any>('GET', `/payments/${paymentId}/status`);
  }

  /**
   * Verifies customer-submitted TrxID for a payment
   */
  public async verifyPayment(paymentId: string, params: VerifyPaymentParams): Promise<any> {
    return this.request<any>('POST', `/payments/${paymentId}/verify`, params);
  }

  /**
   * Cancels a pending payment session
   */
  public async cancelPayment(paymentId: string): Promise<any> {
    return this.request<any>('POST', `/payments/${paymentId}/cancel`);
  }

  /**
   * Lists merchant transactions
   */
  public async listTransactions(query?: { limit?: number; provider?: string; status?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.provider) params.append('provider', query.provider);
    if (query?.status) params.append('status', query.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>('GET', `/transactions${qs}`);
  }

  /**
   * Retrieves transaction by ID or TrxID
   */
  public async getTransaction(transactionId: string): Promise<any> {
    return this.request<any>('GET', `/transactions/${transactionId}`);
  }

  /**
   * Retrieves merchant profile
   */
  public async getMerchantProfile(): Promise<any> {
    return this.request<any>('GET', '/merchant/profile');
  }

  /**
   * Retrieves active merchant wallets
   */
  public async getMerchantWallets(): Promise<any[]> {
    return this.request<any[]>('GET', '/merchant/wallets');
  }

  /**
   * Verifies Webhook HMAC signature sent from PaySync
   */
  public static verifyWebhookSignature(
    payload: string | object,
    signatureHeader: string,
    webhookSecret: string,
    toleranceSeconds: number = 300
  ): boolean {
    if (!signatureHeader || !webhookSecret) return false;

    // Supports format: "t=1712345678,v1=abcdef..." or raw hex
    const parts = signatureHeader.split(',');
    let timestamp: string | null = null;
    let signature: string | null = null;

    for (const part of parts) {
      const [k, v] = part.split('=');
      if (k === 't') timestamp = v;
      if (k === 'v1' || k === 'sig') signature = v;
    }

    if (!signature) {
      signature = signatureHeader.trim();
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const dataToSign = timestamp ? `${timestamp}.${payloadString}` : payloadString;

    const expected = crypto.createHmac('sha256', webhookSecret).update(dataToSign).digest('hex');

    if (timestamp) {
      const ts = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > toleranceSeconds) {
        return false;
      }
    }

    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }
}

export default PaySyncClient;
