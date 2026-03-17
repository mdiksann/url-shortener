-- Migration: 004_add_user_id_to_urls.sql
-- Adds user ownership to the urls table.
--
-- Design notes:
--  - user_id is NULLABLE — existing rows created before this migration have
--    no owner and remain fully functional (redirects still work)
--  - ON DELETE SET NULL — if a user deletes their account, their URLs become
--    anonymous rather than disappearing. This preserves redirect functionality
--    and avoids breaking short links that may be widely shared.
--  - Partial index (WHERE user_id IS NOT NULL) keeps the index small since
--    NULL rows (legacy/anonymous) represent the majority initially and do not
--    benefit from being indexed for user-scoped queries.

ALTER TABLE urls
    ADD COLUMN IF NOT EXISTS user_id BIGINT DEFAULT NULL
        REFERENCES users(id) ON DELETE SET NULL;

-- Allows efficient "fetch all URLs belonging to user X" queries
CREATE INDEX IF NOT EXISTS idx_urls_user_id
    ON urls(user_id)
    WHERE user_id IS NOT NULL;
