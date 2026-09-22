import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { connectToDatabase } from './server/db/connect.js';
import { Repository } from './server/db/repository.js';
import { WebhookService } from './server/services/webhookService.js';
import { validateProductionEnvironment } from './server/utils/envValidator.js';
import { createApp } from './server/app.js';

// Load and validate environment variables
dotenv.config();
validateProductionEnvironment();

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  // Attempt DB Connection & Seeding
  await connectToDatabase();
  await Repository.seedMongoIfEmpty();

  const app = await createApp();

  // If running in local or container environment (not Vercel), start background workers
  if (process.env.VERCEL !== '1') {
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
  }

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

  if (process.env.VERCEL !== '1') {
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
}

startServer().catch((err) => {
  console.error('Failed to start PaySync server:', err);
  process.exit(1);
});

