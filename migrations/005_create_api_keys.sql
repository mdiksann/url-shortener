-- Migration: 005_create_api_keys.sql
-- Creates the api_keys table for programmatic access (non-interactive authentication).
--
-- Design notes:
--  - key_hash stores SHA-256(rawKey) — the raw key is generated once and sent to the client,
--    never persisted in the database. This prevents an attacker with DB access from
--    using keys to impersonate applications.
--  - key_prefix (sk_live_ or sk_test_) allows clients to identify key type at a glance
--    and helps with audit logging ("which prefix was used?")
--  - status (active/revoked) allows revoking without deleting — maintains audit history
--  - last_used_at enables monitoring and detecting unused keys
--  - ON DELETE CASCADE ensures keys are removed when a user is deleted
--  - Unlike JWT refresh tokens, API keys don't expire by default (they're long-lived)
--    but can be manually revoked

CREATE TABLE IF NOT EXISTS api_keys (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash        VARCHAR(64)  NOT NULL,  -- SHA-256 hex digest (always 64 chars)
    key_prefix      VARCHAR(10)  NOT NULL,  -- 'sk_live_' or 'sk_test_' etc
    app_name        VARCHAR(100) NOT NULL,  -- User-assigned name: "GitHub CI", "Mobile API", etc
    status          VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    last_used_at    TIMESTAMPTZ  DEFAULT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ  DEFAULT NULL
);

-- Every API request hashes the incoming key and queries this index
-- Ensures O(1) lookup without scanning all keys
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash_active
    ON api_keys(key_hash) WHERE status = 'active';

-- Enables fast "list all keys for user X" (dashboard, revoke all, etc)
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
    ON api_keys(user_id);

-- Enables admin reports: "which keys haven't been used in 30 days?"
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used_at
    ON api_keys(last_used_at);
