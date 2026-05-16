-- Phase 6 SQL Migration: Rankings and Reporting Module
-- Purpose: Create rankings table and report views for leaderboards, certifications, and analytics

-- Create rankings table for leaderboard snapshots
CREATE TABLE IF NOT EXISTS rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_submission_id text UNIQUE NOT NULL,
  event_core_id uuid REFERENCES events_core(id),
  runner_user_id uuid REFERENCES app_users(id),
  leaderboard_type text NOT NULL,  -- 'single_activity', 'accumulated'
  rank_position integer NOT NULL,
  race_distance text,
  participation_mode text,
  elapsed_ms bigint,
  approved_distance_km numeric,
  approved_activity_count integer,
  submitted_at timestamptz,
  calculated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_rankings_event_type_rank ON rankings(event_core_id, leaderboard_type, rank_position);
CREATE INDEX IF NOT EXISTS idx_rankings_event_distance_mode ON rankings(event_core_id, race_distance, participation_mode);
CREATE INDEX IF NOT EXISTS idx_rankings_published_at ON rankings(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_rankings_runner_id ON rankings(runner_user_id);

-- Create certification count view for runner dashboard
CREATE OR REPLACE VIEW v_runner_certifications AS
SELECT
  a.id as runner_user_id,
  COUNT(c.id) FILTER (WHERE c.certificate_type = 'finisher') as finisher_count,
  COUNT(c.id) FILTER (WHERE c.certificate_type = 'personal_record') as personal_record_count,
  COUNT(c.id) as total_certificates,
  MAX(c.issued_at) as most_recent_certificate_at
FROM app_users a
LEFT JOIN certificates c ON a.id = c.runner_user_id
GROUP BY a.id;

-- Create event leaderboard materialized view (single activity)
CREATE OR REPLACE VIEW v_event_leaderboards_single AS
SELECT
  r.event_core_id,
  r.race_distance,
  r.participation_mode,
  r.rank_position,
  r.runner_user_id,
  r.elapsed_ms,
  r.submitted_at,
  r.calculated_at
FROM rankings r
WHERE r.leaderboard_type = 'single_activity'
  AND r.published_at IS NOT NULL
ORDER BY r.event_core_id, r.race_distance, r.participation_mode, r.rank_position;

-- Create event leaderboard materialized view (accumulated)
CREATE OR REPLACE VIEW v_event_leaderboards_accumulated AS
SELECT
  r.event_core_id,
  r.participation_mode,
  r.rank_position,
  r.runner_user_id,
  r.approved_distance_km,
  r.approved_activity_count,
  r.submitted_at,
  r.calculated_at
FROM rankings r
WHERE r.leaderboard_type = 'accumulated'
  AND r.published_at IS NOT NULL
ORDER BY r.event_core_id, r.participation_mode, r.rank_position;

-- Create event submission statistics view for organiser dashboard
CREATE OR REPLACE VIEW v_event_submission_stats AS
SELECT
  s.event_id,
  COUNT(s.id) as total_submissions,
  COUNT(s.id) FILTER (WHERE s.submission_status = 'submitted') as pending_submissions,
  COUNT(s.id) FILTER (WHERE s.submission_status = 'approved') as approved_submissions,
  COUNT(s.id) FILTER (WHERE s.submission_status = 'rejected') as rejected_submissions,
  COUNT(c.id) as issued_certificates
FROM submissions_core s
LEFT JOIN certificates c ON s.id = c.submission_id
GROUP BY s.event_id;

-- Create runner performance view for runner dashboard
CREATE OR REPLACE VIEW v_runner_performance AS
SELECT
  r.id as runner_user_id,
  COUNT(s.id) as total_submissions,
  COUNT(s.id) FILTER (WHERE s.submission_status = 'approved') as approved_submissions,
  COUNT(s.id) FILTER (WHERE s.submission_status = 'rejected') as rejected_submissions,
  COUNT(DISTINCT s.event_id) as events_participated,
  COUNT(DISTINCT c.id) as certificates_earned,
  MIN(s.submitted_at) as first_submission_at,
  MAX(s.submitted_at) as most_recent_submission_at
FROM app_users r
LEFT JOIN submissions_core s ON r.id = s.runner_user_id
LEFT JOIN certificates c ON s.id = c.submission_id
GROUP BY r.id;

-- Create top events by submission volume view
CREATE OR REPLACE VIEW v_top_events_by_activity AS
SELECT
  e.id as event_core_id,
  COUNT(s.id) as submission_count,
  COUNT(s.id) FILTER (WHERE s.submission_status = 'approved') as approved_count,
  COUNT(DISTINCT s.runner_user_id) as unique_runners
FROM events_core e
LEFT JOIN submissions_core s ON e.id = s.event_id
GROUP BY e.id
ORDER BY submission_count DESC;
