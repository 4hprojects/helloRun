-- Additive support for metric-neutral accumulated challenges and step rankings.

ALTER TABLE events_core
  DROP CONSTRAINT IF EXISTS events_core_virtual_completion_mode_check;

ALTER TABLE events_core
  ADD CONSTRAINT events_core_virtual_completion_mode_check
  CHECK (virtual_completion_mode IN ('single_activity', 'accumulated_activity', 'accumulated_distance'));

ALTER TABLE events_core
  ADD COLUMN IF NOT EXISTS challenge_metrics text[] NOT NULL DEFAULT ARRAY['distance']::text[],
  ADD COLUMN IF NOT EXISTS primary_challenge_metric text NOT NULL DEFAULT 'distance',
  ADD COLUMN IF NOT EXISTS target_steps bigint;

ALTER TABLE events_core
  DROP CONSTRAINT IF EXISTS events_core_challenge_metrics_check,
  DROP CONSTRAINT IF EXISTS events_core_primary_challenge_metric_check,
  DROP CONSTRAINT IF EXISTS events_core_target_steps_check;

ALTER TABLE events_core
  ADD CONSTRAINT events_core_challenge_metrics_check
    CHECK (
      cardinality(challenge_metrics) BETWEEN 1 AND 2
      AND challenge_metrics <@ ARRAY['distance', 'steps']::text[]
    ),
  ADD CONSTRAINT events_core_primary_challenge_metric_check
    CHECK (
      primary_challenge_metric IN ('distance', 'steps')
      AND primary_challenge_metric = ANY(challenge_metrics)
    ),
  ADD CONSTRAINT events_core_target_steps_check
    CHECK (target_steps IS NULL OR target_steps BETWEEN 1 AND 1000000000);

ALTER TABLE submissions_core
  ALTER COLUMN distance_km DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS steps bigint;

ALTER TABLE submissions_core
  DROP CONSTRAINT IF EXISTS submissions_core_steps_check;

ALTER TABLE submissions_core
  ADD CONSTRAINT submissions_core_steps_check
    CHECK (steps IS NULL OR steps BETWEEN 1 AND 200000);

ALTER TABLE rankings
  ADD COLUMN IF NOT EXISTS approved_steps bigint,
  ADD COLUMN IF NOT EXISTS primary_metric text NOT NULL DEFAULT 'distance';

ALTER TABLE rankings
  DROP CONSTRAINT IF EXISTS rankings_primary_metric_check;

ALTER TABLE rankings
  ADD CONSTRAINT rankings_primary_metric_check
    CHECK (primary_metric IN ('distance', 'steps'));

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS completion_metric text,
  ADD COLUMN IF NOT EXISTS goal_steps bigint,
  ADD COLUMN IF NOT EXISTS verified_steps bigint;

ALTER TABLE certificates
  DROP CONSTRAINT IF EXISTS certificates_completion_metric_check;

ALTER TABLE certificates
  ADD CONSTRAINT certificates_completion_metric_check
    CHECK (completion_metric IS NULL OR completion_metric IN ('distance', 'steps'));

-- CREATE OR REPLACE VIEW can only append columns; it cannot rename or reorder existing
-- ones. This revision inserts primary_metric ahead of approved_distance_km, so replacing
-- in place fails with "cannot change name of view column approved_distance_km to
-- primary_metric" and takes the whole migration — and every migration queued behind it —
-- down with it. Dropping first is safe: a view holds no data, and this one has no
-- dependent objects.
DROP VIEW IF EXISTS v_event_leaderboards_accumulated;

CREATE OR REPLACE VIEW v_event_leaderboards_accumulated AS
SELECT
  r.event_core_id,
  r.participation_mode,
  r.rank_position,
  r.runner_user_id,
  r.primary_metric,
  r.approved_distance_km,
  r.approved_steps,
  r.approved_activity_count,
  r.submitted_at,
  r.calculated_at
FROM rankings r
WHERE r.leaderboard_type = 'accumulated'
  AND r.published_at IS NOT NULL
ORDER BY r.event_core_id, r.participation_mode, r.rank_position;
