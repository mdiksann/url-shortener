-- Migration: 003_create_users.sql
-- Creates the users and refresh_tokens tables for JWT authentication.
--
-- Design notes:
--  - password_hash stores a bcrypt digest — the plaintext password is NEVER persisted
--  - refresh_tokens.token_hash stores SHA-256(rawToken) so a DB leak cannot be
--    used to impersonate users — the hash alone is worthless without the raw token
--  - Storing tokens in the DB (vs. a Redis blacklist) lets us:
--      • Support multiple simultaneous sessions (one token per device)
--      • Revoke individual or all sessions for a user
--      • Guarantee server-side invalidation on logout
--  - The trigger_set_updated_at function was created in migration 001 and can
--    be reused here without redefinition

CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL    PRIMARY KEY,
    email          VARCHAR(255) NOT NULL,
    password_hash  TEXT         NOT NULL,
    name           VARCHAR(100) DEFAULT NULL,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Each email address maps to exactly one account
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

-- Reuse the trigger function defined in 001_create_urls.sql
CREATE OR REPLACE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ── Refresh tokens ──────────────────────────────────────────────────────────
-- One row per active session. Deleted on logout or token rotation.
-- ON DELETE CASCADE keeps the table clean when a user is removed.

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64)  NOT NULL,  -- SHA-256 hex digest (always 64 chars)
    expires_at  TIMESTAMPTZ  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Every refresh request hashes the incoming token and queries this column
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_hash
    ON refresh_tokens(token_hash);

-- Enables fast "delete all sessions for user X" (logout everywhere)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);
