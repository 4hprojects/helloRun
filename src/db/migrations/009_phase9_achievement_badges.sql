-- Phase 9: Achievement Badges
-- Purpose: Core verified event badge definitions, event badge links, earned badges, and badge audit logs.

CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  badge_scope TEXT NOT NULL CHECK (badge_scope IN ('global', 'event', 'challenge', 'organiser')),
  badge_type TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value JSONB,
  points INTEGER NOT NULL DEFAULT 0,
  visibility_state TEXT NOT NULL DEFAULT 'revealed' CHECK (visibility_state IN ('hidden', 'revealed')),
  email_notification_level TEXT NOT NULL DEFAULT 'none' CHECK (email_notification_level = 'none'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_auto_created BOOLEAN NOT NULL DEFAULT FALSE,
  is_repeatable BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS badge_definitions_scope_type_idx
  ON badge_definitions(badge_scope, badge_type);
CREATE INDEX IF NOT EXISTS badge_definitions_requirement_idx
  ON badge_definitions(requirement_type);
CREATE INDEX IF NOT EXISTS badge_definitions_active_idx
  ON badge_definitions(is_active);

DROP TRIGGER IF EXISTS badge_definitions_set_updated_at ON badge_definitions;
CREATE TRIGGER badge_definitions_set_updated_at
BEFORE UPDATE ON badge_definitions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS event_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_core_id UUID NOT NULL REFERENCES events_core(id) ON DELETE CASCADE,
  mongo_event_id TEXT,
  badge_definition_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  badge_name_override TEXT,
  badge_description_override TEXT,
  badge_image_url TEXT,
  is_visible_on_event_page BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_badges_unique_event_definition UNIQUE(event_core_id, badge_definition_id)
);

CREATE INDEX IF NOT EXISTS event_badges_event_core_idx ON event_badges(event_core_id);
CREATE INDEX IF NOT EXISTS event_badges_mongo_event_idx ON event_badges(mongo_event_id);
CREATE INDEX IF NOT EXISTS event_badges_definition_idx ON event_badges(badge_definition_id);
CREATE INDEX IF NOT EXISTS event_badges_visible_idx ON event_badges(is_visible_on_event_page, is_active);

DROP TRIGGER IF EXISTS event_badges_set_updated_at ON event_badges;
CREATE TRIGGER event_badges_set_updated_at
BEFORE UPDATE ON event_badges
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  badge_definition_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  event_core_id UUID REFERENCES events_core(id) ON DELETE SET NULL,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES submissions_core(id) ON DELETE SET NULL,
  mongo_user_id TEXT,
  mongo_event_id TEXT,
  mongo_registration_id TEXT,
  mongo_submission_id TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'pending_review', 'revoked')),
  source TEXT NOT NULL CHECK (source IN ('system_auto_award', 'admin_manual_award')),
  awarded_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  revoke_reason TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_badges_runner_idx ON user_badges(runner_user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS user_badges_mongo_user_idx ON user_badges(mongo_user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS user_badges_event_core_idx ON user_badges(event_core_id);
CREATE INDEX IF NOT EXISTS user_badges_registration_idx ON user_badges(registration_id);
CREATE INDEX IF NOT EXISTS user_badges_submission_idx ON user_badges(submission_id);

CREATE UNIQUE INDEX IF NOT EXISTS unique_runner_badge_non_repeatable
  ON user_badges(runner_user_id, badge_definition_id, event_core_id)
  WHERE verification_status != 'revoked';

CREATE UNIQUE INDEX IF NOT EXISTS unique_runner_featured_badge
  ON user_badges(runner_user_id)
  WHERE is_featured = TRUE AND verification_status = 'verified';

DROP TRIGGER IF EXISTS user_badges_set_updated_at ON user_badges;
CREATE TRIGGER user_badges_set_updated_at
BEFORE UPDATE ON user_badges
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS badge_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_definition_id UUID REFERENCES badge_definitions(id) ON DELETE SET NULL,
  user_badge_id UUID REFERENCES user_badges(id) ON DELETE SET NULL,
  event_core_id UUID REFERENCES events_core(id) ON DELETE SET NULL,
  runner_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS badge_audit_logs_definition_idx ON badge_audit_logs(badge_definition_id);
CREATE INDEX IF NOT EXISTS badge_audit_logs_user_badge_idx ON badge_audit_logs(user_badge_id);
CREATE INDEX IF NOT EXISTS badge_audit_logs_event_idx ON badge_audit_logs(event_core_id);
CREATE INDEX IF NOT EXISTS badge_audit_logs_runner_idx ON badge_audit_logs(runner_user_id);
CREATE INDEX IF NOT EXISTS badge_audit_logs_action_idx ON badge_audit_logs(action, created_at DESC);
