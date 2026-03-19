'use strict';

const { Router } = require('express');
const urlController = require('../controllers/url.controller');
const analyticsRoutes = require('./analytics.routes');
const { createUrlLimiter } = require('../middlewares/rateLimiter');
const authenticate = require('../middlewares/authenticate');

const router = Router();

/**
 * POST /api/v1/urls
 * Create a short URL. Requires a valid access token.
 */
router.post('/', authenticate, createUrlLimiter, urlController.createUrl);

/**
 * GET /api/v1/urls/:code
 * Retrieve metadata for a short URL (JSON — no redirect). Public.
 */
router.get('/:code', urlController.getUrlMetadata);

/**
 * DELETE /api/v1/urls/:code
 * Deactivate a short URL. Only the owner may delete it.
 */
router.delete('/:code', authenticate, urlController.deleteUrl);

/**
 * Nest analytics routes under the same :code prefix.
 * GET /api/v1/urls/:code/stats
 */
router.use('/:code', analyticsRoutes);

module.exports = router;
