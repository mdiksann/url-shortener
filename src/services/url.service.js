'use strict';

const urlRepository = require('../repositories/url.repository');
const cacheService = require('./cache.service');
const { generateShortCode } = require('../utils/codeGenerator');
const { validateOriginalUrl, validateCustomAlias, validateExpiresAt } = require('../utils/validators');
const AppError = require('../utils/AppError');
const config = require('../config/index');

const MAX_CODE_RETRIES = 3;

/**
 * URL Service — all business logic for URL shortening.
 *
 * This layer sits between the HTTP layer (controllers) and the data
 * layer (repositories). It has no knowledge of req/res objects.
 */
const urlService = {
  /**
   * Create a new short URL.
   *
   * @param {object} input
   * @param {string}      input.originalUrl
   * @param {string|null} [input.customAlias]
   * @param {string|null} [input.expiresAt]   - ISO 8601 string
   * @returns {Promise<object>} The created URL record with a shortUrl field
   */
  async createShortUrl({ originalUrl, customAlias, expiresAt }) {
    // 1. Validate inputs — throws AppError on failure
    const validatedUrl = validateOriginalUrl(originalUrl);

    let expiryDate = null;
    if (expiresAt) {
      expiryDate = validateExpiresAt(expiresAt);
    }

    let shortCode;

    if (customAlias) {
      // 2a. Custom alias path
      validateCustomAlias(customAlias);

      const taken = await urlRepository.existsByCustomAlias(customAlias);
      if (taken) {
        throw AppError.conflict(
          `The alias "${customAlias}" is already taken`,
          'ALIAS_TAKEN',
        );
      }

      shortCode = customAlias;
    } else {
      // 2b. Auto-generated code path — retry on the rare collision
      shortCode = await urlService._generateUniqueCode();
    }

    // 3. Persist to database
    const record = await urlRepository.create({
      shortCode,
      originalUrl: validatedUrl,
      customAlias: customAlias || null,
      expiresAt: expiryDate,
    });

    // 4. Warm the cache immediately so the first redirect is a cache hit
    await cacheService.set(shortCode, record);

    return {
      ...record,
      shortUrl: `${config.BASE_URL}/${shortCode}`,
    };
  },

  /**
   * Resolve a short code to its original URL.
   * Used by the redirect endpoint — optimised for speed.
   *
   * Returns null if the URL doesn't exist, is inactive, or has expired.
   * The controller decides the HTTP response.
   *
   * @param {string} shortCode
   * @returns {Promise<object|null>}
   */
  async resolveUrl(shortCode) {
    // 1. Check Redis first — sub-millisecond on a cache hit
    const cached = await cacheService.get(shortCode);
    if (cached !== null) {
      return urlService._isUsable(cached) ? cached : null;
    }

    // 2. Cache miss — go to PostgreSQL
    const record = await urlRepository.findByShortCode(shortCode);

    if (!record) {
      // Negative cache — prevents DB hammering on non-existent codes
      await cacheService.setNull(shortCode);
      return null;
    }

    // 3. Repopulate cache for subsequent requests
    await cacheService.set(shortCode, record);

    return urlService._isUsable(record) ? record : null;
  },

  /**
   * Get full metadata for a short URL (no redirect).
   * Used by the GET /api/v1/urls/:code endpoint.
   *
   * @param {string} shortCode
   * @returns {Promise<object>}
   */
  async getUrlMetadata(shortCode) {
    // Metadata reads skip the cache and go straight to the source of truth
    const record = await urlRepository.findByShortCode(shortCode);

    if (!record) {
      throw AppError.notFound(`No URL found for code "${shortCode}"`, 'URL_NOT_FOUND');
    }

    return {
      ...record,
      shortUrl: `${config.BASE_URL}/${shortCode}`,
    };
  },

  /**
   * Soft-delete a short URL by marking it inactive.
   * Immediately invalidates the cache so the next redirect returns 404.
   * Preserves the row and all click history for analytics.
   *
   * @param {string} shortCode
   * @returns {Promise<void>}
   */
  async deactivateUrl(shortCode) {
    const updated = await urlRepository.deactivate(shortCode);

    if (!updated) {
      throw AppError.notFound(`No URL found for code "${shortCode}"`, 'URL_NOT_FOUND');
    }

    // Purge from cache immediately — don't wait for TTL expiry
    await cacheService.invalidate(shortCode);
  },

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Attempts to generate a short code that does not already exist in the DB.
   * Collisions are astronomically rare with NanoID at 8 chars but we handle
   * them gracefully rather than silently producing duplicates.
   */
  async _generateUniqueCode() {
    for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
      const code = generateShortCode();
      const exists = await urlRepository.existsByShortCode(code);
      if (!exists) return code;

      console.warn(`[codeGenerator] Short code collision on attempt ${attempt + 1}: ${code}`);
    }
    throw new Error('Failed to generate a unique short code after maximum retries');
  },

  /**
   * Returns false if a URL record should not be redirected to.
   * @param {object} record
   */
  _isUsable(record) {
    if (!record.isActive) return false;
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) return false;
    return true;
  },
};

module.exports = urlService;
