'use strict';

require('dotenv').config();

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,

  // PostgreSQL — prefer full connection string in production
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME || 'urlshortener',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN, 10) || 2,
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX, 10) || 10,

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Application
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  SHORT_CODE_LENGTH: parseInt(process.env.SHORT_CODE_LENGTH, 10) || 8,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 10,

  // Cache TTL in seconds
  CACHE_TTL: parseInt(process.env.CACHE_TTL, 10) || 86_400,

  // JWT — use different secrets so a leaked access secret cannot forge refresh tokens
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN_DAYS: parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS, 10) || 7,

  // bcrypt work factor — 12 rounds ≈ 300ms on a modern CPU (good cost/security balance)
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
};

// Fail fast: throw early if required production variables are absent
if (config.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'REDIS_URL', 'BASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

module.exports = config;
