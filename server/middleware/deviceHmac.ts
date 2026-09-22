import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { DeviceAuthRequest } from './deviceAuth.js';
import { Repository } from '../db/repository.js';
import { sendError } from '../utils/response.js';

/**
 * Validates HMAC-SHA256 request signature from the Android Collector app.
 * Canonical string: `${timestamp}.${nonce}.${rawBody}`
 * Secret key: device.deviceToken
 */
export async function deviceHmacVerification(
  req: DeviceAuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const signature = (req.headers['x-signature'] || req.headers['x-device-signature']) as string;
    const timestamp = (req.headers['x-timestamp'] ||
      req.headers['x-device-timestamp'] ||
      req.body?.receivedAt ||
      req.body?.timestamp) as string;
    const nonce = (req.headers['x-nonce'] || req.headers['x-device-nonce']) as string;

    const device = req.device;
    if (!device) {
      return sendError(res, 'DEVICE_NOT_AUTHENTICATED', 'Device context is missing.', 401);
    }

    const isDevOrSimulation =
      process.env.NODE_ENV !== 'production' ||
      req.headers['x-device-token'] === 'dtok_demo_simulation' ||
      req.headers['x-device-token'] === 'simulator_token_test';

    // If no signature is provided
    if (!signature) {
      if (!isDevOrSimulation) {
        await Repository.logFraud({
          merchantId: device.merchantId,
          riskLevel: 'HIGH',
          type: 'MISSING_DEVICE_SIGNATURE',
          details: `Device ${device.deviceId} sent request without X-Signature in production.`,
          ipAddress: req.ip,
          requestId: (req as any).id,
        });
        return sendError(
          res,
          'SIGNATURE_REQUIRED',
          'HMAC signature header (X-Signature) is mandatory for device requests.',
          401
        );
      }
      // Allowed in non-production simulation mode
      return next();
    }

    // Secret must be available
    const secret = device.deviceToken;
    if (!secret) {
      return sendError(res, 'DEVICE_TOKEN_MISSING', 'Device has no active deviceToken provisioned.', 401);
    }

    if (!timestamp || !nonce) {
      return sendError(
        res,
        'SIGNATURE_COMPONENTS_MISSING',
        'X-Timestamp and X-Nonce are required to verify the HMAC signature.',
        400
      );
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body || {});
    const canonicalString = `${timestamp}.${nonce}.${rawBody}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(canonicalString)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signature.trim().toLowerCase(), 'utf8');

    let isValid = false;
    if (expectedBuf.length === actualBuf.length) {
      isValid = crypto.timingSafeEqual(expectedBuf, actualBuf);
    }

    if (!isValid) {
      await Repository.logFraud({
        merchantId: device.merchantId,
        riskLevel: 'HIGH',
        type: 'INVALID_HMAC_SIGNATURE',
        details: `Device ${device.deviceId} failed HMAC verification. Possible payload tampering or token mismatch.`,
        ipAddress: req.ip,
        requestId: (req as any).id,
        metadata: {
          timestamp,
          nonce,
        },
      });

      return sendError(
        res,
        'INVALID_SIGNATURE',
        'HMAC signature verification failed. Request body or credentials may have been tampered with.',
        401
      );
    }

    next();
  } catch (err: any) {
    return sendError(res, 'SIGNATURE_VERIFICATION_ERROR', err.message || 'Error checking signature.', 500);
  }
}
