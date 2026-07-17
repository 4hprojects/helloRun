-- Persist immutable accumulated-challenge certificate totals after final review.
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS goal_distance_km numeric,
  ADD COLUMN IF NOT EXISTS verified_distance_km numeric,
  ADD COLUMN IF NOT EXISTS approved_activity_count integer,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

CREATE INDEX IF NOT EXISTS certificates_finalized_at_idx
  ON certificates(finalized_at)
  WHERE finalized_at IS NOT NULL;
