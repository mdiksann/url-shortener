'use strict';

const { query } = require('../config/database');

/**
 * URL Repository — ALL SQL lives here, nowhere else.
 *
 * The service layer calls this and receives plain JavaScript objects.
 * The repository never knows about HTTP, Redis, or business rules.
 */
const urlRepository = {
  /**
   * Fetch a URL record by its short code.
   * Returns null if not found.
   * @param {string} shortCode
   * @returns {Promise<object|null>}
   */
  async findByShortCode(shortCode) {
    const { rows } = await query(
      `SELECT
         id,
         short_code    AS "shortCode",
         original_url  AS "originalUrl",
         custom_alias  AS "customAlias",
         is_active     AS "isActive",
         expires_at    AS "expiresAt",
         user_id       AS "userId",
         created_at    AS "createdAt",
         updated_at    AS "updatedAt"
       FROM urls
       WHERE short_code = $1`,
      [shortCode],
    );
    return rows[0] || null;
  },

  /**
   * Check whether a short code already exists.
   * More efficient than findByShortCode when you only need existence.
   * @param {string} shortCode
   * @returns {Promise<boolean>}
   */
  async existsByShortCode(shortCode) {
    const { rows } = await query(
      'SELECT 1 FROM urls WHERE short_code = $1 LIMIT 1',
      [shortCode],
    );
    return rows.length > 0;
  },

  /**
   * Check whether a custom alias is already taken.
   * @param {string} alias
   * @returns {Promise<boolean>}
   */
  async existsByCustomAlias(alias) {
    const { rows } = await query(
      'SELECT 1 FROM urls WHERE custom_alias = $1 LIMIT 1',
      [alias],
    );
    return rows.length > 0;
  },

  /**
   * Insert a new URL record and return the full created row.
   * @param {object} data
   * @param {string}      data.shortCode
   * @param {string}      data.originalUrl
   * @param {string|null} data.customAlias
   * @param {Date|null}   data.expiresAt
   * @param {number|null} data.userId
   * @returns {Promise<object>}
   */
  async create({ shortCode, originalUrl, customAlias, expiresAt, userId }) {
    const { rows } = await query(
      `INSERT INTO urls (short_code, original_url, custom_alias, expires_at, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         short_code    AS "shortCode",
         original_url  AS "originalUrl",
         custom_alias  AS "customAlias",
         is_active     AS "isActive",
         expires_at    AS "expiresAt",
         user_id       AS "userId",
         created_at    AS "createdAt"`,
      [shortCode, originalUrl, customAlias || null, expiresAt || null, userId || null],
    );
    return rows[0];
  },

  /**
   * Soft-delete: mark a URL as inactive instead of deleting it.
   * Preserves analytics history.
   * @param {string} shortCode
   * @returns {Promise<boolean>} true if a row was updated
   */
  async deactivate(shortCode) {
    const { rowCount } = await query(
      `UPDATE urls
       SET is_active = FALSE, updated_at = NOW()
       WHERE short_code = $1`,
      [shortCode],
    );
    return rowCount > 0;
  },
};

module.exports = urlRepository;
