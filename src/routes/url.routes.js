'use strict';

const { Router } = require('express');
const urlController = require('../controllers/url.controller');
const analyticsRoutes = require('./analytics.routes');
const { createUrlLimiter } = require('../middlewares/rateLimiter');

const router = Router();

/**
 * POST /api/v1/urls
 * Create a short URL.
 * Rate limited to 10 requests/minute per IP.
 */
router.post('/', createUrlLimiter, urlController.createUrl);

/**
 * GET /api/v1/urls/:code
 * Retrieve metadata for a short URL (JSON — no redirect).
 */
router.get('/:code', urlController.getUrlMetadata);

/**
 * DELETE /api/v1/urls/:code
 * Deactivate (soft-delete) a short URL.
 */
router.delete('/:code', urlController.deleteUrl);

/**
 * Nest analytics routes under the same :code prefix.
 * GET /api/v1/urls/:code/stats
 */
router.use('/:code', analyticsRoutes);

module.exports = router;
