'use strict';

const cron = require('node-cron');
const { query } = require('../config/database');
const cacheService = require('../services/cache.service');

/**
 * Cleanup Job — soft-deletes expired URLs and purges their cache entries.
 *
 * Why soft-delete instead of hard DELETE?
 *  - Preserves the click history in the `clicks` table (ON DELETE CASCADE
 *    would wipe analytics if we hard-deleted the url row).
 *  - Keeps an audit record of what codes have been used.
 *  - A periodic archive job can hard-delete rows older than N months if storage
 *    becomes a concern.
 *
 * Schedule: runs daily at 02:00 UTC.
 *  - Low-traffic window minimises impact on the DB.
 *  - Expiry is also enforced at read time in url.service.js, so users never
 *    receive a live redirect for an expired link even between cleanup runs.
 *
 * Why not just rely on read-time enforcement?
 *  - Without cleanup, expired rows accumulate forever and inflate table size.
 *  - The partial index on active URLs also becomes stale without pruning.
 */
function startCleanupJob() {
  // '0 2 * * *'  → At 02:00 every day
  const job = cron.schedule('0 2 * * *', runCleanup, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('[cleanup] Expiration cleanup job scheduled (daily at 02:00 UTC)');

  return job; // Returned so tests or graceful shutdown can stop it
}

async function runCleanup() {
  console.log('[cleanup] Running expired URL cleanup...');

  try {
    // Atomically mark all expired rows inactive in a single UPDATE.
    // RETURNING gives us the short codes so we can purge them from Redis.
    const { rows, rowCount } = await query(`
      UPDATE urls
         SET is_active   = FALSE,
             updated_at  = NOW()
       WHERE is_active   = TRUE
         AND expires_at  IS NOT NULL
         AND expires_at  < NOW()
      RETURNING short_code AS "shortCode"
    `);

    if (rowCount === 0) {
      console.log('[cleanup] No expired URLs found.');
      return;
    }

    // Invalidate Redis entries for every deactivated URL.
    // Run invalidations concurrently — each is a single DEL command.
    await Promise.allSettled(
      rows.map(({ shortCode }) => cacheService.invalidate(shortCode)),
    );

    console.log(`[cleanup] Deactivated ${rowCount} expired URL(s).`);
  } catch (err) {
    // Log but do not throw — a failed cleanup run should not crash the process.
    // The next run (tomorrow) will pick up any missed rows.
    console.error('[cleanup] Error during expired URL cleanup:', err.message);
  }
}

// Exported for use in tests (runCleanup) and graceful shutdown (startCleanupJob)
module.exports = { startCleanupJob, runCleanup };
