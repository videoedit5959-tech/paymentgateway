import { Router, Response } from 'express';
import { Repository } from '../db/repository.js';
import { SmsParserEngine } from '../services/smsParser.js';
import { VerificationEngine } from '../services/verificationEngine.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticateDevice, DeviceAuthRequest } from '../middleware/deviceAuth.js';
import { deviceReplayProtection } from '../middleware/replayProtection.js';
import { deviceHmacVerification } from '../middleware/deviceHmac.js';
import { smsIngestionRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * Real Android SMS Ingestion API Endpoint
 * POST /api/v1/device/sms
 */
router.post(
  '/device/sms',
  smsIngestionRateLimiter,
  authenticateDevice,
  deviceHmacVerification,
  deviceReplayProtection,
  async (req: DeviceAuthRequest, res: Response) => {
    try {
      const { deviceId, message, receivedAt, messageHash, sender } = req.body;
      const device = req.device!;
      const requestId = (req as any).id;

      if (!message || typeof message !== 'string') {
        return sendError(res, 'INVALID_PAYLOAD', 'SMS message body is required', 400);
      }

      // 1. Update device heartbeat & activity status
      await Repository.updateDevice(device.deviceId, {
        lastSeenAt: new Date().toISOString(),
        status: 'ONLINE',
      });

      // 2. Compute canonical server-authoritative message hash
      const serverHash = SmsParserEngine.computeMessageHash(
        message,
        device.deviceId,
        device.provider || '',
        sender || '',
        receivedAt || ''
      );
      const effectiveHash = messageHash || serverHash;

      // 3. Duplicate SMS Ingestion Check (Replay Protection)
      const existingTransactionByHash = await Repository.findTransactionByHash(effectiveHash);
      if (existingTransactionByHash) {
        return res.status(200).json({
          success: true,
          accepted: true,
          duplicate: true,
          transactionId: existingTransactionByHash.id,
          trxId: existingTransactionByHash.trxId,
          status: existingTransactionByHash.status,
          message: 'Duplicate SMS message ignored (already ingested).',
          requestId,
        });
      }

      // 4. Authoritative Server-Side SMS Parsing
      const parsed = SmsParserEngine.parse(message, device.deviceId);
      if (!parsed.isValid || !parsed.trxId) {
        await Repository.logAudit({
          actorId: device.deviceId,
          actorEmail: 'android_collector@paysync',
          actorRole: 'MERCHANT_STAFF',
          merchantId: device.merchantId,
          action: 'SMS_REJECTED_UNRECOGNIZED_FORMAT',
          resourceType: 'SMS',
          metadata: {
            rawSnippet: message.slice(0, 100),
            reason: parsed.parseError,
          },
          ipAddress: req.ip,
          requestId,
        });

        return res.status(200).json({
          success: true,
          accepted: false,
          duplicate: false,
          reason: parsed.parseError || 'SMS does not match valid MFS transaction syntax.',
          requestId,
        });
      }

      // 5. System Settings Check (MFS Provider enabled)
      const settings = await Repository.getSettings();
      if (parsed.provider === 'BKASH' && !settings.bkashEnabled) {
        return sendError(res, 'PROVIDER_DISABLED', 'bKash processing is currently disabled system-wide.', 403);
      }
      if (parsed.provider === 'NAGAD' && !settings.nagadEnabled) {
        return sendError(res, 'PROVIDER_DISABLED', 'Nagad processing is currently disabled system-wide.', 403);
      }

      // 6. Check Duplicate TrxID for this provider & merchant
      const existingTrx = await Repository.findTransactionByTrxId(parsed.trxId, parsed.provider);
      if (existingTrx) {
        await Repository.logFraud({
          merchantId: device.merchantId,
          riskLevel: 'LOW',
          type: 'DUPLICATE_TRX_INGESTION_ATTEMPT',
          details: `TrxID ${parsed.trxId} received again via SMS on device ${device.deviceId}`,
          ipAddress: req.ip,
          requestId,
        });

        return res.status(200).json({
          success: true,
          accepted: true,
          duplicate: true,
          transactionId: existingTrx.id,
          trxId: existingTrx.trxId,
          status: existingTrx.status,
          message: 'Transaction ID already exists in database.',
          requestId,
        });
      }

      // 7. Resolve Destination Wallet
      let walletId = device.walletId;
      if (!walletId) {
        const wallets = await Repository.getWalletsByMerchant(device.merchantId);
        const matchWallet = wallets.find((w) => w.provider === parsed.provider && w.status === 'ACTIVE');
        walletId = matchWallet?.id || 'wal_default';
      }

      // 8. Save Transaction into MongoDB
      const transaction = await Repository.createTransaction({
        merchantId: device.merchantId,
        walletId,
        deviceId: device.deviceId,
        provider: parsed.provider,
        transactionType: parsed.transactionType,
        trxId: parsed.trxId,
        amount: parsed.amount,
        balance: parsed.balance,
        fee: parsed.fee,
        reference: parsed.reference,
        sender: parsed.sender || sender,
        receiver: parsed.receiver,
        rawSms: message,
        messageHash: effectiveHash,
        smsTimestamp: receivedAt || parsed.timestamp,
        status: 'VERIFIED',
        used: false,
      });

      // 9. Update wallet balance if reported in SMS
      if (parsed.balance !== undefined && walletId) {
        await Repository.updateWallet(walletId, {
          currentBalance: parsed.balance,
          lastBalanceUpdate: new Date().toISOString(),
        });
      }

      // 10. Automatic Matching Engine
      const autoMatched = await VerificationEngine.tryAutomaticMatching(transaction, requestId);

      // 11. Audit Logging
      await Repository.logAudit({
        actorId: device.deviceId,
        actorEmail: 'android_collector@paysync',
        actorRole: 'MERCHANT_STAFF',
        merchantId: device.merchantId,
        action: 'SMS_TRANSACTION_INGESTED',
        resourceType: 'TRANSACTION',
        resourceId: transaction.id,
        metadata: {
          trxId: transaction.trxId,
          amount: transaction.amount,
          provider: transaction.provider,
          autoMatched,
        },
        ipAddress: req.ip,
        requestId,
      });

      return res.status(201).json({
        success: true,
        accepted: true,
        transactionId: transaction.id,
        trxId: transaction.trxId,
        amount: transaction.amount,
        provider: transaction.provider,
        duplicate: false,
        autoMatched,
        message: 'SMS parsed and transaction registered successfully',
        requestId,
      });
    } catch (err: any) {
      return sendError(res, 'INGESTION_ERROR', err.message || 'Error processing SMS', 500);
    }
  }
);

/**
 * Batch SMS Sync Endpoint for Android Collector Offline Queue Drain
 * POST /api/v1/device/sms/batch
 */
router.post(
  '/device/sms/batch',
  smsIngestionRateLimiter,
  authenticateDevice,
  deviceHmacVerification,
  deviceReplayProtection,
  async (req: DeviceAuthRequest, res: Response) => {
    try {
      const { messages } = req.body;
      const device = req.device!;
      const requestId = (req as any).id;

      if (!Array.isArray(messages) || messages.length === 0) {
        return sendError(res, 'INVALID_BATCH', 'An array of messages is required for batch sync.', 400);
      }

      if (messages.length > 100) {
        return sendError(res, 'BATCH_TOO_LARGE', 'Batch size exceeds maximum limit of 100 messages.', 400);
      }

      // Update device heartbeat
      await Repository.updateDevice(device.deviceId, {
        lastSeenAt: new Date().toISOString(),
        status: 'ONLINE',
      });

      const results: any[] = [];
      let processed = 0;
      let duplicates = 0;
      let failed = 0;

      for (const item of messages.slice(0, 50)) {
        // Cap batch at 50 to avoid timeout
        const { message, receivedAt, sender, messageHash } = item;
        if (!message || typeof message !== 'string') {
          failed++;
          results.push({ accepted: false, error: 'Empty message' });
          continue;
        }

        const serverHash = SmsParserEngine.computeMessageHash(
          message,
          device.deviceId,
          device.provider || '',
          sender || '',
          receivedAt || ''
        );
        const effectiveHash = messageHash || serverHash;

        const existingByHash = await Repository.findTransactionByHash(effectiveHash);
        if (existingByHash) {
          duplicates++;
          results.push({ accepted: true, duplicate: true, trxId: existingByHash.trxId });
          continue;
        }

        const parsed = SmsParserEngine.parse(message, device.deviceId);
        if (!parsed.isValid || !parsed.trxId) {
          failed++;
          results.push({ accepted: false, duplicate: false, reason: parsed.parseError });
          continue;
        }

        const existingTrx = await Repository.findTransactionByTrxId(parsed.trxId, parsed.provider);
        if (existingTrx) {
          duplicates++;
          results.push({ accepted: true, duplicate: true, trxId: existingTrx.trxId });
          continue;
        }

        let walletId = device.walletId;
        if (!walletId) {
          const wallets = await Repository.getWalletsByMerchant(device.merchantId);
          const match = wallets.find((w) => w.provider === parsed.provider && w.status === 'ACTIVE');
          walletId = match?.id || 'wal_default';
        }

        const transaction = await Repository.createTransaction({
          merchantId: device.merchantId,
          walletId,
          deviceId: device.deviceId,
          provider: parsed.provider,
          transactionType: parsed.transactionType,
          trxId: parsed.trxId,
          amount: parsed.amount,
          balance: parsed.balance,
          fee: parsed.fee,
          reference: parsed.reference,
          sender: parsed.sender || sender,
          receiver: parsed.receiver,
          rawSms: message,
          messageHash: effectiveHash,
          smsTimestamp: receivedAt || parsed.timestamp,
          status: 'VERIFIED',
          used: false,
        });

        await VerificationEngine.tryAutomaticMatching(transaction, requestId);
        processed++;
        results.push({ accepted: true, duplicate: false, trxId: transaction.trxId, amount: transaction.amount });
      }

      await Repository.logAudit({
        actorId: device.deviceId,
        actorEmail: 'android_collector@paysync',
        actorRole: 'MERCHANT_STAFF',
        merchantId: device.merchantId,
        action: 'SMS_BATCH_DRAIN',
        resourceType: 'SMS',
        metadata: {
          total: messages.length,
          processed,
          duplicates,
          failed,
        },
        ipAddress: req.ip,
        requestId,
      });

      return res.status(200).json({
        success: true,
        batchSize: messages.length,
        processed,
        duplicates,
        failed,
        results,
        requestId,
      });
    } catch (err: any) {
      return sendError(res, 'BATCH_SYNC_ERROR', err.message || 'Error processing batch SMS sync', 500);
    }
  }
);

export default router;
