'use strict';

/**
 * AppError — a structured, operational error.
 *
 * Operational errors are expected conditions (404, 409, 422).
 * Programmer errors (ReferenceError, TypeError) are NOT operational
 * and should never be caught silently — let them crash and alert.
 */
class AppError extends Error {
  /**
   * @param {string} message  - Human-readable error description
   * @param {number} statusCode - HTTP status code to send
   * @param {string} [code]   - Machine-readable error code for API consumers
   */
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.isOperational = true; // Signals to the error handler that this is safe to expose

    // Capture a clean stack trace that starts at the call site, not inside this constructor
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Convenience factory methods ──────────────────────────────────────────────

AppError.badRequest = (message, code = 'BAD_REQUEST') =>
  new AppError(message, 400, code);

AppError.notFound = (message = 'Resource not found', code = 'NOT_FOUND') =>
  new AppError(message, 404, code);

AppError.conflict = (message, code = 'CONFLICT') =>
  new AppError(message, 409, code);

AppError.gone = (message, code = 'GONE') =>
  new AppError(message, 410, code);

AppError.unauthorized = (message = 'Authentication required', code = 'UNAUTHORIZED') =>
  new AppError(message, 401, code);

AppError.forbidden = (message = 'You do not have permission to perform this action', code = 'FORBIDDEN') =>
  new AppError(message, 403, code);

AppError.tooManyRequests = (message = 'Too many requests', code = 'RATE_LIMITED') =>
  new AppError(message, 429, code);

module.exports = AppError;
