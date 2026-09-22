import crypto from 'crypto';
import { Repository } from '../db/repository.js';
import { IPayment, IWebhookLog } from '../../src/types/index.js';

const BACKOFF_SCHEDULE_MINUTES = [1, 5, 15, 60, 180]; // Exponential backoff intervals

export class WebhookService {
  /**
   * Signs the webhook payload using HMAC-SHA256
   */
  public static signPayload(payload: any, secret: string): string {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
  }

  /**
   * Validates received webhook signature using constant-time comparison
   */
  public static verifySignature(payload: any, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    try {
      const expected = this.signPayload(payload, secret);
      const expectedBuf = Buffer.from(expected, 'hex');
      const signatureBuf = Buffer.from(signature, 'hex');
      if (expectedBuf.length !== signatureBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, signatureBuf);
    } catch {
      return false;
    }
  }

  /**
   * Dispatches an event webhook to merchant endpoint
   */
  public static async dispatchPaymentEvent(
    event:
      | 'payment.created'
      | 'payment.processing'
      | 'payment.completed'
      | 'payment.failed'
      | 'payment.manual_review',
    payment: IPayment
  ): Promise<IWebhookLog | null> {
    const merchant = await Repository.findMerchantById(payment.merchantId);
    if (!merchant || !merchant.webhookUrl) {
      return null;
    }

    const payload = {
      event,
      paymentId: payment.paymentId,
      invoiceId: payment.invoiceId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      trxId: payment.matchedTrxId || null,
      status: payment.status,
      customer: payment.customer,
      timestamp: new Date().toISOString(),
    };

    const secret =
      merchant.webhookSecret ||
      process.env.WEBHOOK_SIGNING_SECRET ||
      'paysync_default_webhook_secret';
    const signature = this.signPayload(payload, secret);

    return await this.executeDelivery({
      merchantId: merchant.id,
      paymentId: payment.paymentId,
      endpoint: merchant.webhookUrl,
      event,
      payload,
      signature,
      attemptNumber: 1,
    });
  }

  /**
   * Internal execution of HTTP POST with timeout and status recording
   */
  private static async executeDelivery(params: {
    merchantId: string;
    paymentId: string;
    endpoint: string;
    event: string;
    payload: any;
    signature: string;
    attemptNumber: number;
    logId?: string;
  }): Promise<IWebhookLog> {
    const { merchantId, paymentId, endpoint, event, payload, signature, attemptNumber, logId } = params;

    let responseCode = 0;
    let responseBody = '';
    let success = false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const eventId = logId || `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const eventTimestamp = new Date().toISOString();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PaySync-Signature': signature,
          'X-PaySync-Event': event,
          'X-PaySync-Attempt': attemptNumber.toString(),
          'X-PaySync-Event-Id': eventId,
          'X-PaySync-Timestamp': eventTimestamp,
          'User-Agent': 'PaySync-Webhook-Engine/2.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      responseCode = response.status;
      success = response.ok;
      try {
        const text = await response.text();
        responseBody = text.slice(0, 1000);
      } catch {
        responseBody = success ? 'OK' : 'Failed to read response body';
      }
    } catch (err: any) {
      responseCode = 0;
      responseBody = err.message || 'Connection timeout or network error';
      success = false;
    } finally {
      clearTimeout(timeoutId);
    }

    const status = success ? 'SUCCESS' : 'FAILED';
    let nextAttemptAt: Date | undefined;

    // Differentiate transient vs permanent failures:
    // Do NOT retry permanent 4xx client errors (400, 401, 403, 404, 405, 410, 422) except 408 (Request Timeout) and 429 (Too Many Requests)
    const isTransientError =
      !success && (responseCode === 0 || responseCode === 408 || responseCode === 429 || responseCode >= 500);

    if (isTransientError && attemptNumber < 5) {
      const backoffMin = BACKOFF_SCHEDULE_MINUTES[attemptNumber - 1] || 60;
      nextAttemptAt = new Date(Date.now() + backoffMin * 60 * 1000);
    }

    if (logId) {
      // Update existing retry log
      await Repository.updateWebhookLog(logId, {
        status,
        attempts: attemptNumber,
        responseCode,
        responseBody,
        lastAttemptAt: new Date().toISOString(),
        ...(nextAttemptAt ? { nextAttemptAt: nextAttemptAt.toISOString() } : {}),
      });
      return {
        id: logId,
        merchantId,
        paymentId,
        event,
        endpoint,
        status,
        attempts: attemptNumber,
        responseCode,
        responseBody,
        payload,
        signature,
        lastAttemptAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    }

    // First time log
    return await Repository.logWebhook({
      merchantId,
      paymentId,
      event,
      endpoint,
      status,
      attempts: attemptNumber,
      responseCode,
      responseBody,
      payload,
      signature,
      ...(nextAttemptAt ? { nextAttemptAt: nextAttemptAt.toISOString() } : {}),
    });
  }

  /**
   * Background process to re-deliver failed webhooks that have reached nextAttemptAt
   */
  public static async processPendingRetries(): Promise<number> {
    try {
      const pendingLogs = await Repository.getPendingWebhooks(10);
      if (!pendingLogs || pendingLogs.length === 0) return 0;

      let processedCount = 0;
      for (const log of pendingLogs) {
        const logId = log.id || (log as any)._id?.toString();
        // Lease lock: advance nextAttemptAt by 2 minutes to prevent duplicate concurrent processing
        await Repository.updateWebhookLog(logId, {
          nextAttemptAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        });

        const nextAttempt = (log.attempts || 1) + 1;
        await this.executeDelivery({
          merchantId: log.merchantId,
          paymentId: log.paymentId,
          endpoint: log.endpoint,
          event: log.event,
          payload: log.payload,
          signature: log.signature,
          attemptNumber: nextAttempt,
          logId,
        });
        processedCount++;
      }
      return processedCount;
    } catch (err: any) {
      console.warn('⚠️  Webhook retry processor encountered error:', err.message);
      return 0;
    }
  }

  /**
   * Starts background interval for webhook retries
   */
  public static startRetryWorker(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      this.processPendingRetries().catch((err) => {
        console.warn('⚠️  Webhook retry worker unhandled rejection:', err.message);
      });
    }, intervalMs);
  }

  /**
   * Sends a manual test ping webhook
   */
  public static async sendTestWebhook(merchantId: string, testUrl?: string): Promise<{ success: boolean; log: IWebhookLog }> {
    const merchant = await Repository.findMerchantById(merchantId);
    const targetUrl = testUrl || merchant?.webhookUrl;

    if (!targetUrl) {
      throw new Error('No webhook endpoint configured for this merchant.');
    }

    const payload = {
      event: 'test.ping',
      merchantId,
      message: 'PaySync Webhook Delivery Test',
      timestamp: new Date().toISOString(),
    };

    const secret = merchant?.webhookSecret || process.env.WEBHOOK_SIGNING_SECRET || 'paysync_test_secret';
    const signature = this.signPayload(payload, secret);

    const log = await this.executeDelivery({
      merchantId,
      paymentId: 'test_' + Date.now(),
      endpoint: targetUrl,
      event: 'test.ping',
      payload,
      signature,
      attemptNumber: 1,
    });

    return {
      success: log.status === 'SUCCESS',
      log,
    };
  }
}
