'use strict';

const jwt = require('jsonwebtoken');

const config = require('../config/index');
const AppError = require('../utils/AppError');

/**
 * Authenticate middleware — protects routes that require a logged-in user.
 *
 * Expects: Authorization: Bearer <accessToken>
 *
 * On success: attaches req.user = { id, email } and calls next().
 * On failure: passes a 401 AppError to the central error handler.
 *
 * This middleware does NOT touch refresh tokens — those are handled
 * exclusively by POST /api/v1/auth/refresh.
 *
 * Why Bearer tokens in headers (not cookies)?
 *  - Access tokens are short-lived (15 min) and need to be sent with every request
 *  - Mobile apps and non-browser clients cannot use HttpOnly cookies
 *  - The refresh token (long-lived) stays in a cookie to prevent JS access
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Access token required', 'MISSING_TOKEN'));
  }

  const token = authHeader.slice(7); // Remove the 'Bearer ' prefix

  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET);

    // Attach only what downstream handlers need — not the full JWT payload
    req.user = { id: payload.sub, email: payload.email };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Tell the client specifically that it needs to call /refresh
      return next(AppError.unauthorized('Access token has expired', 'TOKEN_EXPIRED'));
    }
    return next(AppError.unauthorized('Invalid access token', 'INVALID_TOKEN'));
  }
}

module.exports = authenticate;
