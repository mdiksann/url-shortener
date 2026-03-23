'use strict';

const { Router } = require('express');
const apiKeyController = require('../controllers/apiKey.controller');
const authenticate = require('../middlewares/authenticate');

const router = Router();

/**
 * @openapi
 * /api/v1/account/api-keys:
 *   post:
 *     summary: Create a new API key
 *     description: |
 *       Generates a new API key for programmatic access.
 *       The raw key is returned only once — the client must save it securely.
 *       Subsequent requests cannot retrieve the same raw key; a new one must be generated.
 *     tags:
 *       - Account
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appName
 *             properties:
 *               appName:
 *                 type: string
 *                 maxLength: 100
 *                 example: "GitHub CI Pipeline"
 *               environment:
 *                 type: string
 *                 enum: [live, test]
 *                 default: live
 *                 example: "live"
 *                 description: 'Use "test" for development/testing'
 *     responses:
 *       201:
 *         description: API key created successfully
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
 *                     rawKey:
 *                       type: string
 *                       example: "api_key_example_generated_once"
 *                       description: "The API key. Save this securely — you cannot retrieve it again!"
 *                     keyId:
 *                       type: integer
 *                       example: 42
 *                     appName:
 *                       type: string
 *                       example: "GitHub CI Pipeline"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     warning:
 *                       type: string
 *       400:
 *         description: Missing appName
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized (no valid access token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticate, apiKeyController.createApiKey);

/**
 * @openapi
 * /api/v1/account/api-keys:
 *   get:
 *     summary: List all API keys
 *     description: |
 *       Returns all API keys created by the authenticated user.
 *       Does NOT return the raw keys (those are only shown at creation).
 *       Use to manage and monitor your API keys.
 *     tags:
 *       - Account
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
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
 *                     keys:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 42
 *                           appName:
 *                             type: string
 *                             example: "GitHub CI Pipeline"
 *                           keyPrefix:
 *                             type: string
 *                             example: "sk_live_"
 *                           status:
 *                             type: string
 *                             enum: [active, revoked]
 *                             example: "active"
 *                           lastUsedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             example: "2024-05-15T14:30:00.000Z"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           revokedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticate, apiKeyController.listApiKeys);

/**
 * @openapi
 * /api/v1/account/api-keys/{keyId}:
 *   delete:
 *     summary: Revoke an API key
 *     description: |
 *       Revokes a specific API key, immediately invalidating it.
 *       Subsequent requests using this key will fail with 401 Unauthorized.
 *       Only the owner of the key can revoke it.
 *     tags:
 *       - Account
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 42
 *         description: The API key ID to revoke
 *     responses:
 *       200:
 *         description: API key revoked successfully
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
 *                   example: "API key revoked successfully."
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (you do not own this key)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: API key not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:keyId', authenticate, apiKeyController.revokeApiKey);

/**
 * @openapi
 * /api/v1/account/api-keys/revoke-all:
 *   post:
 *     summary: Revoke all API keys
 *     description: |
 *       Immediately revokes all API keys for the authenticated user.
 *       Use this if you suspect account compromise or credential leak.
 *       Subsequent requests using any of your old keys will fail.
 *     tags:
 *       - Account
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All API keys revoked
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
 *                   example: "Revoked 3 API key(s)."
 *                 revokedCount:
 *                   type: integer
 *                   example: 3
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/revoke-all', authenticate, apiKeyController.revokeAllApiKeys);

module.exports = router;
