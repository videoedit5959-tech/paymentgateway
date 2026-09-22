import { Request, Response, NextFunction } from 'express';
import { Repository } from '../db/repository.js';
import { sendError } from '../utils/response.js';

export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction) {
  // Always permit health checks and liveness/readiness probes
  if (req.path.startsWith('/api/health')) {
    return next();
  }

  try {
    const settings = await Repository.getSettings();
    if (settings && settings.maintenanceMode) {
      // Check if user is Super Admin via Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const jwt = await import('jsonwebtoken');
          const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'paysync_jwt_access_secret_super_secure_key_min_32_chars';
          const decoded: any = jwt.default.verify(token, JWT_SECRET);
          if (decoded && (decoded.role === 'SUPER_ADMIN' || decoded.role === 'ADMIN')) {
            return next();
          }
        } catch {
          // Fall through to 503 response
        }
      }

      // Block normal API operations during maintenance window
      return sendError(
        res,
        'MAINTENANCE_MODE_ACTIVE',
        'PaySync Gateway is currently undergoing scheduled system maintenance. Transactions and API operations will resume shortly.',
        503,
        {
          maintenanceMode: true,
          platformName: settings.platformName || 'PaySync MFS Gateway',
        }
      );
    }
  } catch {
    // If settings retrieval fails temporarily, don't crash, proceed with caution
  }

  next();
}
