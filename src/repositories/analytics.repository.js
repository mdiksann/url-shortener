'use strict';

const { query } = require('../config/database');

/**
 * Analytics Repository — all SQL for the clicks table.
 * Only this file is allowed to issue queries against `clicks`.
 */
const analyticsRepository = {
  /**
   * Insert a single click event.
   * Called fire-and-forget from the redirect controller — must never throw
   * in a way that affects the user's redirect experience.
   *
   * @param {object} data
   * @param {number}      data.urlId
   * @param {string|null} data.ipAddress
   * @param {string|null} data.userAgent
   * @param {string|null} data.referer
   * @param {string|null} data.deviceType
   */
  async recordClick({ urlId, ipAddress, userAgent, referer, deviceType }) {
    await query(
      `INSERT INTO clicks (url_id, ip_address, user_agent, referer, device_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        urlId,
        ipAddress || null,
        userAgent || null,
        referer   || null,
        deviceType || null,
      ],
    );
  },

  /**
   * Total click count for a URL.
   * @param {number} urlId
   * @returns {Promise<number>}
   */
  async getTotalClicks(urlId) {
    const { rows } = await query(
      'SELECT COUNT(*) AS count FROM clicks WHERE url_id = $1',
      [urlId],
    );
    return parseInt(rows[0].count, 10);
  },

  /**
   * Clicks grouped by calendar day for the last N days.
   * Returns rows sorted oldest → newest for easy charting.
   *
   * Example row: { date: '2024-05-01', clicks: 42 }
   *
   * @param {number} urlId
   * @param {number} [days=7]
   * @returns {Promise<Array<{date: string, clicks: number}>>}
   */
  async getClicksByDay(urlId, days = 7) {
    const { rows } = await query(
      `SELECT
         DATE(clicked_at AT TIME ZONE 'UTC') AS date,
         COUNT(*)                            AS clicks
       FROM clicks
       WHERE url_id   = $1
         AND clicked_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY date
       ORDER BY date ASC`,
      [urlId, days],
    );
    // Normalise: count comes back as string from pg
    return rows.map((r) => ({ date: r.date, clicks: parseInt(r.clicks, 10) }));
  },

  /**
   * Click breakdown by device type.
   * Example row: { deviceType: 'mobile', clicks: 120 }
   *
   * @param {number} urlId
   * @returns {Promise<Array<{deviceType: string, clicks: number}>>}
   */
  async getClicksByDevice(urlId) {
    const { rows } = await query(
      `SELECT
         COALESCE(device_type, 'unknown') AS "deviceType",
         COUNT(*)                          AS clicks
       FROM clicks
       WHERE url_id = $1
       GROUP BY device_type
       ORDER BY clicks DESC`,
      [urlId],
    );
    return rows.map((r) => ({ ...r, clicks: parseInt(r.clicks, 10) }));
  },

  /**
   * Top N referrer domains.
   * Strips the full URL to just the hostname for grouping.
   * Example row: { referer: 'twitter.com', clicks: 34 }
   *
   * @param {number} urlId
   * @param {number} [limit=5]
   * @returns {Promise<Array<{referer: string, clicks: number}>>}
   */
  async getTopReferers(urlId, limit = 5) {
    const { rows } = await query(
      `SELECT
         COALESCE(referer, 'direct') AS referer,
         COUNT(*)                    AS clicks
       FROM clicks
       WHERE url_id = $1
       GROUP BY referer
       ORDER BY clicks DESC
       LIMIT $2`,
      [urlId, limit],
    );
    return rows.map((r) => ({ ...r, clicks: parseInt(r.clicks, 10) }));
  },
};

module.exports = analyticsRepository;
