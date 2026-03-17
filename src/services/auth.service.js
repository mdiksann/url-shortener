'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const config = require('../config/index');

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * SHA-256 hash of a token string.
 * We store hashes in the DB — if the DB leaks, the raw tokens cannot be derived.
 * @param {string} token
 * @returns {string} 64-char hex digest
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Sign a short-lived access token (JWT).
 * `sub` is the standard JWT claim for the subject (user ID).
 * @param {{ id: number, email: string }} user
 * @returns {string}
 */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.JWT_ACCESS_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN },
  );
}

/**
 * Generate a cryptographically secure refresh token.
 * This is NOT a JWT — it is a random 32-byte value expressed as hex.
 * Random tokens are simpler to rotate and revoke than stateful JWTs.
 * @returns {string} 64-char hex string
 */
function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * A dummy bcrypt hash used in the timing-safe login path.
 * We compare against this when a user is not found so the response time
 * is identical whether the email exists or not.
 * Pre-computed once at startup to avoid the cost on every failed lookup.
 */
const DUMMY_HASH = bcrypt.hashSync('dummy-timing-safe-placeholder', 10);

// ── Service ──────────────────────────────────────────────────────────────────

const authService = {
  /**
   * Create a new user account and return a token pair.
   * @param {{ email: string, password: string, name?: string }} input
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
   */
  async register({ email, password, name }) {
    const normalisedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)) {
      throw AppError.badRequest('Invalid email address', 'INVALID_EMAIL');
    }

    if (!password || password.length < 8) {
      throw AppError.badRequest('Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    const existing = await userRepository.findByEmail(normalisedEmail);
    if (existing) {
      throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

    const user = await userRepository.create({ email: normalisedEmail, passwordHash, name });

    return authService._issueTokenPair(user);
  },

  /**
   * Validate credentials and return a token pair.
   *
   * Security: we always run bcrypt.compare regardless of whether the user
   * exists. This makes the response time constant — an attacker cannot
   * distinguish "email not found" from "wrong password" via timing.
   *
   * @param {{ email: string, password: string }} input
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
   */
  async login({ email, password }) {
    const normalisedEmail = email.trim().toLowerCase();

    const user = await userRepository.findByEmail(normalisedEmail);

    // Always compare — even on a miss — to prevent timing attacks
    const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch || !user.isActive) {
      // One generic message: never reveal which part was wrong
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    return authService._issueTokenPair(user);
  },

  /**
   * Validate an incoming refresh token, delete it, and issue a new pair.
   *
   * This is token rotation: the old token is consumed on first use.
   * If an attacker steals a refresh token and uses it, the next legitimate
   * refresh by the real user will fail — alerting them something is wrong.
   *
   * @param {string} incomingToken - Raw token from the HttpOnly cookie
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
   */
  async refresh(incomingToken) {
    if (!incomingToken) {
      throw AppError.unauthorized('Refresh token missing', 'MISSING_REFRESH_TOKEN');
    }

    const tokenHash = hashToken(incomingToken);
    const stored = await userRepository.findRefreshToken(tokenHash);

    if (!stored) {
      throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    if (new Date(stored.expiresAt) < new Date()) {
      // Clean up the expired row — don't leave stale data in the table
      await userRepository.deleteRefreshToken(tokenHash);
      throw AppError.unauthorized('Refresh token has expired. Please log in again.', 'REFRESH_TOKEN_EXPIRED');
    }

    if (!stored.isActive) {
      throw AppError.unauthorized('Account is deactivated', 'ACCOUNT_INACTIVE');
    }

    // Rotate: delete the used token before issuing a new one
    await userRepository.deleteRefreshToken(tokenHash);

    return authService._issueTokenPair({
      id: stored.userId,
      email: stored.email,
      name: stored.name,
    });
  },

  /**
   * Invalidate the current session's refresh token.
   * Idempotent — silently succeeds if the token is already gone.
   *
   * @param {string} incomingToken - Raw token from the HttpOnly cookie
   * @returns {Promise<void>}
   */
  async logout(incomingToken) {
    if (!incomingToken) return;

    const tokenHash = hashToken(incomingToken);
    await userRepository.deleteRefreshToken(tokenHash);
  },

  // ── Private ──────────────────────────────────────────────────────────────

  /**
   * Generate a token pair, persist the refresh token hash, and return both
   * tokens alongside the safe user profile object.
   *
   * @param {{ id: number, email: string, name?: string }} user
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
   */
  async _issueTokenPair(user) {
    const accessToken = signAccessToken(user);
    const refreshToken = generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.JWT_REFRESH_EXPIRES_IN_DAYS);

    await userRepository.saveRefreshToken({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name || null },
    };
  },
};

module.exports = authService;
