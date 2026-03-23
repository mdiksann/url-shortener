'use strict';

const apiKeyService = require('../services/apiKey.service');
const AppError = require('../utils/AppError');

/**
 * API Key Authentication Middleware
 *
 * Extracts API key from Authorization header and validates it.
 * Sets req.apiKey = { keyId, userId, appName } for use in controllers.
 *
 * Usage:
 *   app.post('/api/v1/urls', authenticateApiKey, urlController.createUrl)
 *
 * Clients send:
 *   Authorization: Bearer api_key_example_123...
 *   (or just the raw key value)
 */

async function authenticateApiKey(req, res, next) {
  try {
    // Extract from Authorization header
    // Format: "Bearer <api_key>"
    const authHeader = req.headers.authorization || '';

    // Handle both "Bearer <api_key>" and just "<api_key>"
    let rawKey = authHeader;
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      rawKey = authHeader.slice(7); // Remove "bearer " prefix
    }

    // Validate the key
    const apiKeyData = await apiKeyService.validateApiKey(rawKey);

    // Attach to request for use in controllers
    req.apiKey = apiKeyData;
    req.user = { id: apiKeyData.userId }; // Attach userId so existing code works

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = authenticateApiKey;
