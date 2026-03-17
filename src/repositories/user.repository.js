'use strict';

const { query } = require('../config/database');

/**
 * User Repository — ALL SQL for users and refresh_tokens lives here.
 *
 * Note: findByEmail is the ONLY method that returns passwordHash.
 * findById intentionally omits it so callers cannot accidentally
 * serialize the hash into a response body.
 */
const userRepository = {
  /**
   * Find a user by email — used during login to retrieve the hash for comparison.
   * @param {string} email  - Already normalised (lowercased, trimmed) by the service
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const { rows } = await query(
      `SELECT
         id,
         email,
         password_hash  AS "passwordHash",
         name,
         is_active      AS "isActive",
         created_at     AS "createdAt"
       FROM users
       WHERE email = $1`,
      [email],
    );
    return rows[0] || null;
  },

  /**
   * Find a user by ID — used for token refresh to confirm the account still exists.
   * Does NOT return passwordHash.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const { rows } = await query(
      `SELECT
         id,
         email,
         name,
         is_active  AS "isActive",
         created_at AS "createdAt"
       FROM users
       WHERE id = $1`,
      [id],
    );
    return rows[0] || null;
  },

  /**
   * Insert a new user and return the created profile (no passwordHash).
   * @param {{ email: string, passwordHash: string, name?: string }} data
   * @returns {Promise<object>}
   */
  async create({ email, passwordHash, name }) {
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING
         id,
         email,
         name,
         created_at AS "createdAt"`,
      [email, passwordHash, name || null],
    );
    return rows[0];
  },

  /**
   * Persist a hashed refresh token for a user session.
   * @param {{ userId: number, tokenHash: string, expiresAt: Date }} data
   */
  async saveRefreshToken({ userId, tokenHash, expiresAt }) {
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  },

  /**
   * Look up a session row by its token hash and JOIN the owner's profile.
   * Used during token rotation to validate and then delete the old token.
   * @param {string} tokenHash
   * @returns {Promise<object|null>}
   */
  async findRefreshToken(tokenHash) {
    const { rows } = await query(
      `SELECT
         rt.id,
         rt.user_id    AS "userId",
         rt.expires_at AS "expiresAt",
         u.email,
         u.name,
         u.is_active   AS "isActive"
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [tokenHash],
    );
    return rows[0] || null;
  },

  /**
   * Delete a single session (logout from current device).
   * @param {string} tokenHash
   * @returns {Promise<boolean>} true if a row was deleted
   */
  async deleteRefreshToken(tokenHash) {
    const { rowCount } = await query(
      'DELETE FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash],
    );
    return rowCount > 0;
  },

  /**
   * Delete ALL sessions for a user (logout from every device).
   * @param {number} userId
   * @returns {Promise<number>} number of sessions deleted
   */
  async deleteAllRefreshTokens(userId) {
    const { rowCount } = await query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [userId],
    );
    return rowCount;
  },
};

module.exports = userRepository;
