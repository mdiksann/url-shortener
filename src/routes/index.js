'use strict';

const { Router } = require('express');
const urlRoutes = require('./url.routes');
const urlController = require('../controllers/url.controller');
const { redirectLimiter } = require('../middlewares/rateLimiter');

const router = Router();

// ── API routes ─────────────────────────────────────────────────────────────
router.use('/api/v1/urls', urlRoutes);

// ── Health check ───────────────────────────────────────────────────────────
// Must be under /api so it is not intercepted by the redirect handler below.
// Used by Docker HEALTHCHECK, load balancers, and uptime monitors.
router.get('/api/v1/health', async (req, res) => {
  const { pool } = require('../config/database');
  const redisClient = require('../config/redis');

  const [pgResult, redisResult] = await Promise.allSettled([
    pool.query('SELECT 1'),
    redisClient.ping(),
  ]);

  const services = {
    postgres: pgResult.status === 'fulfilled' ? 'up' : 'down',
    redis: redisResult.status === 'fulfilled' ? 'up' : 'down',
  };

  const allUp = Object.values(services).every((s) => s === 'up');

  return res.status(allUp ? 200 : 503).json({
    success: allUp,
    timestamp: new Date().toISOString(),
    services,
  });
});

// ── Public redirect route ──────────────────────────────────────────────────
// This must be registered LAST to avoid matching /api/* paths.
// Rate limited to 60 requests/minute per IP.
router.get('/:code', redirectLimiter, urlController.redirectUrl);

module.exports = router;
