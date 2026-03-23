'use strict';

const crypto = require('crypto');
const apiKeyRepository = require('../repositories/apiKey.repository');
const AppError = require('../utils/AppError');

/**
 * API Key Service — business logic for programmatic authentication.
 *
 * Responsibilities:
 *  - Generate new keys
 *  - Validate incoming keys during requests
 *  - Manage key lifecycle (revoke, list, etc)
 *  - Rate limiting considerations
 */

const apiKeyService = {
  /**
   * Create a new API key for a user.
   *
   * Flow:
   *  1. Generate a random key + hash
   *  2. Store hash in DB (raw key never persisted)
   *  3. Return raw key to client (only sent once)
   *  4. Client stores it for future requests
   *
   * @param {{userId: number, appName: string, environment: 'live' | 'test'}} params
   * @returns {Promise<{rawKey: string, keyId: number, appName: string, createdAt: Date}>}
   */
  async createApiKey({ userId, appName, environment = 'live' }) {
    // Validate inputs
    if (!userId) {
      throw AppError.badRequest('userId is required', 'MISSING_USER_ID');
    }

    if (!appName || appName.trim().length === 0) {
      throw AppError.badRequest('appName is required and cannot be blank', 'MISSING_APP_NAME');
    }

    if (appName.length > 100) {
      throw AppError.badRequest('appName cannot exceed 100 characters', 'APP_NAME_TOO_LONG');
    }

    if (!['live', 'test'].includes(environment)) {
      throw AppError.badRequest('environment must be "live" or "test"', 'INVALID_ENVIRONMENT');
    }

    // Generate key + hash
    const { rawKey, keyHash, keyPrefix } = apiKeyRepository.generateKey(environment);

    // Store in DB
    const dbRecord = await apiKeyRepository.create({
      userId,
      keyHash,
      keyPrefix,
      appName: appName.trim(),
    });

    // Return raw key (only shown once!)
    return {
      rawKey, // ← Client stores this
      keyId: dbRecord.id,
      appName: dbRecord.appName,
      createdAt: dbRecord.createdAt,
    };
  },

  /**
   * Validate an incoming API key from a request header.
   *
   * Called by the authentication middleware on every request.
   *
   * @param {string} rawKey The key from the Authorization header
   * @returns {Promise<{keyId: number, userId: number, appName: string}>}
   * @throws AppError 401 if key is missing, invalid, or revoked
   */
  async validateApiKey(rawKey) {
    if (!rawKey) {
      throw AppError.unauthorized('API key is required', 'MISSING_API_KEY');
    }

    // Hash the incoming key
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Look up in DB
    const keyRecord = await apiKeyRepository.findByHash(keyHash);

    if (!keyRecord) {
      throw AppError.unauthorized('Invalid API key', 'INVALID_API_KEY');
    }

    // Update last_used_at asynchronously (fire-and-forget)
    setImmediate(() => {
      apiKeyRepository.updateLastUsedAt(keyRecord.id).catch((err) => {
        console.error('[API Key] Error updating last_used_at:', err.message);
      });
    });

    return {
      keyId: keyRecord.id,
      userId: keyRecord.userId,
      appName: keyRecord.appName,
    };
  },

  /**
   * List all API keys for a user (for dashboard/management).
   *
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async listKeysForUser(userId) {
    return apiKeyRepository.findByUserId(userId);
  },

  /**
   * Revoke a specific API key.
   *
   * Only the owner can revoke their own key.
   *
   * @param {number} keyId
   * @param {number} userId
   * @returns {Promise<void>}
   * @throws AppError if not found or not owned by user
   */
  async revokeKey(keyId, userId) {
    // Verify ownership
    const isOwned = await apiKeyRepository.isOwnedBy(keyId, userId);
    if (!isOwned) {
      throw AppError.forbidden('You do not own this API key', 'KEY_NOT_OWNED');
    }

    // Revoke it
    const success = await apiKeyRepository.revoke(keyId);
    if (!success) {
      throw AppError.notFound('API key not found or already revoked', 'KEY_NOT_FOUND');
    }
  },

  /**
   * Revoke all API keys for a user.
   * Called when user suspects their account is compromised.
   *
   * @param {number} userId
   * @returns {Promise<number>} count of revoked keys
   */
  async revokeAllKeys(userId) {
    return apiKeyRepository.revokeAllForUser(userId);
  },
};

module.exports = apiKeyService;
