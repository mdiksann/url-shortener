'use strict';

const redisClient = require('../config/redis');
const config = require('../config/index');

const PREFIX = 'url:';
const NULL_SENTINEL = '__NULL__'; // Cached "not found" — prevents DB hammering

/**
 * Cache Service — Redis abstraction for URL lookups.
 *
 * All Redis key management is centralised here so the rest of the
 * application never constructs Redis keys directly.
 */
const cacheService = {
  _key(shortCode) {
    return `${PREFIX}${shortCode}`;
  },

  /**
   * Retrieve a URL record from cache.
   * Returns null on miss OR when the cached value is the null sentinel.
   * @param {string} shortCode
   * @returns {Promise<object|null>}
   */
  async get(shortCode) {
    const raw = await redisClient.get(this._key(shortCode));

    if (raw === null) return null;          // Cache miss
    if (raw === NULL_SENTINEL) return null; // Negative cache hit (URL doesn't exist)

    return JSON.parse(raw);
  },

  /**
   * Store a URL record in cache.
   * Automatically sets TTL to the lower of CACHE_TTL and time-until-expiry.
   * @param {string} shortCode
   * @param {object} urlData
   */
  async set(shortCode, urlData) {
    const defaultTtl = config.CACHE_TTL;

    let ttl = defaultTtl;

    if (urlData.expiresAt) {
      const secondsUntilExpiry = Math.floor(
        (new Date(urlData.expiresAt) - Date.now()) / 1000,
      );
      if (secondsUntilExpiry <= 0) return; // Already expired — don't cache
      ttl = Math.min(defaultTtl, secondsUntilExpiry);
    }

    await redisClient.setEx(this._key(shortCode), ttl, JSON.stringify(urlData));
  },

  /**
   * Cache a "not found" result for 5 minutes.
   * Prevents repeated DB hits for non-existent short codes.
   * @param {string} shortCode
   */
  async setNull(shortCode) {
    await redisClient.setEx(this._key(shortCode), 300, NULL_SENTINEL);
  },

  /**
   * Remove a URL's cache entry — call this when a URL is deactivated or updated.
   * @param {string} shortCode
   */
  async invalidate(shortCode) {
    await redisClient.del(this._key(shortCode));
  },
};

module.exports = cacheService;
