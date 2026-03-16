'use strict';

const AppError = require('../utils/AppError');

/**
 * Centralised error handling middleware.
 *
 * Express identifies error-handling middleware by its 4-argument signature.
 * ALL errors (thrown or passed via next(err)) land here.
 *
 * Two categories:
 *  - Operational (AppError.isOperational === true): expected, safe to expose
 *  - Programmer errors: unexpected, log fully, return generic 500
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Attach request context to every error log
  const meta = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  };

  if (err.isOperational) {
    // Expected error — log at warn level, return structured response
    console.warn('[AppError]', { ...meta, code: err.code, message: err.message });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Unexpected programmer error — log full stack, never expose internals
  console.error('[UnhandledError]', { ...meta, error: err });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
}

module.exports = errorHandler;
