'use strict';

const urlService = require('../services/url.service');
const analyticsService = require('../services/analytics.service');
const AppError = require('../utils/AppError');

/**
 * URL Controller — thin HTTP adapter layer.
 *
 * Responsibilities:
 *  1. Extract data from req
 *  2. Call the service
 *  3. Map the result to an HTTP response
 *
 * No business logic lives here. No SQL. No Redis.
 */
const urlController = {
  /**
   * POST /api/v1/urls
   * Create a new short URL.
   */
  async createUrl(req, res, next) {
    try {
      const { originalUrl, customAlias, expiresAt } = req.body;

      if (!originalUrl) {
        return next(AppError.badRequest('originalUrl is required', 'MISSING_FIELD'));
      }

      const result = await urlService.createShortUrl({ originalUrl, customAlias, expiresAt, userId: req.user.id });

      return res.status(201).json({
        success: true,
        data: {
          shortCode: result.shortCode,
          shortUrl: result.shortUrl,
          originalUrl: result.originalUrl,
          customAlias: result.customAlias,
          expiresAt: result.expiresAt,
          createdAt: result.createdAt,
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /:code
   * Redirect to the original URL.
   *
   * Uses 302 (temporary redirect) deliberately:
   *  - Browsers do NOT cache 302 responses
   *  - Every visit hits your server → analytics are accurate
   *  - You can update the destination without browsers serving stale cache
   *
   * 301 (permanent) would cache in browser — never use it here.
   */
  async redirectUrl(req, res, next) {
    try {
      const { code } = req.params;

      const url = await urlService.resolveUrl(code);

      if (!url) {
        // Distinguish "never existed" vs "expired/deactivated" with 410 Gone
        // For simplicity here we use 404; see the note in url.service.js if you want
        // to differentiate them (requires a separate DB call).
        return next(AppError.notFound(`Short URL "${code}" not found or has expired`));
      }

      // Fire-and-forget: record the click without blocking the redirect.
      // setImmediate defers execution until after the current event loop tick,
      // so the 302 response is sent to the browser before analytics writes begin.
      // analyticsService.recordClick() swallows its own errors internally.
      setImmediate(() => {
        analyticsService.recordClick({
          urlId:     url.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
          referer:   req.headers['referer'] || req.headers['referrer'] || null,
        });
      });

      // 302 → temporary redirect
      return res.redirect(302, url.originalUrl);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * DELETE /api/v1/urls/:code
   * Soft-delete (deactivate) a short URL.
   * Subsequent redirects for this code will return 404.
   * Click history is preserved for analytics.
   */
  async deleteUrl(req, res, next) {
    try {
      const { code } = req.params;

      await urlService.deactivateUrl(code, req.user.id);

      return res.status(200).json({
        success: true,
        message: `Short URL "${code}" has been deactivated successfully.`,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/urls/:code
   * Return metadata for a short URL — no redirect, no side effects.
   */
  async getUrlMetadata(req, res, next) {
    try {
      const { code } = req.params;

      const result = await urlService.getUrlMetadata(code);

      return res.status(200).json({
        success: true,
        data: {
          shortCode: result.shortCode,
          shortUrl: result.shortUrl,
          originalUrl: result.originalUrl,
          customAlias: result.customAlias,
          isActive: result.isActive,
          expiresAt: result.expiresAt,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = urlController;
