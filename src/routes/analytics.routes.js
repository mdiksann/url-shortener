'use strict';

const { Router } = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = Router({ mergeParams: true }); // mergeParams exposes :code from the parent router

/**
 * @openapi
 * /api/v1/urls/{code}/stats:
 *   get:
 *     summary: Get click analytics for a short URL
 *     description: |
 *       Returns aggregated click statistics for the past N days.
 *       Includes total clicks, device analytics, top referers, and daily breakdown.
 *       Public endpoint — no authentication required.
 *     tags:
 *       - Analytics
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
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 7
 *           example: 7
 *         description: Number of days to analyze (default 7, max 90)
 *     responses:
 *       200:
 *         description: Click analytics for the URL
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
 *                     totalClicks:
 *                       type: integer
 *                       example: 142
 *                     period:
 *                       type: string
 *                       example: "last_7_days"
 *                     clicksByDay:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2024-05-01"
 *                           clicks:
 *                             type: integer
 *                             example: 20
 *                     clicksByDevice:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           deviceType:
 *                             type: string
 *                             enum: [mobile, tablet, desktop, unknown]
 *                             example: "mobile"
 *                           clicks:
 *                             type: integer
 *                             example: 85
 *                     topReferers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           referer:
 *                             type: string
 *                             nullable: true
 *                             example: "twitter.com"
 *                           clicks:
 *                             type: integer
 *                             example: 34
 *       404:
 *         description: Short URL not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', analyticsController.getStats);

module.exports = router;
