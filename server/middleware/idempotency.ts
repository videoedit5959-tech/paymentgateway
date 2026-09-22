import { Request, Response, NextFunction } from 'express';
import { Repository } from '../db/repository.js';

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to state-modifying requests
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return next();
  }

  const idempotencyKey = (
    req.headers['idempotency-key'] ||
    req.headers['x-idempotency-key'] ||
    req.body?.idempotencyKey
  ) as string | undefined;

  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return next();
  }

  const cleanKey = idempotencyKey.trim();
  const merchantId = (req as any).user?.merchantId || req.body?.merchantId || 'global';

  Repository.getIdempotencyRecord(cleanKey, merchantId)
    .then((existingRecord) => {
      if (existingRecord) {
        res.setHeader('X-Idempotent-Replay', 'true');
        return res.status(existingRecord.statusCode).json(existingRecord.responseBody);
      }

      // Intercept res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          Repository.saveIdempotencyRecord(
            cleanKey,
            merchantId,
            req.method,
            req.originalUrl || req.url,
            res.statusCode,
            body
          ).catch((err) => {
            console.warn('⚠️  Failed to save idempotency log:', err.message);
          });
        }
        return originalJson(body);
      };

      next();
    })
    .catch((err) => {
      console.warn('⚠️  Idempotency lookup error:', err.message);
      next();
    });
}

export const checkIdempotency = idempotencyMiddleware;

export async function saveIdempotencyResponse(
  key: string,
  merchantId: string,
  method: string,
  url: string,
  statusCode: number,
  body: any
) {
  try {
    await Repository.saveIdempotencyRecord(key, merchantId, method, url, statusCode, body);
  } catch (err: any) {
    console.warn('⚠️  Failed to save idempotency response:', err.message);
  }
}

