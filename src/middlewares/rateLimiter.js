'use strict';

const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

/**
 * Factory — returns a configured Express rate-limit middleware.
 *
 * Using Redis as the backing store ensures limits are shared across
 * multiple Node.js processes / containers (unlike in-memory stores).
 *
 * @param {object} options
 * @param {number} options.windowMs   - Time window in milliseconds
 * @param {number} options.max        - Max requests per window per IP
 * @param {string} [options.message]  - Custom error message
 */
function createRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // Return RateLimit-* headers per RFC 6585
    legacyHeaders: false,    // Disable deprecated X-RateLimit-* headers

    store: new RedisStore({
      // node-redis v4 compatible sendCommand bridge
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),

    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: message || 'Too many requests. Please slow down and try again.',
          retryAfter: Math.ceil(windowMs / 1000),
        },
      });
    },

    // Use IP as the key — in production behind a proxy, also set
    // `app.set('trust proxy', 1)` in app.js so req.ip is the client IP,
    // not the proxy's IP.
    keyGenerator: (req) => req.ip,
  });
}

// ── Lazy-initialised limiters ─────────────────────────────────────────────────
//
// WHY LAZY?
// `rate-limit-redis` runs a Lua script via sendCommand() inside the RedisStore
// constructor. If we call `new RedisStore()` at module-load time, Redis is not
// yet connected (redis.connect() runs later in startServer()), causing
// ClientClosedError.
//
// Proxy middleware functions are returned immediately (no Redis call).
// The real limiter + RedisStore is created on the FIRST incoming request,
// at which point redis.connect() has already resolved.

let _createUrlLimiterInstance = null;
let _redirectLimiterInstance = null;

// Strict: POST /api/v1/urls — 10 requests/minute per IP
const createUrlLimiter = (req, res, next) => {
  if (!_createUrlLimiterInstance) {
    _createUrlLimiterInstance = createRateLimiter({
      windowMs: 60_000,
      max: 10,
      message: 'You are creating short URLs too fast. Please wait a minute.',
    });
  }
  return _createUrlLimiterInstance(req, res, next);
};

// Permissive: GET /:code — 60 requests/minute per IP
const redirectLimiter = (req, res, next) => {
  if (!_redirectLimiterInstance) {
    _redirectLimiterInstance = createRateLimiter({
      windowMs: 60_000,
      max: 60,
      message: 'Too many redirect requests. Please wait a moment.',
    });
  }
  return _redirectLimiterInstance(req, res, next);
};

module.exports = { createUrlLimiter, redirectLimiter };
