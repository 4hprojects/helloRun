-- Phase 12: Global Distance Badges
-- Purpose: Keep global badge progress and earned badge rows idempotent when event_core_id is null.

CREATE UNIQUE INDEX IF NOT EXISTS unique_runner_global_badge_non_repeatable
  ON user_badges(runner_user_id, badge_definition_id)
  WHERE event_core_id IS NULL AND verification_status != 'revoked';

CREATE UNIQUE INDEX IF NOT EXISTS unique_runner_global_badge_progress
  ON badge_progress(runner_user_id, badge_definition_id)
  WHERE event_core_id IS NULL;
