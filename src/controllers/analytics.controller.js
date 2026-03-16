'use strict';

const analyticsService = require('../services/analytics.service');
const urlService = require('../services/url.service');
const AppError = require('../utils/AppError');

/**
 * Analytics Controller — handles requests for click statistics.
 *
 * Deliberately separate from urlController because analytics and URL
 * management are distinct responsibilities likely to diverge over time.
 */
const analyticsController = {
  /**
   * GET /api/v1/urls/:code/stats
   *
   * Returns aggregated click analytics for a short URL.
   * Accepts an optional `days` query param (default 7, max 90).
   *
   * Response shape:
   * {
   *   success: true,
   *   data: {
   *     shortCode: 'abc123',
   *     totalClicks: 142,
   *     period: 'last_7_days',
   *     clicksByDay:    [{ date: '2024-05-01', clicks: 20 }, ...],
   *     clicksByDevice: [{ deviceType: 'mobile', clicks: 85 }, ...],
   *     topReferers:    [{ referer: 'twitter.com', clicks: 34 }, ...]
   *   }
   * }
   */
  async getStats(req, res, next) {
    try {
      const { code } = req.params;

      // Parse and clamp the `days` query param
      const rawDays = parseInt(req.query.days, 10);
      const days = isNaN(rawDays) ? 7 : Math.min(Math.max(rawDays, 1), 90);

      // Resolve the URL to get its numeric id (needed for analytics queries)
      // getUrlMetadata throws 404 if the code does not exist
      const urlData = await urlService.getUrlMetadata(code);

      const stats = await analyticsService.getStats(urlData.id, days);

      return res.status(200).json({
        success: true,
        data: {
          shortCode: urlData.shortCode,
          shortUrl: urlData.shortUrl,
          ...stats,
        },
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = analyticsController;
