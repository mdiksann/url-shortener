'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

/**
 * OpenAPI 3.0 spec configuration.
 * swagger-jsdoc scans JSDoc comments in route files and generates the spec.
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'URL Shortener API',
      version: '1.0.0',
      description: 'Production-quality URL shortener service with authentication, analytics, and QR codes.',
      contact: {
        name: 'API Support',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: config.BASE_URL,
        description: config.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      /**
       * Security schemes for authentication.
       * Used by endpoints marked with @security.
       */
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from /auth/login or /auth/refresh',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for programmatic access',
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'HttpOnly refresh token (auto-managed by browser)',
        },
      },
      /**
       * Reusable response schemas for errors.
       */
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Something went wrong' },
            statusCode: { type: 'integer', example: 500 },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            statusCode: { type: 'integer', example: 400 },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
  /**
   * swagger-jsdoc scans these files for JSDoc @openapi tags.
   * Only include route files, not controllers or services.
   */
  apis: [
    './src/routes/index.js',
    './src/routes/auth.routes.js',
    './src/routes/url.routes.js',
    './src/routes/analytics.routes.js',
    './src/routes/apiKey.routes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
