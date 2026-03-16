'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config/index');
const redisClient = require('./config/redis');
const { pool } = require('./config/database');
const routes = require('./routes/index');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const { startCleanupJob } = require('./jobs/cleanupExpiredUrls');

async function createApp() {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────────
  // helmet sets sensible defaults: X-Content-Type-Options, X-Frame-Options,
  // Strict-Transport-Security, etc.
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: config.NODE_ENV === 'production'
      ? config.BASE_URL   // Restrict to your own domain in production
      : '*',
    methods: ['GET', 'POST', 'DELETE'],
  }));

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' })); // Reject oversized bodies
  app.use(express.urlencoded({ extended: false }));

  // ── Request logging ───────────────────────────────────────────────────────
  // 'dev' in development (coloured), 'combined' in production (Apache format)
  app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));

  // ── Trust proxy ───────────────────────────────────────────────────────────
  // Required when running behind Nginx or a cloud load balancer.
  // Makes req.ip return the real client IP rather than the proxy's IP,
  // which is essential for rate limiting to work correctly.
  if (config.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use(routes);

  // ── Error handling ────────────────────────────────────────────────────────
  // Order matters: notFound must come before errorHandler.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

async function startServer() {
  // Connect to Redis before accepting traffic —
  // rate limiter and cache depend on it being available.
  await redisClient.connect();
  console.log('[Redis] Connected');

  const app = await createApp();

  const server = app.listen(config.PORT, () => {
    console.log(`[Server] Running in ${config.NODE_ENV} mode on port ${config.PORT}`);
    console.log(`[Server] Base URL: ${config.BASE_URL}`);
  });

  // Start the background job that deactivates expired URLs daily
  const cleanupJob = startCleanupJob();

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // SIGTERM is sent by Docker / Kubernetes when stopping a container.
  // SIGINT is sent when you press Ctrl+C in development.
  //
  // Graceful shutdown means:
  //  1. Stop accepting new connections immediately
  //  2. Wait for in-flight requests to complete
  //  3. Release DB and Redis connections cleanly
  //  4. Exit with code 0 (success)
  //
  // Without this, containers get killed mid-request, causing errors for users.
  const shutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal} — shutting down gracefully...`);

    server.close(async () => {
      try {
        cleanupJob.stop();
        console.log('[Cleanup] Job stopped');

        await pool.end();
        console.log('[PostgreSQL] Connection pool closed');

        await redisClient.quit();
        console.log('[Redis] Connection closed');

        console.log('[Server] Shutdown complete');
        process.exit(0);
      } catch (err) {
        console.error('[Server] Error during shutdown:', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Surface unhandled promise rejections loudly in development
  process.on('unhandledRejection', (reason) => {
    console.error('[Process] Unhandled Promise Rejection:', reason);
    if (config.NODE_ENV === 'production') {
      shutdown('unhandledRejection');
    }
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
