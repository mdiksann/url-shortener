'use strict';

const { createClient } = require('redis');
const config = require('./index');

const client = createClient({
  url: config.REDIS_URL,
  socket: {
    // Exponential backoff: wait up to 2s between reconnect attempts
    reconnectStrategy: (retries) => Math.min(retries * 50, 2_000),
    connectTimeout: 5_000,
  },
});

client.on('error', (err) => {
  console.error('[Redis] Client error:', err.message);
});

client.on('connect', () => {
  console.log('[Redis] Connected');
});

client.on('reconnecting', () => {
  console.warn('[Redis] Reconnecting...');
});

// Connect is called once at startup in app.js before the server binds.
// Exported as a singleton — every module that requires this file shares
// the same connection.
module.exports = client;
