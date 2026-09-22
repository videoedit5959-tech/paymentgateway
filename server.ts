import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { connectToDatabase, getDatabaseStatus } from './server/db/connect.js';
import { Repository } from './server/db/repository.js';
import { correlationIdMiddleware } from './server/middleware/correlationId.js';
import { WebhookService } from './server/services/webhookService.js';

// Load environment variables
dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Basic security headers & CORS
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-API-Key,X-API-Secret,X-Device-Id,X-Device-Token,X-Request-Id,X-Timestamp,X-Signature,X-Nonce,X-Idempotency-Key'
    );
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Request correlation tracking
  app.use(correlationIdMiddleware);

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

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'PaySync MFS Payment Gateway',
      timestamp: new Date().toISOString(),
      requestId: (req as any).id,
      database: getDatabaseStatus(),
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PaySync Gateway Server active at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PaySync server:', err);
  process.exit(1);
});
