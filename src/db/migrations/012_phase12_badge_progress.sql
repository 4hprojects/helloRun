-- Phase 12: Badge Progress
-- Purpose: Track runner progress toward accumulated-distance challenge badges.

CREATE TABLE IF NOT EXISTS badge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  badge_definition_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  event_core_id UUID REFERENCES events_core(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  mongo_user_id TEXT,
  mongo_event_id TEXT,
  mongo_registration_id TEXT,
  current_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  target_value NUMERIC(12, 2) NOT NULL,
  progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(runner_user_id, badge_definition_id, event_core_id)
);

CREATE INDEX IF NOT EXISTS badge_progress_runner_idx
  ON badge_progress(runner_user_id, last_calculated_at DESC);
CREATE INDEX IF NOT EXISTS badge_progress_event_idx
  ON badge_progress(event_core_id);
CREATE INDEX IF NOT EXISTS badge_progress_registration_idx
  ON badge_progress(registration_id);
CREATE INDEX IF NOT EXISTS badge_progress_mongo_user_idx
  ON badge_progress(mongo_user_id, last_calculated_at DESC);

DROP TRIGGER IF EXISTS badge_progress_set_updated_at ON badge_progress;
CREATE TRIGGER badge_progress_set_updated_at
BEFORE UPDATE ON badge_progress
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
