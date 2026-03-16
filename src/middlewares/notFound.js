'use strict';

const AppError = require('../utils/AppError');

/**
 * 404 handler — registered AFTER all routes.
 * Any request that reaches this point matched no route.
 */
function notFound(req, res, next) {
  next(AppError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
