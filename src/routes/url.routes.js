'use strict';

const { Router } = require('express');
const urlController = require('../controllers/url.controller');
const analyticsRoutes = require('./analytics.routes');
const { createUrlLimiter } = require('../middlewares/rateLimiter');
const authenticate = require('../middlewares/authenticate');

const router = Router();

/**
 * @openapi
 * /api/v1/urls:
 *   post:
 *     summary: Create a new short URL
 *     description: |
 *       Generates a short URL from a long URL.
 *       Requires Bearer token authentication (access token from /auth/login).
 *       Rate limited to 10 requests/minute per user.
 *     tags:
 *       - URLs
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originalUrl
 *             properties:
 *               originalUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/very/long/url/path?param=value"
 *               customAlias:
 *                 type: string
 *                 description: Optional custom short code (8 chars). If omitted, auto-generated.
 *                 minLength: 8
 *                 maxLength: 8
 *                 example: "my-link1"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration timestamp. After this, clicks get 404.
 *                 example: "2025-12-31T23:59:59.000Z"
 *     responses:
 *       201:
 *         description: Short URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     shortCode:
 *                       type: string
 *                       example: "a1b2c3d4"
 *                     shortUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://short.url/a1b2c3d4"
 *                     originalUrl:
 *                       type: string
 *                       format: uri
 *                     customAlias:
 *                       type: string
 *                       nullable: true
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing originalUrl
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded (10 per minute)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Custom alias already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticate, createUrlLimiter, urlController.createUrl);

/**
 * @openapi
 * /api/v1/urls/{code}:
 *   get:
 *     summary: Get metadata for a short URL
 *     description: |
 *       Returns information about a short URL without redirecting.
 *       Public endpoint — no authentication required.
 *     tags:
 *       - URLs
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 8
 *           maxLength: 8
 *           example: "a1b2c3d4"
 *         description: The short code
 *     responses:
 *       200:
 *         description: Short URL metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     shortCode:
 *                       type: string
 *                       example: "a1b2c3d4"
 *                     shortUrl:
 *                       type: string
 *                       format: uri
 *                     originalUrl:
 *                       type: string
 *                       format: uri
 *                     customAlias:
 *                       type: string
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Short URL not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:code', urlController.getUrlMetadata);

/**
 * @openapi
 * /api/v1/urls/{code}:
 *   delete:
 *     summary: Deactivate a short URL
 *     description: |
 *       Soft-deletes (deactivates) a short URL.
 *       Only the owner (user who created it) can deactivate.
 *       After deactivation, clicks return 404 but analytics history is preserved.
 *     tags:
 *       - URLs
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 8
 *           maxLength: 8
 *           example: "a1b2c3d4"
 *         description: The short code
 *     responses:
 *       200:
 *         description: Short URL deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized to deactivate this URL (not the owner)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Short URL not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:code', authenticate, urlController.deleteUrl);

/**
 * Nest analytics routes under the same :code prefix.
 * GET /api/v1/urls/:code/stats
 */
router.use('/:code', analyticsRoutes);

module.exports = router;
