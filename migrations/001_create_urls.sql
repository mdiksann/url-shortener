-- Migration: 001_create_urls.sql
-- Creates the core urls table with all required indexes.
--
-- Design notes:
--  - short_code is the primary lookup key; it gets a UNIQUE index automatically
--  - custom_alias is nullable (NULL when auto-generated) but UNIQUE when set
--  - expires_at is nullable — NULL means "never expires"
--  - is_active enables soft-delete: we deactivate instead of DELETE
--    so analytics history is preserved
--  - TIMESTAMPTZ (timestamp with timezone) stores time in UTC always

CREATE TABLE IF NOT EXISTS urls (
    id            BIGSERIAL    PRIMARY KEY,
    short_code    VARCHAR(12)  NOT NULL,
    original_url  TEXT         NOT NULL,
    custom_alias  VARCHAR(50)  DEFAULT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    expires_at    TIMESTAMPTZ  DEFAULT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Primary lookup index — every redirect hits this
CREATE UNIQUE INDEX IF NOT EXISTS idx_urls_short_code
    ON urls(short_code);

-- Unique constraint on custom_alias, but only for non-NULL values.
-- This allows multiple rows with custom_alias = NULL (auto-generated codes).
CREATE UNIQUE INDEX IF NOT EXISTS idx_urls_custom_alias
    ON urls(custom_alias)
    WHERE custom_alias IS NOT NULL;

-- Partial index for efficient active URL lookups.
-- Only indexes rows where is_active = TRUE, keeping the index small as
-- soft-deleted rows accumulate over time.
-- NOTE: expires_at is intentionally excluded from this predicate —
-- NOW() is STABLE, not IMMUTABLE, so PostgreSQL forbids it in index predicates.
-- Expiry is enforced at read time in url.service.js (_isUsable) and via
-- the Redis cache TTL, so no index-level time check is needed.
CREATE INDEX IF NOT EXISTS idx_urls_active_short_code
    ON urls(short_code)
    WHERE is_active = TRUE;

-- Automatically update updated_at on every row change
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at
    BEFORE UPDATE ON urls
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();
