-- Migration: 002_create_clicks.sql
-- Stores one row per redirect hit for analytics.
--
-- Design notes:
--  - url_id references urls(id) — cascade delete keeps data consistent
--    if a URL row is ever hard-deleted (we soft-delete, but safety net is good)
--  - ip_address uses PostgreSQL's native INET type — handles IPv4 and IPv6
--  - device_type is derived from user_agent at insert time in application code
--    (avoids storing the full UA in every query for aggregations)
--  - country is nullable — geo-lookup is an optional enhancement
--  - The primary index is (url_id, clicked_at DESC) because our queries are
--    always scoped to a single URL and ordered chronologically

CREATE TABLE IF NOT EXISTS clicks (
    id           BIGSERIAL    PRIMARY KEY,
    url_id       BIGINT       NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
    clicked_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ip_address   INET         DEFAULT NULL,
    user_agent   TEXT         DEFAULT NULL,
    referer      TEXT         DEFAULT NULL,
    device_type  VARCHAR(10)  DEFAULT NULL   -- 'mobile' | 'desktop' | 'tablet'
);

-- All analytics queries are scoped to a single url_id and sorted by time
CREATE INDEX IF NOT EXISTS idx_clicks_url_id_time
    ON clicks(url_id, clicked_at DESC);

-- Allows quickly counting total clicks for a URL
CREATE INDEX IF NOT EXISTS idx_clicks_url_id
    ON clicks(url_id);
