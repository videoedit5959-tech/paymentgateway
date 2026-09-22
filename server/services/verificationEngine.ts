import { Repository } from '../db/repository.js';
import { IPayment, ITransaction } from '../../src/types/index.js';
import { WebhookService } from './webhookService.js';
import { BillingService } from './billingService.js';
import { isValidTrxId } from '../utils/validator.js';

export interface VerificationResult {
  success: boolean;
  payment?: IPayment;
  transaction?: ITransaction;
  errorCode?: string;
  errorMessage?: string;
}

// In-memory verification attempts counter per paymentId to prevent brute forcing
const paymentAttemptCounter = new Map<string, { count: number; lastAttempt: number }>();

export class VerificationEngine {
  /**
   * Verifies a customer-submitted TrxID against a specific payment
   */
  public static async verifyTrxId(
    paymentId: string,
    rawTrxId: string,
    ipAddress?: string,
    requestId?: string
  ): Promise<VerificationResult> {
    if (!rawTrxId || typeof rawTrxId !== 'string') {
      return {
        success: false,
        errorCode: 'INVALID_TRX_ID_FORMAT',
        errorMessage: 'A valid Transaction ID is required.',
      };
    }

    const trxId = rawTrxId.trim().toUpperCase();

    if (!isValidTrxId(trxId)) {
      return {
        success: false,
        errorCode: 'INVALID_TRX_ID_SYNTAX',
        errorMessage: 'Invalid Transaction ID syntax. Expected 8-20 alphanumeric characters.',
      };
    }

    // 1. Fetch Payment
    const payment = await Repository.getPaymentById(paymentId);
    if (!payment) {
      return {
        success: false,
        errorCode: 'PAYMENT_NOT_FOUND',
        errorMessage: 'The payment record does not exist or has been removed.',
      };
    }

    if (payment.status === 'COMPLETED') {
      return {
        success: true,
        payment,
        errorMessage: 'Payment has already been marked as completed.',
      };
    }

    // Brute-force verification defense
    const now = Date.now();
    const attempts = paymentAttemptCounter.get(payment.paymentId) || { count: 0, lastAttempt: now };
    if (now - attempts.lastAttempt > 15 * 60 * 1000) {
      attempts.count = 0;
    }
    attempts.count += 1;
    attempts.lastAttempt = now;
    paymentAttemptCounter.set(payment.paymentId, attempts);

    if (attempts.count > 6) {
      await Repository.updatePayment(payment.paymentId, { status: 'MANUAL_REVIEW' });
      await Repository.logFraud({
        merchantId: payment.merchantId,
        riskLevel: 'HIGH',
        type: 'BRUTE_FORCE_TRX_ID_ATTEMPTS',
        details: `Exceeded max verification attempts (${attempts.count}) on payment ${payment.paymentId}`,
        ipAddress,
        requestId,
      });

      return {
        success: false,
        errorCode: 'TOO_MANY_ATTEMPTS',
        errorMessage: 'Too many failed verification attempts for this payment. It has been locked for manual review.',
      };
    }

    // Check expiration
    if (new Date(payment.expiresAt).getTime() < Date.now()) {
      await Repository.updatePayment(payment.paymentId, { status: 'EXPIRED' });
      await Repository.logFraud({
        merchantId: payment.merchantId,
        riskLevel: 'LOW',
        type: 'EXPIRED_PAYMENT_VERIFICATION_ATTEMPT',
        details: `Customer attempted verification on expired payment ${payment.paymentId}`,
        ipAddress,
        requestId,
      });
      return {
        success: false,
        errorCode: 'PAYMENT_EXPIRED',
        errorMessage: 'This payment invoice has expired. Please initiate a new payment.',
      };
    }

    // 2. Fetch Transaction by TrxID
    const transaction = await Repository.findTransactionByTrxId(trxId);
    if (!transaction) {
      await Repository.logFraud({
        merchantId: payment.merchantId,
        riskLevel: 'LOW',
        type: 'NON_EXISTENT_TRX_ID',
        details: `Customer submitted unrecorded TrxID ${trxId} for payment ${payment.paymentId}`,
        ipAddress,
        requestId,
      });
      return {
        success: false,
        errorCode: 'TRANSACTION_NOT_FOUND',
        errorMessage:
          'No transaction found with this TrxID. If you just sent money, please wait 30-60 seconds for SMS synchronization and retry.',
      };
    }

    // 3. Multi-Tenant Check: Ensure transaction belongs to the same merchant
    if (transaction.merchantId !== payment.merchantId) {
      await Repository.logFraud({
        merchantId: payment.merchantId,
        riskLevel: 'HIGH',
        type: 'CROSS_MERCHANT_TRANSACTION_REUSE_ATTEMPT',
        details: `TrxID ${trxId} belongs to merchant ${transaction.merchantId} but submitted to ${payment.merchantId}`,
        ipAddress,
        requestId,
      });
      return {
        success: false,
        errorCode: 'INVALID_MERCHANT_TRANSACTION',
        errorMessage: 'The transaction does not belong to this merchant store.',
      };
    }

    // 4. Check if already used
    if (transaction.used) {
      await Repository.logFraud({
        merchantId: payment.merchantId,
        riskLevel: 'HIGH',
        type: 'DUPLICATE_TRX_ID_REUSE',
        details: `TrxID ${trxId} has already been consumed for payment ${transaction.usedForPaymentId || 'N/A'}.`,
        ipAddress,
        requestId,
      });
      return {
        success: false,
        errorCode: 'TRANSACTION_ALREADY_USED',
        errorMessage: 'This Transaction ID has already been credited for another order.',
      };
    }

    // 5. Check Provider Match (if payment specifies provider)
    if (payment.provider && transaction.provider !== payment.provider) {
      return {
        success: false,
        errorCode: 'PROVIDER_MISMATCH',
        errorMessage: `Payment was expected via ${payment.provider}, but this TrxID was received on ${transaction.provider}.`,
      };
    }

    // 6. Check Wallet Match (if payment is tied to a specific wallet)
    if (payment.walletId && transaction.walletId !== payment.walletId) {
      return {
        success: false,
        errorCode: 'WALLET_MISMATCH',
        errorMessage: 'Payment was received on a different wallet number than requested.',
      };
    }

    // 7. Check Amount Match
    const amountDifference = Math.abs(transaction.amount - payment.amount);
    if (amountDifference > 0.01) {
      await Repository.logFraud({
        merchantId: payment.merchantId,
        riskLevel: 'MEDIUM',
        type: 'AMOUNT_MISMATCH',
        details: `Expected Tk ${payment.amount}, received Tk ${transaction.amount} on TrxID ${trxId}`,
        ipAddress,
        requestId,
      });

      // Mark payment for manual review if amount is mismatched
      await Repository.updatePayment(payment.paymentId, { status: 'MANUAL_REVIEW' });
      return {
        success: false,
        errorCode: 'AMOUNT_MISMATCH',
        errorMessage: `Amount mismatch! Order requires Tk ${payment.amount}, but received Tk ${transaction.amount}. Sent to merchant for manual review.`,
      };
    }

    // 8. Timestamp validity check (SMS must not be older than 3 hours before payment creation)
    const smsTime = new Date(transaction.smsTimestamp).getTime();
    const paymentCreateTime = new Date(payment.createdAt).getTime();
    if (paymentCreateTime - smsTime > 3 * 3600 * 1000) {
      await Repository.updatePayment(payment.paymentId, { status: 'MANUAL_REVIEW' });
      return {
        success: false,
        errorCode: 'TRANSACTION_STALE',
        errorMessage: 'The transaction timestamp is too old relative to this checkout session. Sent to manual review.',
      };
    }

    // 9. ATOMIC RACE-CONDITION PROOF CLAIM
    const metadata = {
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'CUSTOMER_CHECKOUT_SUBMIT',
      notes: `Successfully verified against payment ${payment.paymentId}`,
      ipAddress,
      requestId,
    };

    const claimedTransaction = await Repository.claimTransactionForPayment(
      transaction.id,
      payment.paymentId,
      metadata
    );

    if (!claimedTransaction) {
      // Someone else claimed this transaction in the same millisecond window
      await Repository.logFraud({
        merchantId: payment.merchantId,
        riskLevel: 'HIGH',
        type: 'RACE_CONDITION_CLAIM_COLLISION',
        details: `Concurrent verification collision on TrxID ${trxId} for payment ${payment.paymentId}`,
        ipAddress,
        requestId,
      });

      return {
        success: false,
        errorCode: 'TRANSACTION_CONCURRENTLY_CLAIMED',
        errorMessage: 'This transaction was concurrently processed by another request.',
      };
    }

    // Atomic completion of payment
    const completedPayment = await Repository.completePaymentAtomically(payment.paymentId, {
      matchedTrxId: trxId,
      matchedTransactionId: transaction.id,
      provider: transaction.provider,
      walletId: transaction.walletId,
    });

    if (!completedPayment) {
      // Rollback the transaction claim if payment completion failed (e.g. race condition/expired)
      await Repository.releaseClaimedTransaction(transaction.id);
      return {
        success: false,
        errorCode: 'PAYMENT_STATE_CHANGED',
        errorMessage: 'Payment session state changed concurrently. Please refresh the invoice.',
      };
    }

    // Reset attempt counter on success
    paymentAttemptCounter.delete(payment.paymentId);

    // Record completed volume in merchant's monthly usage record
    BillingService.recordPaymentCompletion(payment.merchantId, completedPayment.amount).catch(() => {});

    // Audit log
    await Repository.logAudit({
      actorId: 'customer_checkout',
      actorEmail: payment.customer?.email || 'customer@checkout',
      actorRole: 'MERCHANT_STAFF',
      merchantId: payment.merchantId,
      action: 'PAYMENT_VERIFIED_SUCCESS',
      resourceType: 'PAYMENT',
      resourceId: payment.paymentId,
      metadata: {
        trxId,
        amount: transaction.amount,
        provider: transaction.provider,
      },
      ipAddress,
      requestId,
    });

    // 10. Dispatch Webhook
    WebhookService.dispatchPaymentEvent('payment.completed', completedPayment).catch((err) => {
      console.error('Webhook dispatch error:', err);
    });

    return {
      success: true,
      payment: completedPayment,
      transaction: claimedTransaction,
    };
  }

  /**
   * Automatic background matching when a new SMS arrives
   */
  public static async tryAutomaticMatching(transaction: ITransaction, requestId?: string): Promise<boolean> {
    const settings = await Repository.getSettings();
    if (!settings.autoMatchingEnabled) {
      return false;
    }

    // Find pending payments for this merchant and provider matching exact amount
    const payments = await Repository.getPaymentsByMerchant(transaction.merchantId);
    const eligiblePayments = payments.filter(
      (p) =>
        p.status === 'PENDING' &&
        p.amount === transaction.amount &&
        (!p.provider || p.provider === transaction.provider) &&
        (!p.walletId || p.walletId === transaction.walletId) &&
        new Date(p.expiresAt).getTime() > Date.now()
    );

    // If exactly ONE payment matches, auto-complete it atomically
    if (eligiblePayments.length === 1) {
      const match = eligiblePayments[0];

      const claimed = await Repository.claimTransactionForPayment(transaction.id, match.paymentId, {
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'AUTO_MATCHER_ENGINE',
        notes: 'Auto-matched on SMS ingestion',
        requestId,
      });

      if (!claimed) return false;

      const updated = await Repository.completePaymentAtomically(match.paymentId, {
        matchedTrxId: transaction.trxId,
        matchedTransactionId: transaction.id,
        provider: transaction.provider,
        walletId: transaction.walletId,
      });

      if (!updated) {
        // Rollback transaction claim if payment was modified concurrently
        await Repository.releaseClaimedTransaction(transaction.id);
        return false;
      }

      WebhookService.dispatchPaymentEvent('payment.completed', updated).catch(console.error);
      return true;
    } else if (eligiblePayments.length > 1) {
      // Multiple candidates with exact same amount -> set to MANUAL_REVIEW to prevent collision
      for (const p of eligiblePayments) {
        await Repository.updatePayment(p.paymentId, { status: 'MANUAL_REVIEW' });
      }
      return false;
    }

    return false;
  }
}
