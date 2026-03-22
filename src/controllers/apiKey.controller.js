'use strict';

const apiKeyService = require('../services/apiKey.service');
const AppError = require('../utils/AppError');

/**
 * API Key Controller — thin HTTP adapter for API key management.
 *
 * Responsibilities:
 *  - Extract data from request
 *  - Call service
 *  - Return HTTP response
 *
 * No business logic. No SQL.
 */

const apiKeyController = {
  /**
   * POST /api/v1/account/api-keys
   * Create a new API key.
   * Requires Bearer token (user must be logged in).
   */
  async createApiKey(req, res, next) {
    try {
      const { appName, environment } = req.body;

      if (!appName) {
        return next(AppError.badRequest('appName is required', 'MISSING_APP_NAME'));
      }

      const result = await apiKeyService.createApiKey({
        userId: req.user.id,
        appName,
        environment,
      });

      return res.status(201).json({
        success: true,
        data: {
          rawKey: result.rawKey, // ← Only sent once! Client must save it.
          keyId: result.keyId,
          appName: result.appName,
          createdAt: result.createdAt,
          warning: 'Save this key in a secure location. You will not be able to view it again.',
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/account/api-keys
   * List all API keys for the authenticated user.
   */
  async listApiKeys(req, res, next) {
    try {
      const keys = await apiKeyService.listKeysForUser(req.user.id);

      return res.status(200).json({
        success: true,
        data: {
          keys,
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * DELETE /api/v1/account/api-keys/:keyId
   * Revoke a specific API key.
   * Only the owner can revoke their key.
   */
  async revokeApiKey(req, res, next) {
    try {
      const { keyId } = req.params;

      if (!keyId) {
        return next(AppError.badRequest('keyId is required', 'MISSING_KEY_ID'));
      }

      await apiKeyService.revokeKey(parseInt(keyId, 10), req.user.id);

      return res.status(200).json({
        success: true,
        message: 'API key revoked successfully.',
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/account/api-keys/revoke-all
   * Revoke all API keys for the authenticated user.
   * Used when user suspects account compromise.
   */
  async revokeAllApiKeys(req, res, next) {
    try {
      const count = await apiKeyService.revokeAllKeys(req.user.id);

      return res.status(200).json({
        success: true,
        message: `Revoked ${count} API key(s).`,
        revokedCount: count,
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = apiKeyController;
