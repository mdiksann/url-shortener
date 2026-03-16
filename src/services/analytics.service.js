'use strict';

const analyticsRepository = require('../repositories/analytics.repository');

// ── Device detection ──────────────────────────────────────────────────────────
// Intentionally simple — avoids adding a heavyweight UA-parser dependency.
// For production-grade device analytics, use the `ua-parser-js` package.

const MOBILE_RE    = /mobile|android|iphone|ipod|blackberry|windows phone/i;
const TABLET_RE    = /ipad|tablet|kindle|playbook/i;

/**
 * Parse a raw User-Agent string into a device category.
 * @param {string|null} ua
 * @returns {'mobile'|'tablet'|'desktop'|null}
 */
function parseDeviceType(ua) {
  if (!ua) return null;
  if (TABLET_RE.test(ua)) return 'tablet';
  if (MOBILE_RE.test(ua)) return 'mobile';
  return 'desktop';
}

// ── Analytics Service ─────────────────────────────────────────────────────────

/**
 * Analytics Service — business logic for recording and querying click data.
 *
 * recordClick() is designed to be called fire-and-forget.
 * It must never propagate exceptions that would affect the redirect response.
 */
const analyticsService = {
  /**
   * Record a single redirect click.
   * Errors are swallowed and logged — a broken analytics pipeline must never
   * degrade the redirect experience for the end user.
   *
   * @param {object} data
   * @param {number}      data.urlId
   * @param {string|null} data.ipAddress  - extracted from req.ip
   * @param {string|null} data.userAgent  - from request headers
   * @param {string|null} data.referer    - from request headers
   */
  async recordClick({ urlId, ipAddress, userAgent, referer }) {
    try {
      const deviceType = parseDeviceType(userAgent);

      await analyticsRepository.recordClick({
        urlId,
        ipAddress,
        userAgent,
        referer: referer || null,
        deviceType,
      });
    } catch (err) {
      // Log but never throw — analytics failure is non-critical
      console.error('[analytics] Failed to record click:', err.message);
    }
  },

  /**
   * Aggregate stats for a single short URL.
   * Used by GET /api/v1/urls/:code/stats
   *
   * @param {number} urlId
   * @param {number} [days=7]  - time range window for daily breakdown
   * @returns {Promise<object>}
   */
  async getStats(urlId, days = 7) {
    // Run independent queries in parallel — no need to serialize them
    const [totalClicks, clicksByDay, clicksByDevice, topReferers] = await Promise.all([
      analyticsRepository.getTotalClicks(urlId),
      analyticsRepository.getClicksByDay(urlId, days),
      analyticsRepository.getClicksByDevice(urlId),
      analyticsRepository.getTopReferers(urlId, 5),
    ]);

    return {
      totalClicks,
      period: `last_${days}_days`,
      clicksByDay,
      clicksByDevice,
      topReferers,
    };
  },
};

module.exports = analyticsService;
