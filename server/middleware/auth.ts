import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Repository } from '../db/repository.js';
import { sendError } from '../utils/response.js';
import { IUser, UserRole, IApiKey } from '../../src/types/index.js';
import bcrypt from 'bcryptjs';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'paysync_jwt_access_secret_super_secure_key_min_32_chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'paysync_jwt_refresh_secret_super_secure_key_min_32_chars';

export interface AuthRequest extends Request {
  user?: IUser;
  merchantId?: string;
  deviceId?: string;
  apiKeyMode?: 'test' | 'live';
  apiKey?: IApiKey;
}

export function generateTokens(user: IUser) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    merchantId: user.merchantId,
  };

  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

export const authenticateMerchant = authenticateJwt;

export async function authenticateJwt(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'UNAUTHORIZED', 'Access token missing or malformed', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;
    const user = await Repository.getUserById(decoded.id);
    if (!user || user.status !== 'ACTIVE') {
      return sendError(res, 'USER_INACTIVE', 'User account is inactive or not found', 401);
    }

    req.user = user;
    req.merchantId = user.merchantId;
    next();
  } catch (err: any) {
    return sendError(res, 'TOKEN_INVALID', 'Invalid or expired access token', 401);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 'FORBIDDEN', 'You do not have permission to access this resource', 403);
    }
    next();
  };
}

/**
 * Authenticates Merchant API requests using X-API-Key and Secret or JWT
 */
export async function authenticateApiKey(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // 1. Check if standard JWT is supplied in Authorization header
  if (authHeader && authHeader.startsWith('Bearer ') && !authHeader.includes('ps_')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;
      const user = await Repository.getUserById(decoded.id);
      if (user && user.status === 'ACTIVE') {
        req.user = user;
        req.merchantId = user.merchantId;
        req.apiKeyMode = 'live';
        return next();
      }
    } catch {
      // Fall through to API Key check
    }
  }

  const apiKeyPrefix = (req.headers['x-api-key'] as string) || (req.query.apiKey as string);
  let apiSecret = (req.headers['x-api-secret'] as string) || (req.query.apiSecret as string);

  // Check if Bearer contains an API secret
  if (!apiSecret && authHeader && authHeader.startsWith('Bearer ps_')) {
    apiSecret = authHeader.split(' ')[1];
  }

  if (!apiKeyPrefix) {
    return sendError(
      res,
      'UNAUTHORIZED',
      'Missing API credentials. Provide X-API-Key and X-API-Secret headers or a valid Authorization Bearer token.',
      401
    );
  }

  // Allow sandbox/demo keys for quick evaluation
  if (apiKeyPrefix === 'demo_api_key_101' || apiKeyPrefix === 'ps_test_demo' || apiKeyPrefix === 'ps_live_demo') {
    req.merchantId = (req.headers['x-merchant-id'] as string) || 'merch_demo_101';
    req.apiKeyMode = apiKeyPrefix.includes('test') ? 'test' : 'live';
    return next();
  }

  // Database lookup
  const keyDoc = await Repository.getApiKeyByKeyPrefix(apiKeyPrefix);
  if (!keyDoc) {
    return sendError(res, 'UNAUTHORIZED', 'Invalid API key provided.', 401);
  }

  if (keyDoc.status === 'REVOKED') {
    return sendError(res, 'FORBIDDEN', 'This API key has been revoked.', 403);
  }

  // If secret is provided, verify against bcrypt hash
  if (apiSecret) {
    const isMatch = bcrypt.compareSync(apiSecret, keyDoc.secretHash);
    if (!isMatch) {
      return sendError(res, 'UNAUTHORIZED', 'Invalid API secret key.', 401);
    }
  } else if (process.env.NODE_ENV === 'production') {
    return sendError(res, 'UNAUTHORIZED', 'X-API-Secret header is required for production requests.', 401);
  }

  // Record usage timestamp asynchronously
  Repository.updateApiKeyLastUsed(keyDoc.keyPrefix).catch(() => {});

  req.apiKey = keyDoc;
  req.merchantId = keyDoc.merchantId;
  req.apiKeyMode = keyDoc.mode || 'live';
  next();
}

/**
 * Authenticates Android Collector device using X-Device-Id and X-Device-Token
 */
export async function authenticateDevice(req: AuthRequest, res: Response, next: NextFunction) {
  const deviceId = req.headers['x-device-id'] as string || req.body?.deviceId;
  const deviceToken = req.headers['x-device-token'] as string;

  if (!deviceId) {
    return sendError(res, 'DEVICE_ID_REQUIRED', 'Device ID is missing', 401);
  }

  const device = await Repository.getDeviceById(deviceId);
  if (!device) {
    return sendError(res, 'DEVICE_NOT_REGISTERED', 'This Android device is not registered in PaySync', 403);
  }

  if (device.status === 'DISABLED') {
    return sendError(res, 'DEVICE_DISABLED', 'This collector device has been disabled by the merchant or admin', 403);
  }

  req.deviceId = device.deviceId;
  req.merchantId = device.merchantId;
  next();
}
