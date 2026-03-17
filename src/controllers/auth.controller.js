'use strict';

const authService = require('../services/auth.service');
const AppError = require('../utils/AppError');
const config = require('../config/index');

/**
 * Set the refresh token as an HttpOnly cookie on the response.
 *
 * HttpOnly:  JavaScript cannot read this cookie → XSS-safe
 * Secure:    Only sent over HTTPS (enforced in production)
 * SameSite:  Strict prevents the cookie from being sent in cross-site requests → CSRF-safe
 * path:      Scoped to /api/v1/auth so the browser never sends it to other endpoints
 *
 * @param {import('express').Response} res
 * @param {string} token
 */
function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: config.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
}

const authController = {
  /**
   * POST /api/v1/auth/register
   * Body: { email, password, name? }
   * Returns: { accessToken, user }  +  refreshToken cookie
   */
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return next(AppError.badRequest('email and password are required', 'MISSING_FIELDS'));
      }

      const { accessToken, refreshToken, user } = await authService.register({ email, password, name });

      setRefreshCookie(res, refreshToken);

      return res.status(201).json({
        success: true,
        data: { accessToken, user },
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/auth/login
   * Body: { email, password }
   * Returns: { accessToken, user }  +  refreshToken cookie
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(AppError.badRequest('email and password are required', 'MISSING_FIELDS'));
      }

      const { accessToken, refreshToken, user } = await authService.login({ email, password });

      setRefreshCookie(res, refreshToken);

      return res.status(200).json({
        success: true,
        data: { accessToken, user },
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/auth/refresh
   * Cookie: refreshToken (HttpOnly)
   * Returns: new { accessToken, user }  +  new refreshToken cookie
   *
   * The old refresh token is deleted from the DB on every call (token rotation).
   */
  async refresh(req, res, next) {
    try {
      const incomingToken = req.cookies?.refreshToken;

      const { accessToken, refreshToken, user } = await authService.refresh(incomingToken);

      setRefreshCookie(res, refreshToken);

      return res.status(200).json({
        success: true,
        data: { accessToken, user },
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/auth/logout
   * Cookie: refreshToken (HttpOnly)
   * Deletes the session from the DB and clears the cookie.
   */
  async logout(req, res, next) {
    try {
      const incomingToken = req.cookies?.refreshToken;

      await authService.logout(incomingToken);

      clearRefreshCookie(res);

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = authController;
