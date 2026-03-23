'use strict';

const crypto = require('crypto');
const { nanoid } = require('nanoid');
const { pool } = require('../config/database');

/**
 * API Key Repository — all SQL for api_keys table.
 *
 * Responsible for:
 *  - Creating new keys (hash + store)
 *  - Finding keys by hash
 *  - Listing keys for a user
 *  - Revoking keys
 *  - Updating last_used_at
 */

const apiKeyRepository = {
  /**
   * Generate a new API key and return both the raw key (for the client) and hash (for DB).
   *
   * Raw key format: sk_live_<random27chars>
   *   - 27 chars of base62 = ~160 bits of entropy
   *   - Total 35 chars including prefix
   *
   * @param {string} environment 'live' or 'test'
   * @returns {{ rawKey: string, keyHash: string, keyPrefix: string }}
   */
  generateKey(environment = 'live') {
    const prefix = `sk_${environment}_`;
    const randomPart = nanoid(27); // 27 chars ≈ 160 bits
    const rawKey = prefix + randomPart;

    // Hash with SHA-256
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    return {
      rawKey,
      keyHash,
      keyPrefix: prefix,
    };
  },

  /**
   * Create a new API key in the database.
   *
   * @param {{userId: number, keyHash: string, keyPrefix: string, appName: string}} params
   * @returns {Promise<{id: number, userId: number, appName: string, createdAt: Date}>}
   */
  async create({ userId, keyHash, keyPrefix, appName }) {
    const result = await pool.query(
      `INSERT INTO api_keys (user_id, key_hash, key_prefix, app_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id as "userId", app_name as "appName", created_at as "createdAt"`,
      [userId, keyHash, keyPrefix, appName]
    );
    return result.rows[0];
  },

  /**
   * Find an active API key by its hash.
   *
   * Used during every authenticated request to validate the key.
   * Indexes on (key_hash, status) make this O(1).
   *
   * @param {string} keyHash SHA-256 hash of the key
   * @returns {Promise<{id: number, userId: number, appName: string, status: string} | null>}
   */
  async findByHash(keyHash) {
    const result = await pool.query(
      `SELECT id, user_id as "userId", app_name as "appName", status
       FROM api_keys
       WHERE key_hash = $1 AND status = 'active'`,
      [keyHash]
    );
    return result.rows[0] || null;
  },

  /**
   * Find all API keys for a user (active only).
   *
   * Used on dashboard to show which keys the user has generated.
   *
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT id, app_name as "appName", key_prefix as "keyPrefix",
              status, last_used_at as "lastUsedAt", created_at as "createdAt", revoked_at as "revokedAt"
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Revoke an API key (soft-delete).
   *
   * Sets status='revoked' and records the revocation time.
   * Does NOT delete the row — audit history is preserved.
   *
   * @param {number} keyId
   * @returns {Promise<boolean>} true if key existed and was revoked, false if not found
   */
  async revoke(keyId) {
    const result = await pool.query(
      `UPDATE api_keys
       SET status = 'revoked', revoked_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING id`,
      [keyId]
    );
    return result.rows.length > 0;
  },

  /**
   * Revoke all keys for a user.
   * Useful when the user suspects compromise.
   *
   * @param {number} userId
   * @returns {Promise<number>} count of revoked keys
   */
  async revokeAllForUser(userId) {
    const result = await pool.query(
      `UPDATE api_keys
       SET status = 'revoked', revoked_at = NOW()
       WHERE user_id = $1 AND status = 'active'
       RETURNING id`,
      [userId]
    );
    return result.rows.length;
  },

  /**
   * Update last_used_at timestamp after a successful API key auth.
   *
   * Fire-and-forget: called asynchronously so it doesn't block the request.
   * Swallows errors so a DB failure doesn't crash the request.
   *
   * @param {number} keyId
   * @returns {Promise<void>}
   */
  async updateLastUsedAt(keyId) {
    try {
      await pool.query(
        `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
        [keyId]
      );
    } catch (err) {
      // Silently fail — last_used_at is analytics, not critical
      console.error('[API Key] Failed to update last_used_at for key', keyId, err.message);
    }
  },

  /**
   * Check if the user owns this API key.
   * Used to prevent one user from revoking another's keys.
   *
   * @param {number} keyId
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  async isOwnedBy(keyId, userId) {
    const result = await pool.query(
      `SELECT 1 FROM api_keys WHERE id = $1 AND user_id = $2`,
      [keyId, userId]
    );
    return result.rows.length > 0;
  },
};

module.exports = apiKeyRepository;
