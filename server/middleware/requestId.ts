import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Middleware to ensure every incoming request has a unique correlation ID (requestId).
 * Propagates X-Request-Id header from client if valid, otherwise generates a UUID.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.headers['x-request-id'] as string;
  const requestId = (incomingId && /^[a-zA-Z0-9_-]{8,64}$/.test(incomingId))
    ? incomingId
    : 'req_' + crypto.randomBytes(12).toString('hex');

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.locals.requestId = requestId;

  next();
}
