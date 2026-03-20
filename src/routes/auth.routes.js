'use strict';

const { Router } = require('express');
const authController = require('../controllers/auth.controller');

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Create a new user account
 *     description: |
 *       Registers a new user with email and password.
 *       Returns access token (15-minute) in response body and refresh token (7-day) in HttpOnly cookie.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: "SecurePassword123!"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token (15 minutes)
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
 *       400:
 *         description: Missing required fields or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in to an existing account
 *     description: |
 *       Authenticates with email and password.
 *       Returns access token (15-minute) in response body and refresh token (7-day) in HttpOnly cookie.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePassword123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token (15 minutes)
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', authController.login);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: |
 *       Uses the refresh token (from HttpOnly cookie) to get a new access token.
 *       Implements token rotation: the old refresh token is deleted and a new one is issued.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New JWT access token (15 minutes)
 *                     user:
 *                       type: object
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', authController.refresh);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out and invalidate session
 *     description: |
 *       Invalidates the refresh token and clears the HttpOnly cookie.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully."
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0
 */
router.post('/logout', authController.logout);

module.exports = router;
