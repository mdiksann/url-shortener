'use strict';

const { Pool } = require('pg');
const config = require('./index');

// Use connection string if provided, otherwise fall back to individual params.
// In production, DATABASE_URL (e.g. from Railway/Render) takes precedence.
const poolConfig = config.DATABASE_URL
  ? {
      connectionString: config.DATABASE_URL,
      ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
    };

const pool = new Pool({
  ...poolConfig,
  min: config.DB_POOL_MIN,
  max: config.DB_POOL_MAX,
  // Kill idle connections after 30s to avoid exhausting the pool
  idleTimeoutMillis: 30_000,
  // Fail fast if no connection is available within 2s
  connectionTimeoutMillis: 2_000,
});

// Surface connection errors immediately — don't let them surface silently later
pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected pool error:', err.message);
});

/**
 * Run a parameterized query against the pool.
 * Using this wrapper keeps raw `pg` calls out of business logic.
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.debug('[DB]', { query: text, duration: `${duration}ms`, rows: result.rowCount });
  }

  return result;
}

module.exports = { pool, query };
