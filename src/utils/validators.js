'use strict';

const AppError = require('./AppError');

// Aliases that would shadow real application routes
const RESERVED_ALIASES = new Set([
  'api', 'health', 'admin', 'login', 'signup', 'register', 'dashboard',
  'static', 'assets', 'public', 'favicon.ico', 'robots.txt', 'sitemap.xml',
  'www', 'mail', 'ftp', 'localhost', 'cdn', 'blog', 'docs', 'help', 'support',
]);

// Only allow alphanumeric chars, hyphens, and underscores
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/;

// Private IP ranges and localhost — used for SSRF prevention
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
];

/**
 * Validates and sanitises the original URL.
 * Throws AppError if the URL is invalid or unsafe.
 * @param {string} rawUrl
 * @returns {string} The normalised URL string
 */
function validateOriginalUrl(rawUrl) {
  let parsed;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw AppError.badRequest('Invalid URL format', 'INVALID_URL');
  }

  // Only allow standard web protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw AppError.badRequest(
      'Only HTTP and HTTPS URLs are supported',
      'INVALID_PROTOCOL',
    );
  }

  // Prevent SSRF — block requests to internal resources
  const hostname = parsed.hostname;
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw AppError.badRequest(
        'URL points to an internal or reserved address',
        'INVALID_URL_TARGET',
      );
    }
  }

  if (rawUrl.length > 2048) {
    throw AppError.badRequest('URL exceeds maximum length of 2048 characters', 'URL_TOO_LONG');
  }

  return parsed.toString();
}

/**
 * Validates a custom alias string.
 * Throws AppError if the alias is invalid or reserved.
 * @param {string} alias
 */
function validateCustomAlias(alias) {
  if (!ALIAS_PATTERN.test(alias)) {
    throw AppError.badRequest(
      'Alias must be 3–50 characters and contain only letters, numbers, hyphens, or underscores',
      'INVALID_ALIAS',
    );
  }

  if (RESERVED_ALIASES.has(alias.toLowerCase())) {
    throw AppError.badRequest('This alias is reserved and cannot be used', 'RESERVED_ALIAS');
  }
}

/**
 * Validates that an expiry date is in the future.
 * @param {string} expiresAt - ISO 8601 date string
 * @returns {Date}
 */
function validateExpiresAt(expiresAt) {
  const date = new Date(expiresAt);

  if (isNaN(date.getTime())) {
    throw AppError.badRequest('Invalid date format for expiresAt', 'INVALID_DATE');
  }

  if (date <= new Date()) {
    throw AppError.badRequest('expiresAt must be a future date', 'EXPIRY_IN_PAST');
  }

  return date;
}

module.exports = { validateOriginalUrl, validateCustomAlias, validateExpiresAt };
