import express from 'express';
import { getDatabaseStatus } from './db/connect.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { maintenanceMiddleware } from './middleware/maintenance.js';

// Route handlers
import authRoutes from './routes/auth.js';
import walletsRoutes from './routes/wallets.js';
import devicesRoutes from './routes/devices.js';
import smsRoutes from './routes/sms.js';
import paymentsRoutes from './routes/payments.js';
import transactionsRoutes from './routes/transactions.js';
import apiKeysRoutes from './routes/apiKeys.js';
import adminRoutes from './routes/admin.js';
import webhooksRoutes from './routes/webhooks.js';
import v1Routes from './routes/v1/index.js';
import billingRoutes from './routes/billing.js';
import domainsRoutes from './routes/domains.js';
import brandingRoutes from './routes/branding.js';
import teamRoutes from './routes/team.js';
import supportRoutes from './routes/support.js';
import refundsRoutes from './routes/refunds.js';
import { cronRouter } from './routes/cron.js';
import { androidReleaseRouter } from './routes/androidReleases.js';

export async function createApp() {
  const app = express();
  const serverStartTime = Date.now();

  // Body parsers with rawBody capture for exact HMAC validation
  app.use(
    express.json({
      limit: '5mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Security headers & CORS policy
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');

    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self' *; object-src 'none';"
    );

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-API-Key,X-API-Secret,X-Device-Id,X-Device-Token,X-Request-Id,X-Timestamp,X-Signature,X-Nonce,X-Idempotency-Key'
    );
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id,X-Correlation-Id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Request correlation tracking
  app.use(correlationIdMiddleware);

  // Maintenance mode guard
  app.use(maintenanceMiddleware);

  // Health probes
  app.get('/api/health', (req, res) => {
    const memory = process.memoryUsage();
    res.json({
      status: 'ok',
      service: 'PaySync MFS Payment Gateway',
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
      timestamp: new Date().toISOString(),
      requestId: (req as any).id,
      database: getDatabaseStatus(),
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      },
    });
  });

  app.get('/api/health/live', (req, res) => {
    res.status(200).json({
      status: 'ALIVE',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    });
  });

  app.get('/api/health/ready', (req, res) => {
    const dbStatus = getDatabaseStatus();
    const isReady = dbStatus.isRealMongoConnected || !dbStatus.strictProductionMode;

    if (!isReady) {
      return res.status(503).json({
        status: 'UNREADY',
        message: 'Primary database connection is not ready.',
        database: dbStatus,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      status: 'READY',
      service: 'PaySync MFS Gateway',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/wallets', walletsRoutes);
  app.use('/api/devices', devicesRoutes);
  app.use('/api/v1/device', devicesRoutes);
  app.use('/api/v1', smsRoutes);
  app.use('/api/v1', v1Routes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/api-keys', apiKeysRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/webhooks', webhooksRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/domains', domainsRoutes);
  app.use('/api/branding', brandingRoutes);
  app.use('/api/team', teamRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/refunds', refundsRoutes);
  app.use('/api/cron', cronRouter);
  app.use('/api/android/releases', androidReleaseRouter);
  app.use('/api/android', androidReleaseRouter);

  return app;
}
