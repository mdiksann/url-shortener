'use strict';

const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');
const urlRoutes = require('./url.routes');
const authRoutes = require('./auth.routes');
const urlController = require('../controllers/url.controller');
const { redirectLimiter } = require('../middlewares/rateLimiter');

const router = Router();

// ── API Documentation ───────────────────────────────────────────────────────
// Serve Swagger UI at /api-docs
// The upstream reverse proxy (e.g. Nginx) should restrict this to internal traffic
// in production to prevent information disclosure.
router.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'URL Shortener API Docs',
  }),
);

// ── Auth routes ─────────────────────────────────────────────────────────────
router.use('/api/v1/auth', authRoutes);

// ── API routes ─────────────────────────────────────────────────────────────
router.use('/api/v1/urls', urlRoutes);

// ── Health check ───────────────────────────────────────────────────────────
// Must be under /api so it is not intercepted by the redirect handler below.
// Used by Docker HEALTHCHECK, load balancers, and uptime monitors.

/**
 * @openapi
 * /api/v1/health:
 *   get:
 *     summary: Health check for all services
 *     description: |
 *       Verifies that the API and its dependencies (PostgreSQL, Redis) are operational.
 *       Used by load balancers and kubernetes probes.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: All services are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 services:
 *                   type: object
 *                   properties:
 *                     postgres:
 *                       type: string
 *                       enum: [up, down]
 *                       example: "up"
 *                     redis:
 *                       type: string
 *                       enum: [up, down]
 *                       example: "up"
 *       503:
 *         description: One or more services are unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @openapi
 * /{code}:
 *   get:
 *     summary: Redirect to original URL
 *     description: |
 *       Resolves a short code and redirects to the original long URL.
 *       Uses HTTP 302 (temporary) redirect so browsers don't cache and analytics stay accurate.
 *       Rate limited to 60 requests/minute per IP.
 *     tags:
 *       - Redirects
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 8
 *           maxLength: 8
 *           example: "a1b2c3d4"
 *         description: The short code (8 alphanumeric characters)
 *     responses:
 *       302:
 *         description: Temporary redirect to the original URL
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: "https://example.com/very/long/url"
 *       404:
 *         description: Short code not found or deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded (60 per minute)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:code', redirectLimiter, urlController.redirectUrl);

module.exports = router;
