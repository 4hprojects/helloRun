-- Migration 020: Sync failure retry tracking
-- Purpose: Add retry_count and last_retry_at to support the automated retry worker.
-- retry_count = -1 is the dead-letter sentinel (stops the worker from reprocessing).

ALTER TABLE sync_failure_log
  ADD COLUMN IF NOT EXISTS retry_count   INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sync_failure_log_retryable
  ON sync_failure_log (created_at ASC)
  WHERE resolved_at IS NULL AND retry_count >= 0;
