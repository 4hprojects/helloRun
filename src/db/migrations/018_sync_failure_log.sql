-- Phase 18: Sync Failure Log
-- Purpose: Record background MongoDB→Postgres sync failures for observability and future retry support.
-- Failures were previously fire-and-forget (console.error only). This table makes them queryable.

CREATE TABLE IF NOT EXISTS sync_failure_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type     TEXT NOT NULL,         -- 'event', 'registration', 'submission', 'policy_consent', 'critical_audit', 'user_compliance'
  entity_id     TEXT,                  -- MongoDB _id of the entity that failed to sync
  error_message TEXT,
  error_stack   TEXT,
  context       JSONB,                 -- extra fields per sync type (operation, action, etc.)
  resolved_at   TIMESTAMPTZ,           -- null = unresolved; set manually or by retry worker
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_failure_log_created_at
  ON sync_failure_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_failure_log_unresolved
  ON sync_failure_log (created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sync_failure_log_sync_type
  ON sync_failure_log (sync_type, created_at DESC);
