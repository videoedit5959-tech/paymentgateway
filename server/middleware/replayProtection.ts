import { Response, NextFunction } from 'express';
import { DeviceAuthRequest } from './deviceAuth.js';
import { Repository } from '../db/repository.js';
import { sendError } from '../utils/response.js';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FUTURE_DRIFT_MS = 60 * 1000; // 1 minute

/**
 * Middleware for strict Replay Attack Protection on Android Collector device requests.
 * Enforces timestamp freshness (anti-stale) and cryptographic nonce uniqueness.
 */
export async function deviceReplayProtection(req: DeviceAuthRequest, res: Response, next: NextFunction) {
  try {
    const deviceId = (req.device?.deviceId || req.headers['x-device-id'] || req.body?.deviceId) as string;
    const rawTimestamp = (req.headers['x-timestamp'] ||
      req.headers['x-device-timestamp'] ||
      req.body?.receivedAt ||
      req.body?.timestamp) as string;
    const nonce = (req.headers['x-nonce'] ||
      req.headers['x-device-nonce'] ||
      req.body?.nonce ||
      req.headers['x-request-id']) as string;

    if (!deviceId) {
      return sendError(res, 'DEVICE_ID_REQUIRED', 'Device ID is required for replay verification.', 400);
    }

    // 1. Clock skew verification
    if (rawTimestamp) {
      const parsedNum = Number(rawTimestamp);
      const clientTime = !isNaN(parsedNum) ? parsedNum : new Date(rawTimestamp).getTime();
      if (isNaN(clientTime) || clientTime <= 0) {
        return sendError(res, 'INVALID_TIMESTAMP', 'The provided request timestamp is invalid.', 400);
      }

      const now = Date.now();
      const age = now - clientTime;

      if (age > MAX_CLOCK_SKEW_MS) {
        return sendError(
          res,
          'STALE_REQUEST_TIMESTAMP',
          'Request timestamp is too old (> 5 minutes). Request rejected.',
          400
        );
      }

      if (clientTime - now > MAX_FUTURE_DRIFT_MS) {
        return sendError(
          res,
          'FUTURE_TIMESTAMP_DETECTED',
          'Request timestamp is in the future. Check device clock.',
          400
        );
      }
    }

    // 2. Nonce uniqueness verification
    if (nonce) {
      const isFresh = await Repository.saveDeviceNonce(deviceId, nonce);
      if (!isFresh) {
        await Repository.logFraud({
          merchantId: req.device?.merchantId,
          riskLevel: 'HIGH',
          type: 'REPLAY_ATTACK_DETECTED',
          details: `Device ${deviceId} attempted to reuse nonce ${nonce}`,
          ipAddress: req.ip,
          requestId: (req as any).id,
        });

        return sendError(
          res,
          'REPLAY_ATTACK_DETECTED',
          'This request nonce has already been consumed. Replay attack blocked.',
          409
        );
      }
    }

    next();
  } catch (err: any) {
    return sendError(res, 'REPLAY_PROTECTION_ERROR', err.message || 'Error verifying request replay.', 500);
  }
}
