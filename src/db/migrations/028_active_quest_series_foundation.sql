-- Active Quest Phase 1: additive monthly-series identity in the Postgres event shadow.
-- MongoDB remains authoritative. No historical event is inferred or backfilled here.
-- Rollback: stop new writers first, then drop the index, constraint, and six nullable
-- columns in a separately approved migration after consumers no longer read them.

ALTER TABLE events_core
  ADD COLUMN IF NOT EXISTS series_key text,
  ADD COLUMN IF NOT EXISTS series_year integer,
  ADD COLUMN IF NOT EXISTS series_month integer,
  ADD COLUMN IF NOT EXISTS series_template_version_id text,
  ADD COLUMN IF NOT EXISTS generated_from_key text,
  ADD COLUMN IF NOT EXISTS series_snapshot_checksum text;

ALTER TABLE events_core
  DROP CONSTRAINT IF EXISTS events_core_series_identity_check;

ALTER TABLE events_core
  ADD CONSTRAINT events_core_series_identity_check
  CHECK (
    (
      series_key IS NULL
      AND series_year IS NULL
      AND series_month IS NULL
      AND series_template_version_id IS NULL
      AND generated_from_key IS NULL
      AND series_snapshot_checksum IS NULL
    )
    OR
    (
      length(trim(series_key)) > 0
      AND series_year BETWEEN 2000 AND 3000
      AND series_month BETWEEN 1 AND 12
      AND length(trim(series_template_version_id)) > 0
      AND length(trim(generated_from_key)) > 0
      AND series_snapshot_checksum ~ '^[a-f0-9]{64}$'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS events_core_unique_series_month
  ON events_core(series_key, series_year, series_month)
  WHERE series_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_core_series_template_idx
  ON events_core(series_key, series_template_version_id)
  WHERE series_key IS NOT NULL;
