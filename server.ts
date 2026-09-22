import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { connectToDatabase, getDatabaseStatus, isMongoActive } from './server/db/connect.js';
import { Repository } from './server/db/repository.js';
import { correlationIdMiddleware } from './server/middleware/correlationId.js';
import { maintenanceMiddleware } from './server/middleware/maintenance.js';
import { WebhookService } from './server/services/webhookService.js';
import { validateProductionEnvironment } from './server/utils/envValidator.js';

// Load and validate environment variables
dotenv.config();
validateProductionEnvironment();

// Route handlers
import authRoutes from './server/routes/auth.js';
import walletsRoutes from './server/routes/wallets.js';
import devicesRoutes from './server/routes/devices.js';
import smsRoutes from './server/routes/sms.js';
import paymentsRoutes from './server/routes/payments.js';
import transactionsRoutes from './server/routes/transactions.js';
import apiKeysRoutes from './server/routes/apiKeys.js';
import adminRoutes from './server/routes/admin.js';
import webhooksRoutes from './server/routes/webhooks.js';
import v1Routes from './server/routes/v1/index.js';
import billingRoutes from './server/routes/billing.js';
import domainsRoutes from './server/routes/domains.js';
import brandingRoutes from './server/routes/branding.js';
import teamRoutes from './server/routes/team.js';
import supportRoutes from './server/routes/support.js';
import refundsRoutes from './server/routes/refunds.js';
import { androidReleaseRouter } from './server/routes/androidReleases.js';

async function startServer() {
  const app = express();
  const PORT = 3000;
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

  // Production-grade security headers & CORS policy
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');

    // In production, enforce Strict-Transport-Security
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Standard CSP that allows secure assets, embedded checkout modals, and Tailwind fonts
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

  // Attempt DB Connection & Seeding
  await connectToDatabase();
  await Repository.seedMongoIfEmpty();

  // Start background workers
  WebhookService.startRetryWorker(60 * 1000); // Poll every 60 seconds

  // Start device health watchdog: check for stale devices every 45s
  setInterval(async () => {
    try {
      const staleThreshold = new Date(Date.now() - 90 * 1000).toISOString();
      await Repository.markStaleDevicesOffline(staleThreshold);
    } catch {
      // Non-blocking background check
    }
  }, 45 * 1000);

  // 1. General System Health Overview
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

  // 2. Liveness Probe (checks if HTTP event loop is responsive)
  app.get('/api/health/live', (req, res) => {
    res.status(200).json({
      status: 'ALIVE',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    });
  });

  // 3. Readiness Probe (checks if DB and critical systems are ready for traffic)
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
  app.use('/api/android/releases', androidReleaseRouter);
  app.use('/api/android', androidReleaseRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PaySync Gateway Server active at http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown handling for container environments
  const handleShutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down PaySync Gateway gracefully...`);
    server.close(() => {
      console.log('✅ HTTP server closed. PaySync process terminated safely.');
      process.exit(0);
    });
    // Force shutdown if taking longer than 10 seconds
    setTimeout(() => {
      console.error('⚠️  Graceful shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start PaySync server:', err);
  process.exit(1);
});

