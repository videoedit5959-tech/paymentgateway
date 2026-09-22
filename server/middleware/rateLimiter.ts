import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
  skipInTests?: boolean;
}

interface HitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, HitRecord>();

// Clean up stale hits every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 3600000);
    if (record.timestamps.length === 0) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix, message } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // In test environment, optionally bypass if flag set
    if (process.env.NODE_ENV === 'test' && options.skipInTests) {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const clientKey = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let record = memoryStore.get(clientKey);
    if (!record) {
      record = { timestamps: [] };
      memoryStore.set(clientKey, record);
    }

    // Filter hits inside sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    const currentHits = record.timestamps.length;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - currentHits - 1));
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

    if (currentHits >= max) {
      return sendError(
        res,
        'RATE_LIMIT_EXCEEDED',
        message || 'Too many requests. Please slow down and try again later.',
        429,
        {
          retryAfterSeconds: Math.ceil(windowMs / 1000),
        }
      );
    }

    record.timestamps.push(now);
    next();
  };
}

// Pre-configured rate limiters based on environment or production defaults
export const authRateLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 20,
  keyPrefix: 'rl_auth',
  message: 'Too many authentication attempts. Please wait 15 minutes before retrying.',
});

export const registerRateLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS) || 30 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 10,
  keyPrefix: 'rl_register',
  message: 'Too many registration requests from this network. Please try again later.',
});

export const paymentCreationRateLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_PAYMENT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PAYMENT_MAX) || 60,
  keyPrefix: 'rl_payment_create',
  message: 'Payment creation velocity limit reached. Please throttle requests.',
});

export const verificationRateLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_VERIFY_WINDOW_MS) || 5 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_VERIFY_MAX) || 25,
  keyPrefix: 'rl_verify',
  message: 'Too many payment verification attempts. Please wait a few minutes before retrying.',
});

export const smsIngestionRateLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_SMS_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.RATE_LIMIT_SMS_MAX) || 150,
  keyPrefix: 'rl_sms_device',
  message: 'Device SMS push rate exceeded safe threshold.',
});

export const devicePairingRateLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_PAIRING_WINDOW_MS) || 10 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PAIRING_MAX) || 15,
  keyPrefix: 'rl_pairing',
  message: 'Too many device pairing attempts.',
});

export const apiKeyRateLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_APIKEY_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.RATE_LIMIT_APIKEY_MAX) || 30,
  keyPrefix: 'rl_apikey',
});
