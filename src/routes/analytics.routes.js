'use strict';

const { Router } = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = Router({ mergeParams: true }); // mergeParams exposes :code from the parent router

/**
 * GET /api/v1/urls/:code/stats
 * Click analytics summary for a single short URL.
 * Accepts optional ?days=N query param (1–90, default 7).
 */
router.get('/stats', analyticsController.getStats);

module.exports = router;
